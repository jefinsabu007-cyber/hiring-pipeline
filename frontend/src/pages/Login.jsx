import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const Label = ({ children, htmlFor }) => (
  <label className="lamp-label" htmlFor={htmlFor}>{children}</label>
);

/* ---------- small inline icons (no emoji, consistent stroke) ---------- */
const Icon = ({ children }) => (
  <svg
    className="input-icon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const UserIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Icon>
);
const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
);
const LockIcon = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
const BriefcaseIcon = () => (
  <Icon>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
  </Icon>
);

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
    <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.9 14.2a6.6 6.6 0 0 1 0-4.4V7H2.3a11 11 0 0 0 0 10l3.6-2.8z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.3 7l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
  </svg>
);

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer'];

/* ---------- password policy (mirrors the server rules) ---------- */
const pwChecks = (p) => [
  { ok: p.length >= 8, label: '8+ characters' },
  { ok: /[a-z]/.test(p), label: 'lowercase' },
  { ok: /[A-Z]/.test(p), label: 'uppercase' },
  { ok: /\d/.test(p), label: 'number' },
];

/* ---------- load an external script once ---------- */
const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const found = document.querySelector(`script[src="${src}"]`);
    if (found) {
      if (found.dataset.loaded) return resolve();
      found.addEventListener('load', resolve);
      found.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => { s.dataset.loaded = '1'; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });

export default function Login() {
  const setAuth = useStore((s) => s.setAuth);

  const [mode, setMode] = useState('login');
  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
    role: 'recruiter',
  });

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [gReady, setGReady] = useState(false);
  const [hp, setHp] = useState(''); // honeypot: real people never see or fill this

  const isLogin = mode === 'login';
  const checks = pwChecks(f.password);
  const strength = checks.filter((c) => c.ok).length;

  // refs so the Google callback always sees the latest mode / role
  const modeRef = useRef(mode);
  const roleRef = useRef(f.role);
  const googleSlot = useRef(null);
  const openedAt = useRef(Date.now());
  modeRef.current = mode;
  roleRef.current = f.role;

  // Fireflies are generated once so they don't jump around on re-render
  const fireflies = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        dx: Math.round((Math.random() - 0.5) * 120),
        dy: Math.round(-30 - Math.random() * 90),
        dur: 6 + Math.random() * 7,
        delay: -Math.random() * 10,
        size: 2 + Math.random() * 2.5,
      })),
    []
  );

  const set = (key) => (e) => {
    const { value } = e.target;
    setF((current) => ({ ...current, [key]: value }));
  };

  // Pull the chain: animate it, and turn the light + login card on/off
  const pullChain = () => {
    if (pulling) return;
    setPulling(true);
    setLampOn((v) => !v);
    setTimeout(() => setPulling(false), 450);
  };

  /* ---------- Google reCAPTCHA v3 (optional, invisible) ---------- */
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    loadScript(`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`).catch(() => {});
  }, []);

  const getCaptcha = async (action) => {
    if (!RECAPTCHA_SITE_KEY) return undefined;
    try {
      await new Promise((res) => window.grecaptcha.ready(res));
      return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
    } catch {
      throw new Error('Security check could not load. Please refresh and try again.');
    }
  };

  /* ---------- Google Sign-In ---------- */
  const onGoogleCredential = async (resp) => {
    setBusy(true);
    setErr('');
    try {
      const result = await api('/auth/google', {
        method: 'POST',
        body: { credential: resp.credential, mode: modeRef.current, role: roleRef.current },
      });
      setAuth(result);
    } catch (x) {
      if (x.code === 'NO_ACCOUNT') setMode('signup');
      setErr(x.message || 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const googleCb = useRef(onGoogleCredential);
  googleCb.current = onGoogleCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => googleCb.current(r),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        setGReady(true);
      })
      .catch(() => setErr('Could not load Google sign-in. Check your connection and try again.'));
    return () => { cancelled = true; };
  }, []);

  // (re)draw Google's official button inside our styled slot whenever the mode changes
  useEffect(() => {
    if (!gReady || !googleSlot.current) return;
    const slot = googleSlot.current;
    const width = Math.max(200, Math.min(400, Math.round(slot.parentElement.clientWidth || 340)));
    slot.innerHTML = '';
    window.google.accounts.id.renderButton(slot, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'rectangular',
      text: isLogin ? 'signin_with' : 'signup_with',
      logo_alignment: 'left',
      width,
    });
  }, [gReady, isLogin]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!isLogin && strength < 4) {
      setErr('Choose a stronger password: 8+ characters with upper & lowercase letters and a number.');
      return;
    }

    setBusy(true);
    try {
      const captchaToken = await getCaptcha(mode);
      // Same backend authentication flow, now with bot protection fields
      const result = await api(`/auth/${mode}`, {
        method: 'POST',
        body: isLogin
          ? { email: f.email, password: f.password, captchaToken, website: hp }
          : { ...f, captchaToken, website: hp, ft: Date.now() - openedAt.current },
      });
      setAuth(result);
    } catch (x) {
      setErr(x.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggleMode = () => {
    setMode(isLogin ? 'signup' : 'login');
    setErr('');
    openedAt.current = Date.now();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        .lamp-page *, .lamp-page *::before, .lamp-page *::after { box-sizing: border-box; }

        .lamp-page {
          --amber: #ffc83d;
          --amber-deep: #f5a800;
          --ink: #14130f;
          --line: rgba(255, 255, 255, 0.09);

          position: relative;
          min-height: 100vh;
          width: 100%;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(280px, 1fr) minmax(320px, 1fr);
          align-items: center;
          gap: 24px;
          padding: 32px clamp(16px, 6vw, 110px);
          color: #fff;
          font-family: "Outfit", system-ui, sans-serif;
          background:
            radial-gradient(ellipse at 22% 55%, rgba(255, 190, 70, 0.10), transparent 55%),
            linear-gradient(135deg, #0c0c08 0%, #14130d 50%, #090906 100%);
        }

        /* soft fade on the far left and right edges of the page */
        .lamp-page::before,
        .lamp-page::after {
          content: "";
          position: absolute;
          top: 0; bottom: 0;
          width: clamp(40px, 12vw, 200px);
          z-index: 1;
          pointer-events: none;
        }
        .lamp-page::before {
          left: 0;
          background: linear-gradient(90deg, #050504 0%, rgba(5, 5, 4, .7) 35%, transparent 100%);
        }
        .lamp-page::after {
          right: 0;
          background: linear-gradient(270deg, #050504 0%, rgba(5, 5, 4, .7) 35%, transparent 100%);
        }

        /* ---------- fireflies ---------- */
        .fireflies { position: absolute; inset: 0; pointer-events: none; transition: opacity .8s ease; }
        .firefly {
          position: absolute;
          border-radius: 50%;
          background: #ffd76a;
          box-shadow: 0 0 8px 2px rgba(255, 207, 90, 0.7);
          animation: drift var(--dur) ease-in-out infinite, blink 3s ease-in-out infinite;
          animation-delay: var(--delay), var(--delay);
        }
        .lamp-page.off .fireflies { opacity: 0; }

        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(var(--dx), var(--dy)); }
        }
        @keyframes blink {
          0%, 100% { opacity: .15; }
          50% { opacity: 1; }
        }

        /* ---------- lamp ---------- */
        .lamp-side {
          transition: transform .8s ease;
          position: relative;
          z-index: 2;
          height: min(86vh, 640px);
          display: flex;
          justify-content: center;
        }
        .lamp-page.off .lamp-side { transform: translateX(25vw); }
        .lamp-page.on .lamp-side { transform: none; }

        /* small light shown while the lamp is off */
        .lamp-spark {
          position: absolute;
          top: 64px; left: 50%;
          width: 10px; height: 10px;
          margin-left: -5px;
          border-radius: 50%;
          background: #ffd76a;
          box-shadow: 0 0 12px 4px rgba(255, 200, 80, .55), 0 0 30px 10px rgba(255, 180, 60, .2);
          animation: pulse 2.4s ease-in-out infinite;
          transition: opacity .4s ease;
          z-index: 3;
        }
        .lamp.on .lamp-spark { opacity: 0; animation: none; }
        @keyframes pulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }

        .lamp-hint {
          position: absolute;
          top: 118px; left: calc(50% + 82px);
          font-size: 12px;
          color: rgba(255, 220, 140, .6);
          white-space: nowrap;
          transition: opacity .4s ease;
          pointer-events: none;
        }
        .lamp.on .lamp-hint { opacity: 0; }

        .lamp {
          position: relative;
          width: 340px;
          height: 100%;
        }
        .lamp-shade {
          position: absolute;
          top: 0; left: 50%;
          width: 150px; height: 64px;
          transform: translateX(-50%);
          border-radius: 75px 75px 4px 4px / 64px 64px 4px 4px;
          background: linear-gradient(180deg, #262520, #0f0f0c);
          box-shadow: inset 0 2px 0 rgba(255,255,255,.08), 0 8px 24px rgba(0,0,0,.6);
          z-index: 3;
        }
        .lamp-shade::after {
          content: "";
          position: absolute;
          left: 6px; right: 6px; bottom: -3px; height: 6px;
          border-radius: 50%;
          background: #ffe9a8;
          opacity: 0;
          filter: blur(1px);
          transition: opacity .5s ease;
        }
        .lamp.on .lamp-shade::after { opacity: 1; }

        /* light beam: blurred + masked so the left and right edges fade out softly */
        .lamp-beam {
          position: absolute;
          top: 60px; left: 0;
          width: 100%; height: calc(100% - 100px);
          filter: blur(12px);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
          opacity: 0;
          transition: opacity .6s ease;
          z-index: 1;
          pointer-events: none;
        }
        .lamp-beam::before {
          content: "";
          position: absolute;
          inset: 0;
          clip-path: polygon(22% 0, 78% 0, 100% 100%, 0 100%);
          background: linear-gradient(
            180deg,
            rgba(255, 213, 110, 0.65) 0%,
            rgba(255, 190, 70, 0.28) 45%,
            rgba(255, 180, 60, 0.04) 100%
          );
        }
        .lamp.on .lamp-beam { opacity: 1; }

        .lamp-floor-glow {
          position: absolute;
          bottom: 14px; left: 50%;
          width: 300px; height: 60px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255, 200, 90, .45), transparent 70%);
          opacity: 0;
          transition: opacity .6s ease;
        }
        .lamp.on .lamp-floor-glow { opacity: 1; }

        .lamp-pole {
          position: absolute;
          top: 62px; bottom: 22px; left: 50%;
          width: 5px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, #0c0c0a, #2a2923, #0c0c0a);
          z-index: 2;
        }
        .lamp-base {
          position: absolute;
          bottom: 14px; left: 50%;
          width: 96px; height: 14px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #0b0b09;
          box-shadow: 0 2px 0 rgba(255,255,255,.05);
          z-index: 2;
        }

        /* pull chain (the clickable switch) - wider hit area, same visual position */
        .lamp-chain {
          position: absolute;
          top: 58px;
          left: calc(50% + 36px);
          width: 44px; height: 112px;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          z-index: 4;
          -webkit-tap-highlight-color: transparent;
        }
        .lamp-chain::before {
          content: "";
          position: absolute;
          top: 0; left: 50%;
          width: 2px; height: 76px;
          transform: translateX(-50%);
          background: repeating-linear-gradient(180deg, #9b9684 0 3px, #55524a 3px 5px);
        }
        .lamp-chain::after {
          content: "";
          position: absolute;
          top: 74px; left: 50%;
          width: 10px; height: 16px;
          transform: translateX(-50%);
          border-radius: 5px;
          background: linear-gradient(180deg, #ffd76a, #d99a00);
          box-shadow: 0 0 10px rgba(255, 200, 80, .4);
        }
        .lamp-chain.pulled { animation: chainPull .45s cubic-bezier(.3, 1.6, .5, 1); }
        .lamp-chain:focus-visible { outline: 2px solid var(--amber); outline-offset: 4px; border-radius: 6px; }

        @keyframes chainPull {
          0%   { transform: translateY(0); }
          35%  { transform: translateY(16px); }
          100% { transform: translateY(0); }
        }

        /* hiring pipeline strip, lives in the beam */
        .pipeline {
          position: absolute;
          left: 50%; bottom: 70px;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 3;
          opacity: .0;
          transition: opacity .6s ease .1s;
        }
        .lamp.on .pipeline { opacity: 1; }
        .stage {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px;
          color: rgba(255, 236, 190, .85);
          white-space: nowrap;
        }
        .stage i {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--amber);
          box-shadow: 0 0 8px rgba(255, 200, 70, .8);
        }
        .stage + .stage::before {
          content: "";
          width: 14px; height: 1px;
          background: rgba(255, 220, 140, .45);
          margin-right: 2px;
        }

        /* ---------- card ---------- */
        .login-card {
          position: relative;
          z-index: 5;
          width: 100%;
          max-width: 430px;
          justify-self: start;
          padding: 40px 36px 34px;
          border-radius: 26px;
          border: 1px solid var(--line);
          background: rgba(34, 33, 27, 0.62);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          box-shadow: 0 30px 80px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255,255,255,.05);
          opacity: 0;
          visibility: hidden;
          transform: translateY(24px) scale(.97);
          pointer-events: none;
          transition: opacity .7s ease .25s, transform .7s ease .25s, visibility 0s linear .95s;
        }
        .lamp-page.on .login-card {
          opacity: 1;
          visibility: visible;
          transform: none;
          pointer-events: auto;
          transition: opacity .7s ease .3s, transform .7s ease .3s, visibility 0s;
        }
        .login-header { text-align: center; margin-bottom: 28px; }
        .login-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 600;
          letter-spacing: -.5px;
        }
        .login-header p {
          margin: 8px 0 0;
          font-size: 13.5px;
          color: #a8a595;
        }

        .input-group { margin-bottom: 16px; }
        .lamp-label {
          display: block;
          margin-bottom: 7px;
          font-size: 12.5px;
          color: #a8a595;
        }
        .input-wrapper { position: relative; }
        .input-icon {
          position: absolute;
          left: 15px; top: 50%;
          transform: translateY(-50%);
          color: #8a8778;
          pointer-events: none;
        }
        .lamp-input, .lamp-select {
          width: 100%;
          height: 50px;
          padding: 0 46px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.06);
          background: #0a0a08;
          color: #fff;
          font: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color .25s, box-shadow .25s;
        }
        .lamp-select { padding: 0 14px 0 46px; cursor: pointer; }
        .lamp-select option { background: #14130f; }
        .lamp-input::placeholder { color: #6d6a5d; }
        .lamp-input:focus, .lamp-select:focus {
          border-color: var(--amber);
          box-shadow: 0 0 0 3px rgba(255, 200, 61, .12);
        }

        .password-toggle {
          position: absolute;
          right: 8px; top: 50%;
          transform: translateY(-50%);
          width: 34px; height: 34px;
          display: grid; place-items: center;
          border: none; border-radius: 8px;
          background: none;
          color: #8a8778;
          cursor: pointer;
          transition: color .2s;
        }
        .password-toggle:hover { color: var(--amber); }
        .password-toggle:focus-visible { outline: 2px solid var(--amber); }

        .lamp-error {
          margin: 4px 0 16px;
          padding: 11px 12px;
          border-radius: 10px;
          font-size: 13px;
          text-align: center;
          color: #ff9b9b;
          background: rgba(255, 80, 80, .09);
          border: 1px solid rgba(255, 80, 80, .22);
        }

        .login-button {
          position: relative;
          width: 100%;
          height: 50px;
          margin-top: 6px;
          border: none;
          border-radius: 13px;
          overflow: hidden;
          background: linear-gradient(180deg, #ffd23f, #fbb914);
          color: #1a1608;
          font: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform .2s, box-shadow .3s;
        }
        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(251, 185, 20, .28);
        }
        .login-button:active:not(:disabled) { transform: scale(.985); }
        .login-button:disabled { opacity: .65; cursor: not-allowed; }
        .login-button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 24px 0 18px;
          font-size: 11.5px;
          letter-spacing: .06em;
          color: #77746a;
        }
        .divider::before, .divider::after {
          content: ""; flex: 1; height: 1px; background: var(--line);
        }

        .social-login { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .social-button {
          height: 46px;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: rgba(255,255,255,.04);
          color: #e8e5d8;
          font: inherit;
          font-size: 13.5px;
          cursor: pointer;
          transition: background .25s, border-color .25s, transform .2s;
        }
        .social-button:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.18); transform: translateY(-2px); }
        .social-button:focus-visible { outline: 2px solid var(--amber); }
        .social-button:disabled { opacity: .55; cursor: not-allowed; transform: none; }

        /* official Google button, framed to match the card */
        .google-slot {
          display: flex; justify-content: center; align-items: center;
          min-height: 46px;
          border-radius: 12px;
          overflow: hidden;
          transition: opacity .25s, transform .2s;
        }
        .google-slot:hover { transform: translateY(-2px); }
        .social-login.busy .google-slot { opacity: .5; pointer-events: none; }

        .signup {
          margin-top: 22px;
          text-align: center;
          font-size: 13px;
          color: #86836f;
        }
        .signup-button {
          border: none; background: none; padding: 0;
          color: var(--amber);
          font: inherit; font-weight: 500;
          cursor: pointer;
        }
        .signup-button:hover { text-decoration: underline; }

        /* ---------- security extras ---------- */
        .hp-field {
          position: absolute !important;
          left: -9999px; top: auto;
          width: 1px; height: 1px;
          overflow: hidden;
          opacity: 0;
        }
        .pw-meter { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 9px; }
        .pw-meter i { height: 3px; border-radius: 999px; background: rgba(255,255,255,.1); transition: background .3s, box-shadow .3s; }
        .pw-meter i.on { background: var(--seg); box-shadow: 0 0 8px var(--seg); }
        .pw-rules { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; font-size: 11.5px; color: #77746a; }
        .pw-rules span { transition: color .25s; }
        .pw-rules span.ok { color: #7ee8c3; }
        .pw-rules span::before { content: "○ "; }
        .pw-rules span.ok::before { content: "● "; }
        .secure-note {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          margin-top: 18px;
          font-size: 11.5px;
          color: #77746a;
          text-align: center;
        }
        .secure-note svg { flex-shrink: 0; color: #7ee8c3; }
        .role-hint { margin: 10px 0 0; text-align: center; font-size: 11.5px; color: #77746a; }

        /* ---------- responsive ---------- */
        @media (max-width: 860px) {
          .lamp-page {
            grid-template-columns: 1fr;
            justify-items: center;
            gap: 0;
            padding-top: 8px;
          }
          .lamp-side { height: 250px; }
          .lamp-page.off .lamp-side { transform: none; }
          .lamp-page.off { align-content: center; }
          .lamp-page.off .lamp-side { height: 70vh; }
          .lamp-page.off .lamp { transform: scale(.8); transform-origin: top center; }
          .lamp-hint { display: none; }
          .lamp { transform: scale(.55); transform-origin: top center; }
          .pipeline { display: none; }
          .login-card { justify-self: center; margin-top: -10px; }
          .lamp-page.off .login-card { position: absolute; }
        }
        @media (max-width: 480px) {
          .login-card { padding: 30px 22px 26px; border-radius: 22px; }
          .login-header h1 { font-size: 27px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .firefly, .login-card, .lamp-chain.pulled { animation: none; }
        }
      `}</style>

      <main className={`lamp-page ${lampOn ? 'on' : 'off'}`}>
        {/* FIREFLIES */}
        <div className="fireflies" aria-hidden="true">
          {fireflies.map((p) => (
            <span
              key={p.id}
              className="firefly"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--dur': `${p.dur}s`,
                '--delay': `${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* LAMP */}
        <div className="lamp-side">
          <div className={`lamp ${lampOn ? 'on' : ''}`}>
            <div className="lamp-beam" />
            <div className="lamp-shade" />
            <div className="lamp-pole" />
            <div className="lamp-base" />
            <div className="lamp-floor-glow" />
            <div className="lamp-spark" />
            <span className="lamp-hint" aria-hidden="true">Pull the chain</span>

            <button
              type="button"
              className={`lamp-chain ${pulling ? 'pulled' : ''}`}
              onClick={pullChain}
              aria-label={lampOn ? 'Turn the lamp off' : 'Turn the lamp on'}
              aria-pressed={lampOn}
              title="Pull the chain"
            />

            <div className="pipeline" aria-hidden="true">
              {STAGES.map((s) => (
                <span className="stage" key={s}>
                  <i />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* LOGIN CARD */}
        <section className="login-card" aria-hidden={!lampOn}>
          <div className="login-header">
            <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p>
              {isLogin
                ? 'Sign in to manage your hiring pipeline'
                : 'Set up your account to start hiring'}
            </p>
          </div>

          <form onSubmit={submit}>
            {/* honeypot: hidden from people, irresistible to bots */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div className="input-group">
                <Label htmlFor="name">Full name</Label>
                <div className="input-wrapper">
                  <UserIcon />
                  <input
                    id="name"
                    className="lamp-input"
                    type="text"
                    placeholder="Your full name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                    value={f.name}
                    onChange={set('name')}
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <Label htmlFor="email">Email address</Label>
              <div className="input-wrapper">
                <MailIcon />
                <input
                  id="email"
                  className="lamp-input"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={f.email}
                  onChange={set('email')}
                />
              </div>
            </div>

            <div className="input-group">
              <Label htmlFor="password">Password</Label>
              <div className="input-wrapper">
                <LockIcon />
                <input
                  id="password"
                  className="lamp-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={isLogin ? undefined : 8}
                  maxLength={72}
                  required
                  value={f.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {showPw ? (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.2 3.8M6.5 7.6A16 16 0 0 0 2.5 12S6 18 12 18c1.4 0 2.700-.3 3.800-.8" />
                        <path d="M9.900 9.900a3 3 0 0 0 4.200 4.200" />
                      </>
                    ) : (
                      <>
                        <path d="M2.500 12S6 6 12 6s9.500 6 9.500 6-3.500 6-9.500 6S2.500 12 2.500 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>

              {!isLogin && (
                <>
                  <div
                    className="pw-meter"
                    aria-hidden="true"
                    style={{ '--seg': ['#ff8a9a', '#ffb74d', '#ffd76a', '#7ee8c3'][Math.max(strength - 1, 0)] }}
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <i key={n} className={n < strength ? 'on' : ''} />
                    ))}
                  </div>
                  <div className="pw-rules">
                    {checks.map((c) => (
                      <span key={c.label} className={c.ok ? 'ok' : ''}>{c.label}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!isLogin && (
              <div className="input-group">
                <Label htmlFor="role">I am a</Label>
                <div className="input-wrapper">
                  <BriefcaseIcon />
                  <select
                    id="role"
                    className="lamp-select"
                    value={f.role}
                    onChange={set('role')}
                  >
                    <option value="recruiter">Recruiter</option>
                    <option value="interviewer">Interviewer</option>
                  </select>
                </div>
              </div>
            )}

            {err && (
              <div className="lamp-error" role="alert">
                {err}
              </div>
            )}

            <button type="submit" className="login-button" disabled={busy}>
              {busy ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="divider">OR CONTINUE WITH</div>

          <div className={`social-login ${busy ? 'busy' : ''}`}>
            {GOOGLE_CLIENT_ID ? (
              <div className="google-slot" ref={googleSlot} />
            ) : (
              <button
                type="button"
                className="social-button"
                onClick={() => setErr('Google sign-in is not set up yet. Add VITE_GOOGLE_CLIENT_ID to enable it.')}
              >
                <GoogleG /> Google
              </button>
            )}
          </div>
          {!isLogin && (
            <p className="role-hint">Google sign-up uses the role selected above.</p>
          )}

          <div className="signup">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="signup-button" onClick={toggleMode}>
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </div>

          <div className="secure-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 4 6v6c0 4.500 3.400 8 8 9 4.600-1 8-4.500 8-9V6l-8-3z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Encrypted passwords · Google sign-in · bot &amp; brute-force protection
          </div>
        </section>
      </main>
    </>
  );
}
