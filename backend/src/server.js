require('dotenv').config();
const express = require('express'), cors = require('cors'), helmet = require('helmet'), rate = require('express-rate-limit'), mongoose = require('mongoose');

// Refuse to start with a weak/default JWT secret in production
const secret = process.env.JWT_SECRET || '';
if (!secret || (process.env.NODE_ENV === 'production' && (secret.length < 32 || secret.startsWith('change_me')))) {
  console.error('JWT_SECRET is missing or too weak. Use a random string of 32+ characters (node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))").');
  process.exit(1);
}

const app = express();
const limiter = (opts) => rate({ standardHeaders: true, legacyHeaders: false, ...opts });
app.set('trust proxy', 2);
// same-origin-allow-popups lets the Google sign-in popup talk back to the page
app.use(helmet({ crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' } }), cors({ origin: process.env.CLIENT_URL || true }), express.json({ limit: '20kb' }));
app.use('/api', limiter({ windowMs: 15 * 60 * 1000, max: 500 }));
// Auth endpoints: tight per-IP limits. Login only counts failed attempts.
app.use('/api/auth/login', limiter({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, message: { message: 'Too many sign-in attempts. Please wait 15 minutes.' } }));
app.use('/api/auth/signup', limiter({ windowMs: 60 * 60 * 1000, max: 8, message: { message: 'Too many sign-up attempts. Please try again later.' } }));
app.use('/api/auth/google', limiter({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Too many sign-in attempts. Please wait a few minutes.' } }));
app.use('/api/auth', limiter({ windowMs: 15 * 60 * 1000, max: 60 }), require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/feedback', require('./routes/feedback'));
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use((err, req, res, next) => {
  if (err.name === 'ZodError') return res.status(400).json({ message: err.issues.map((i) => i.message).join('; ') });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid request' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error' : err.message || 'Server error', ...(err.code && { code: err.code }) });
});
mongoose.connect(process.env.MONGO_URI).then(() => app.listen(process.env.PORT || 5000, () => console.log('API up'))).catch((e) => { console.error(e); process.exit(1); });
