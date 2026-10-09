const r = require('express').Router();
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models'); const { auth } = require('../middleware/auth');

const MAX_FAILS = 5;                    // wrong passwords before the account is locked
const LOCK_MS = 15 * 60 * 1000;         // lock duration
const MIN_FILL_MS = 2500;               // humans need more than ~2.5s to fill the sign-up form
const DISPOSABLE = new Set(['mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','temp-mail.org','yopmail.com','trashmail.com','sharklasers.com','getnada.com','dispostable.com','maildrop.cc','throwawaymail.com','fakeinbox.com','mintemail.com','tempr.email','emailondeck.com']);

const err = (status, message, code) => Object.assign(new Error(message), { status, code });
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1d', algorithm: 'HS256' });
const out = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, avatar: u.avatar });
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12);

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long')
  .regex(/[a-z]/, 'Password needs a lowercase letter').regex(/[A-Z]/, 'Password needs an uppercase letter').regex(/\d/, 'Password needs a number');
const role = z.enum(['recruiter', 'interviewer']);

// Optional: only let these email domains register as recruiters (e.g. RECRUITER_EMAIL_DOMAINS=acme.com,acme.io)
function checkRoleAllowed(userRole, mail) {
  const allowed = (process.env.RECRUITER_EMAIL_DOMAINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (userRole === 'recruiter' && allowed.length && !allowed.includes(mail.split('@')[1]))
    throw err(403, 'Recruiter accounts are limited to approved company email domains.');
}

// Optional Google reCAPTCHA v3 — only enforced when RECAPTCHA_SECRET is set
async function verifyCaptcha(token, action) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return;
  if (!token) throw err(400, 'Security check failed. Please refresh the page and try again.');
  let j;
  try {
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    j = await resp.json();
  } catch { throw err(503, 'Security check unavailable. Please try again.'); }
  if (!j.success || (j.score ?? 0) < 0.5 || (j.action && j.action !== action))
    throw err(400, 'Security check failed. Please try again.');
}

const gClient = new OAuth2Client();

r.post('/signup', async (req, res) => {
  const d = z.object({ name: z.string().trim().min(2).max(80), email, password, role,
    captchaToken: z.string().optional(), website: z.string().optional(), ft: z.number().optional() }).parse(req.body);
  // bot traps: hidden honeypot field + implausibly fast submission
  if (d.website || (typeof d.ft === 'number' && d.ft < MIN_FILL_MS)) throw err(400, 'Could not create account. Please try again.');
  await verifyCaptcha(d.captchaToken, 'signup');
  if (DISPOSABLE.has(d.email.split('@')[1])) throw err(400, 'Please use a permanent email address.');
  checkRoleAllowed(d.role, d.email);
  if (await User.findOne({ email: d.email })) throw err(409, 'Email already registered');
  const u = await User.create({ name: d.name, email: d.email, role: d.role, password: await bcrypt.hash(d.password, 12), lastLoginAt: new Date() });
  res.status(201).json({ token: sign(u), user: out(u) });
});

r.post('/login', async (req, res) => {
  const d = z.object({ email, password: z.string().min(1).max(200), captchaToken: z.string().optional(), website: z.string().optional() }).parse(req.body);
  if (d.website) throw err(400, 'Could not sign in. Please try again.');
  await verifyCaptcha(d.captchaToken, 'login');
  const u = await User.findOne({ email: d.email }).select('+password +failedLogins +lockUntil');
  if (u?.lockUntil && u.lockUntil > Date.now()) {
    const mins = Math.ceil((u.lockUntil - Date.now()) / 60000);
    throw err(429, `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`, 'LOCKED');
  }
  // always run bcrypt so response time doesn't reveal whether the account exists
  const ok = await bcrypt.compare(d.password, u?.password || DUMMY_HASH);
  if (!u || !u.password || !ok) {
    if (u) {
      const n = await User.findByIdAndUpdate(u._id, { $inc: { failedLogins: 1 } }, { new: true }).select('+failedLogins');
      if (n.failedLogins >= MAX_FAILS) await User.updateOne({ _id: u._id }, { $set: { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MS) } });
    }
    throw err(401, 'Invalid email or password. If you signed up with Google, use the Google button.');
  }
  await User.updateOne({ _id: u._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } });
  res.json({ token: sign(u), user: out(u) });
});

// Google Sign-In: the browser sends a Google ID token; we verify signature, audience, issuer and expiry here.
r.post('/google', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw err(503, 'Google sign-in is not configured on the server.');
  const d = z.object({ credential: z.string().min(20).max(4096), mode: z.enum(['login', 'signup']).default('login'), role: role.optional() }).parse(req.body);
  let p;
  try { p = (await gClient.verifyIdToken({ idToken: d.credential, audience: clientId })).getPayload(); }
  catch { throw err(401, 'Google sign-in could not be verified. Please try again.'); }
  if (!p?.sub || !p.email || p.email_verified !== true) throw err(401, 'Your Google email address is not verified.');
  const mail = p.email.toLowerCase();

  let u = await User.findOne({ $or: [{ googleId: p.sub }, { email: mail }] });
  if (u) {
    if (u.googleId && u.googleId !== p.sub) throw err(401, 'This email is linked to a different Google account.');
    const set = { lastLoginAt: new Date() };
    if (!u.googleId) set.googleId = p.sub;     // link Google to the existing (same, Google-verified) email
    if (p.picture) set.avatar = p.picture;
    u = await User.findByIdAndUpdate(u._id, { $set: set }, { new: true });
  } else {
    if (d.mode !== 'signup' || !d.role) throw err(404, 'No account found for this Google email. Choose “Create account”, pick your role, then continue with Google.', 'NO_ACCOUNT');
    checkRoleAllowed(d.role, mail);
    u = await User.create({ name: p.name || mail.split('@')[0], email: mail, role: d.role, googleId: p.sub, provider: 'google', avatar: p.picture, lastLoginAt: new Date() });
  }
  res.json({ token: sign(u), user: out(u) });
});

r.get('/me', auth, (req, res) => res.json({ user: out(req.user) }));
module.exports = r;
