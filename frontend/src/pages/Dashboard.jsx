import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStore, STAGES } from '../store';
import { Card, Btn, Input, Select, Spinner, ErrorMsg, fmt } from '../components/ui.jsx';

const stageStyle = {
  Applied: {
    icon: '📥',
    c1: '#cfcab4',
    c2: '#8a8778',
    bg: 'rgba(207, 202, 180, .12)',
    fg: '#e0dcc8',
  },
  Screening: {
    icon: '🔍',
    c1: '#6cc4ff',
    c2: '#1ea7f0',
    bg: 'rgba(56, 189, 248, .13)',
    fg: '#8fd5ff',
  },
  'Technical Interview': {
    icon: '💻',
    c1: '#b79cff',
    c2: '#8b5cf6',
    bg: 'rgba(139, 92, 246, .15)',
    fg: '#c9b6ff',
  },
  'HR Interview': {
    icon: '🤝',
    c1: '#ffd76a',
    c2: '#f5a800',
    bg: 'rgba(255, 200, 61, .14)',
    fg: '#ffd76a',
  },
  Offered: {
    icon: '🎁',
    c1: '#4be0b0',
    c2: '#10b981',
    bg: 'rgba(16, 185, 129, .14)',
    fg: '#7ee8c3',
  },
  Rejected: {
    icon: '❌',
    c1: '#ff8a9a',
    c2: '#ef4444',
    bg: 'rgba(239, 68, 68, .14)',
    fg: '#ffa3ae',
  },
  Hired: {
    icon: '🎉',
    c1: '#7be88f',
    c2: '#14b8a6',
    bg: 'rgba(34, 197, 94, .14)',
    fg: '#93efa5',
  },
};

const initials = (n = '') =>
  n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function Dashboard() {
  const user = useStore((s) => s.user);
  const isRec = user.role === 'recruiter';

  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [ivs, setIvs] = useState([]);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Fireflies are generated once so they stay in their own places on re-render
  const fireflies = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        dx: Math.round((Math.random() - 0.5) * 140),
        dy: Math.round(-30 - Math.random() * 100),
        dur: 6 + Math.random() * 8,
        blink: 2.4 + Math.random() * 3,
        delay: -Math.random() * 12,
        size: 2 + Math.random() * 2.8,
      })),
    []
  );

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ q, stage, page, limit: 8 });
      const [c, s, i] = await Promise.all([
        api(`/candidates?${p}`),
        api('/candidates/stats'),
        api('/interviews?upcoming=true'),
      ]);
      setData(c);
      setStats(s);
      setIvs(i);
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  }, [q, stage, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const move = async (id, st) => {
    try {
      setLoadingAction(true);
      await api(`/candidates/${id}/stage`, {
        method: 'PATCH',
        body: { stage: st },
      });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    try {
      setLoadingAction(true);
      await api('/candidates', { method: 'POST', body: form });
      setForm(null);
      await load();
    } catch (x) {
      setErr(x.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const count = (s) =>
    stats?.byStage.find((b) => b._id === s)?.count || 0;

  const total = stats
    ? stats.byStage.reduce((n, b) => n + b.count, 0)
    : 0;

  const hour = new Date().getHours();
  const greet =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .dx-page *, .dx-page *::before, .dx-page *::after { box-sizing: border-box; }

        .dx-page {
          --amber: #ffc83d;
          --amber-deep: #f5a800;
          --muted: #a8a595;
          --dim: #77746a;
          --line: rgba(255, 255, 255, 0.09);
          --glass: rgba(34, 33, 27, 0.62);

          position: relative;
          isolation: isolate;
          min-height: 100%;
          overflow: hidden;
          border-radius: 28px;
          padding: clamp(16px, 3vw, 34px);
          color: #fff;
          font-family: "Outfit", system-ui, sans-serif;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(255, 190, 70, 0.13), transparent 55%),
            radial-gradient(ellipse at 15% 80%, rgba(255, 190, 70, 0.05), transparent 50%),
            linear-gradient(135deg, #0c0c08 0%, #14130d 50%, #090906 100%);
        }

        /* soft fade on the far left and right edges */
        .dx-page::before, .dx-page::after {
          content: "";
          position: absolute;
          top: 0; bottom: 0;
          width: clamp(40px, 10vw, 180px);
          z-index: 1;
          pointer-events: none;
        }
        .dx-page::before { left: 0; background: linear-gradient(90deg, #050504 0%, rgba(5,5,4,.7) 35%, transparent 100%); }
        .dx-page::after { right: 0; background: linear-gradient(270deg, #050504 0%, rgba(5,5,4,.7) 35%, transparent 100%); }

        /* ---------- ambient: lamp light + fireflies ---------- */
        .dx-ambient { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }

        .dx-shade {
          position: absolute;
          top: -22px; left: 50%;
          width: 150px; height: 64px;
          transform: translateX(-50%);
          border-radius: 75px 75px 4px 4px / 64px 64px 4px 4px;
          background: linear-gradient(180deg, #262520, #0f0f0c);
          box-shadow: inset 0 2px 0 rgba(255,255,255,.08), 0 8px 24px rgba(0,0,0,.6);
        }
        .dx-shade::after {
          content: "";
          position: absolute;
          left: 6px; right: 6px; bottom: -3px; height: 6px;
          border-radius: 50%;
          background: #ffe9a8;
          filter: blur(1px);
        }

        .dx-beam {
          position: absolute;
          top: 36px; left: 50%;
          width: min(980px, 100%);
          height: 560px;
          transform: translateX(-50%);
          filter: blur(16px);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
          animation: dxBeam 6s ease-in-out infinite;
        }
        .dx-beam::before {
          content: "";
          position: absolute;
          inset: 0;
          clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
          background: linear-gradient(
            180deg,
            rgba(255, 213, 110, 0.34) 0%,
            rgba(255, 190, 70, 0.14) 45%,
            rgba(255, 180, 60, 0) 100%
          );
        }
        @keyframes dxBeam { 0%, 100% { opacity: .85; } 50% { opacity: 1; } }

        .dx-firefly {
          position: absolute;
          border-radius: 50%;
          background: #ffd76a;
          box-shadow: 0 0 8px 2px rgba(255, 207, 90, 0.7);
          animation: dxDrift var(--dur) ease-in-out infinite, dxBlink var(--blink) ease-in-out infinite;
          animation-delay: var(--delay), var(--delay);
        }
        @keyframes dxDrift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(var(--dx), var(--dy)); }
        }
        @keyframes dxBlink {
          0%, 100% { opacity: .12; }
          50% { opacity: 1; }
        }

        /* ---------- layout ---------- */
        .dx-content { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 28px; }

        @keyframes dxFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dxScale {
          from { opacity: 0; transform: scale(.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes dxPulse {
          0%, 100% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .dx-fade-up { animation: dxFadeUp .55s cubic-bezier(.22, 1, .36, 1) both; }
        .dx-scale { animation: dxScale .45s cubic-bezier(.22, 1, .36, 1) both; }
        .dx-stagger > * { animation: dxFadeUp .55s cubic-bezier(.22, 1, .36, 1) both; }

        .dx-glass {
          border: 1px solid var(--line);
          background: var(--glass);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          box-shadow: 0 30px 80px rgba(0, 0, 0, .45), inset 0 1px 0 rgba(255,255,255,.05);
        }

        /* ---------- welcome banner ---------- */
        .dx-hero {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          padding: clamp(22px, 3.5vw, 36px);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .dx-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 12% 0%, rgba(255, 200, 61, .20), transparent 45%),
            radial-gradient(circle at 95% 100%, rgba(255, 170, 40, .10), transparent 40%);
          pointer-events: none;
        }
        .dx-hero > * { position: relative; }
        .dx-chip {
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 14px;
          padding: 6px 13px;
          border-radius: 999px;
          border: 1px solid rgba(255, 200, 61, .25);
          background: rgba(255, 200, 61, .08);
          font-size: 12px; font-weight: 500;
          color: #ffe08a;
        }
        .dx-chip i {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--amber);
          box-shadow: 0 0 10px rgba(255, 200, 61, .9);
          animation: dxPulse 2.4s ease-in-out infinite;
        }
        .dx-hero h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 700;
          letter-spacing: -.8px;
        }
        .dx-hero p {
          margin: 10px 0 0;
          max-width: 560px;
          font-size: 14.5px;
          line-height: 1.65;
          color: var(--muted);
        }
        .dx-hero-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dx-hero-stat {
          min-width: 118px;
          padding: 16px 22px;
          border-radius: 18px;
          text-align: center;
          border: 1px solid var(--line);
          background: rgba(10, 10, 8, .55);
        }
        .dx-hero-stat b { display: block; font-size: 28px; font-weight: 700; color: var(--amber); text-shadow: 0 0 18px rgba(255, 200, 61, .35); }
        .dx-hero-stat span { display: block; margin-top: 4px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }

        /* ---------- stage cards ---------- */
        .dx-stages {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }
        .dx-stage {
          position: relative;
          overflow: hidden;
          padding: 16px 16px 14px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: var(--glass);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          color: #fff;
          font: inherit;
          text-align: left;
          cursor: pointer;
          transition: transform .28s cubic-bezier(.22, 1, .36, 1), border-color .28s ease, box-shadow .28s ease;
        }
        .dx-stage::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0; height: 3px;
          background: linear-gradient(90deg, var(--c1), var(--c2));
        }
        .dx-stage::after {
          content: "";
          position: absolute;
          left: 50%; top: -40px;
          width: 120px; height: 80px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(ellipse, var(--c1), transparent 70%);
          opacity: .0;
          transition: opacity .35s ease;
        }
        .dx-stage:hover { transform: translateY(-4px); border-color: rgba(255, 255, 255, .2); box-shadow: 0 16px 40px rgba(0, 0, 0, .5); }
        .dx-stage:hover::after { opacity: .22; }
        .dx-stage:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
        .dx-stage.active { border-color: var(--amber); box-shadow: 0 0 0 3px rgba(255, 200, 61, .14), 0 16px 40px rgba(0, 0, 0, .5); }
        .dx-stage.active::after { opacity: .28; }
        .dx-stage-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .dx-stage-name { font-size: 11.5px; font-weight: 500; letter-spacing: .02em; color: var(--muted); }
        .dx-stage-icon { font-size: 19px; transition: transform .3s ease; }
        .dx-stage:hover .dx-stage-icon { transform: scale(1.2) rotate(6deg); }
        .dx-stage-count { margin-top: 10px; font-size: 32px; font-weight: 700; letter-spacing: -.5px; line-height: 1; }
        .dx-stage-bar { margin-top: 14px; height: 4px; overflow: hidden; border-radius: 999px; background: rgba(255, 255, 255, .08); }
        .dx-stage-bar i {
          display: block; height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, var(--c1), var(--c2));
          box-shadow: 0 0 10px var(--c1);
          transition: width .7s ease;
        }
        .dx-live-dot {
          position: absolute; right: 10px; top: 12px;
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--amber);
          box-shadow: 0 0 10px rgba(255, 200, 61, .9);
          animation: dxPulse 1.8s ease-in-out infinite;
        }

        /* ---------- main grid ---------- */
        .dx-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 28px; align-items: start; }
        .dx-aside { display: flex; flex-direction: column; gap: 28px; }

        .dx-panel { overflow: hidden; border-radius: 24px; }
        .dx-panel-head { padding: 24px 26px; border-bottom: 1px solid var(--line); }
        .dx-panel-head.compact { padding: 20px 22px; }
        .dx-head-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
        .dx-eyebrow { margin: 0; font-size: 11.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--amber); }
        .dx-title { margin: 4px 0 0; font-size: 22px; font-weight: 600; letter-spacing: -.3px; color: #fff; }
        .dx-title.sm { font-size: 18px; }
        .dx-filters { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
        .dx-filters .grow { flex: 1 1 240px; }
        .dx-filters .fixed { flex: 0 1 210px; min-width: 160px; }
        .dx-head-icon {
          display: grid; place-items: center;
          width: 42px; height: 42px;
          border-radius: 13px;
          font-size: 18px;
          background: rgba(255, 200, 61, .09);
          border: 1px solid rgba(255, 200, 61, .2);
        }

        /* inputs, selects and buttons from ui.jsx pick up the same look as the login page */
        .dx-page input, .dx-page select {
          width: 100%;
          height: 46px;
          padding: 0 14px !important;
          border-radius: 13px !important;
          border: 1px solid rgba(255, 255, 255, .07) !important;
          background-color: #0a0a08 !important;
          color: #fff !important;
          font-family: inherit !important;
          font-size: 14px !important;
          outline: none !important;
          box-shadow: none !important;
          transition: border-color .25s, box-shadow .25s;
        }
        .dx-page input::placeholder { color: #6d6a5d !important; }
        .dx-page input:focus, .dx-page select:focus {
          border-color: var(--amber) !important;
          box-shadow: 0 0 0 3px rgba(255, 200, 61, .12) !important;
        }
        .dx-page select {
          appearance: none; -webkit-appearance: none;
          padding-right: 38px !important;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffc83d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 12px center !important;
        }
        .dx-page select:disabled { opacity: .55; cursor: not-allowed; }
        .dx-page select option { background: #14130f; color: #fff; }
        .dx-table select { height: 40px; border-radius: 11px !important; font-size: 13px !important; }

        .dx-page .dx-btn {
          height: 46px;
          padding: 0 20px !important;
          border: none !important;
          border-radius: 13px !important;
          background: linear-gradient(180deg, #ffd23f, #fbb914) !important;
          color: #1a1608 !important;
          font-family: inherit !important;
          font-size: 14.5px !important;
          font-weight: 600 !important;
          cursor: pointer;
          transition: transform .2s, box-shadow .3s, opacity .2s;
        }
        .dx-page .dx-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(251, 185, 20, .28) !important; }
        .dx-page .dx-btn:active:not(:disabled) { transform: scale(.985); }
        .dx-page .dx-btn:disabled { opacity: .55; cursor: not-allowed; }
        .dx-page .dx-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .dx-page .dx-btn-ghost {
          height: 42px;
          padding: 0 18px !important;
          border: 1px solid var(--line) !important;
          border-radius: 12px !important;
          background: rgba(255, 255, 255, .04) !important;
          color: #e8e5d8 !important;
          font-family: inherit !important;
          font-size: 13.5px !important;
          font-weight: 500 !important;
          box-shadow: none !important;
          cursor: pointer;
          transition: background .25s, border-color .25s, transform .2s, opacity .2s;
        }
        .dx-page .dx-btn-ghost:hover:not(:disabled) { background: rgba(255, 255, 255, .09) !important; border-color: rgba(255, 255, 255, .2) !important; transform: translateY(-2px); }
        .dx-page .dx-btn-ghost:disabled { opacity: .4; cursor: not-allowed; }
        .dx-page .dx-btn-ghost:focus-visible { outline: 2px solid var(--amber); }

        /* ---------- add candidate form ---------- */
        .dx-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 18px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255, 200, 61, .2);
          background: linear-gradient(135deg, rgba(255, 200, 61, .07), rgba(10, 10, 8, .5));
        }
        .dx-form .full { grid-column: 1 / -1; display: flex; gap: 10px; }

        /* ---------- table ---------- */
        .dx-table-wrap { overflow-x: auto; }
        .dx-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
        .dx-table th {
          padding: 14px 12px;
          font-size: 10.5px; font-weight: 600;
          letter-spacing: .13em; text-transform: uppercase;
          color: var(--dim);
          background: rgba(0, 0, 0, .22);
        }
        .dx-table th:first-child, .dx-table td:first-child { padding-left: 22px; }
        .dx-table th:last-child, .dx-table td:last-child { padding-right: 22px; }
        .dx-table td { padding: 14px 12px; vertical-align: middle; }
        .dx-table tbody tr { border-top: 1px solid rgba(255, 255, 255, .06); transition: background-color .22s ease, transform .22s ease; }
        .dx-table tbody tr:hover { background: rgba(255, 200, 61, .045); transform: translateX(3px); }
        .dx-cand { display: flex; align-items: center; gap: 12px; }
        .dx-avatar {
          display: grid; place-items: center;
          flex-shrink: 0;
          width: 42px; height: 42px;
          border-radius: 13px;
          font-size: 13px; font-weight: 700;
          color: #1a1608;
          background: linear-gradient(180deg, #ffd76a, #e09a00);
          box-shadow: 0 0 16px rgba(255, 200, 80, .25);
          transition: transform .3s ease;
        }
        .dx-table tbody tr:hover .dx-avatar { transform: scale(1.08); }
        .dx-cand-info { min-width: 0; }
        .dx-name {
          display: block;
          max-width: 200px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          font-weight: 600;
          color: #fff;
          text-decoration: none;
          transition: color .2s;
        }
        .dx-name:hover { color: var(--amber); }
        .dx-email { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--dim); }
        .dx-position { white-space: nowrap; color: #d6d2c0; font-weight: 500; }
        .dx-badge {
          display: inline-flex; align-items: center; gap: 6px;
          white-space: nowrap;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px; font-weight: 600;
          background: var(--bg);
          color: var(--fg);
          border: 1px solid color-mix(in srgb, var(--fg) 22%, transparent);
        }
        .dx-move { width: 200px; }

        .dx-empty { padding: 60px 24px; text-align: center; }
        .dx-empty .ico {
          display: grid; place-items: center;
          width: 64px; height: 64px; margin: 0 auto;
          border-radius: 18px; font-size: 30px;
          background: rgba(255, 200, 61, .08);
          border: 1px solid rgba(255, 200, 61, .18);
        }
        .dx-empty b { display: block; margin-top: 16px; font-weight: 600; color: #fff; }
        .dx-empty p { margin: 6px 0 0; font-size: 13.5px; color: var(--dim); }

        .dx-pager {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 16px 22px;
          border-top: 1px solid var(--line);
        }
        .dx-pager-info {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px; font-weight: 500;
          color: var(--muted);
          background: rgba(255, 255, 255, .05);
          border: 1px solid var(--line);
          text-align: center;
        }
        .dx-pager-info em { font-style: normal; margin: 0 6px; color: var(--dim); }
        .dx-spin { display: flex; min-height: 256px; align-items: center; justify-content: center; }

        /* ---------- interviews ---------- */
        .dx-ivs { padding: 10px; }
        .dx-iv-empty { padding: 32px 12px; text-align: center; }
        .dx-iv-empty .big { font-size: 30px; }
        .dx-iv-empty b { display: block; margin-top: 8px; font-size: 14px; font-weight: 600; color: #fff; }
        .dx-iv-empty p { margin: 4px 0 0; font-size: 12.5px; color: var(--dim); }
        .dx-iv {
          display: flex; align-items: center; gap: 12px;
          padding: 12px;
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          transition: background-color .22s ease, transform .22s ease;
        }
        .dx-iv:hover { background: rgba(255, 200, 61, .07); transform: translateX(3px); }
        .dx-date {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          flex-shrink: 0;
          width: 50px; height: 50px;
          border-radius: 14px;
          color: #1a1608;
          background: linear-gradient(180deg, #ffd76a, #e09a00);
          box-shadow: 0 0 16px rgba(255, 200, 80, .22);
          transition: transform .3s ease;
        }
        .dx-iv:hover .dx-date { transform: scale(1.07); }
        .dx-date span { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; line-height: 1; opacity: .75; }
        .dx-date strong { font-size: 19px; font-weight: 700; line-height: 1.15; }
        .dx-iv-info { min-width: 0; font-size: 14px; }
        .dx-iv-info b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: #fff; }
        .dx-iv-info .mode { font-size: 12.5px; color: var(--muted); }
        .dx-iv-info .time { margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--dim); }
        .dx-arrow { margin-left: auto; color: #55524a; transition: transform .3s ease, color .3s ease; }
        .dx-iv:hover .dx-arrow { transform: translateX(4px); color: var(--amber); }

        /* ---------- activity ---------- */
        .dx-activity { padding: 22px; }
        .dx-activity .none { margin: 0; font-size: 13.5px; color: var(--dim); }
        .dx-act { position: relative; display: flex; gap: 12px; font-size: 14px; padding-bottom: 20px; }
        .dx-act:last-child { padding-bottom: 0; }
        .dx-act-rail { position: relative; display: flex; justify-content: center; flex-shrink: 0; width: 12px; }
        .dx-act-dot {
          margin-top: 6px;
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--amber);
          box-shadow: 0 0 10px rgba(255, 200, 61, .8);
        }
        .dx-act-line { position: absolute; top: 22px; bottom: -20px; width: 1px; background: rgba(255, 255, 255, .1); }
        .dx-act-body { min-width: 0; }
        .dx-act-body p { margin: 0; line-height: 1.55; color: var(--muted); }
        .dx-act-body b { font-weight: 600; color: #fff; }
        .dx-act-body .who { font-weight: 600; color: var(--amber); }
        .dx-act-time { margin-top: 3px; font-size: 11.5px; color: var(--dim); }

        /* ---------- responsive ---------- */
        @media (max-width: 1024px) {
          .dx-grid { grid-template-columns: minmax(0, 1fr); }
        }
        @media (max-width: 640px) {
          .dx-page { border-radius: 20px; }
          .dx-form { grid-template-columns: 1fr; }
          .dx-hero-stats { width: 100%; }
          .dx-panel-head { padding: 20px 18px; }
          .dx-pager { flex-wrap: wrap; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="dx-page">
        {/* Ambient background: lamp light + blinking fireflies */}
        <div className="dx-ambient" aria-hidden="true">
          <div className="dx-beam" />
          <div className="dx-shade" />
          {fireflies.map((p) => (
            <span
              key={p.id}
              className="dx-firefly"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--dur': `${p.dur}s`,
                '--blink': `${p.blink}s`,
                '--delay': `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="dx-content">
          <ErrorMsg error={err} />

          {/* Welcome banner */}
          <section className="dx-hero dx-glass dx-fade-up">
            <div>
              <div className="dx-chip">
                <i />
                Recruitment workspace
              </div>

              <h1>
                {greet}, {user.name.split(' ')[0]}
              </h1>

              <p>
                Manage your hiring pipeline, track candidates, and stay ahead
                of every upcoming interview.
              </p>
            </div>

            <div className="dx-hero-stats">
              <div className="dx-hero-stat">
                <b>{total}</b>
                <span>Candidates</span>
              </div>
              <div className="dx-hero-stat">
                <b>{ivs.length}</b>
                <span>Interviews</span>
              </div>
            </div>
          </section>

          {/* Pipeline stage cards */}
          <section className="dx-stages dx-stagger">
            {STAGES.map((s, i) => {
              const st = stageStyle[s];
              const active = stage === s;

              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => {
                    setStage(active ? '' : s);
                    setPage(1);
                  }}
                  style={{
                    animationDelay: `${i * 65}ms`,
                    '--c1': st.c1,
                    '--c2': st.c2,
                  }}
                  className={`dx-stage ${active ? 'active' : ''}`}
                >
                  {active && <span className="dx-live-dot" />}

                  <div className="dx-stage-top">
                    <span className="dx-stage-name">{s}</span>
                    <span className="dx-stage-icon">{st.icon}</span>
                  </div>

                  <div className="dx-stage-count">{count(s)}</div>

                  <div className="dx-stage-bar">
                    <i
                      style={{
                        width: total ? `${Math.min((count(s) / total) * 100, 100)}%` : '0%',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </section>

          <div className="dx-grid">
            {/* Candidates */}
            <section className="dx-panel dx-glass">
              <div className="dx-panel-head">
                <div className="dx-head-row">
                  <div>
                    <p className="dx-eyebrow">Talent pipeline</p>
                    <h2 className="dx-title">Candidates</h2>
                  </div>

                  {isRec && (
                    <Btn className="dx-btn" onClick={() => setForm({})}>
                      <span style={{ marginRight: 6 }}>＋</span> Candidate
                    </Btn>
                  )}
                </div>

                <div className="dx-filters">
                  <div className="grow">
                    <Input
                      placeholder="🔎  Search name, email, position…"
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>

                  <div className="fixed">
                    <Select
                      value={stage}
                      onChange={(e) => {
                        setStage(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">All stages</option>
                      {STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {form && (
                <form onSubmit={add} className="dx-form dx-scale">
                  <Input
                    placeholder="Full name"
                    required
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    required
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <Input
                    placeholder="Position"
                    required
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                  <Input
                    placeholder="Phone number"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />

                  <div className="full">
                    <Btn disabled={loadingAction} className="dx-btn">
                      {loadingAction ? 'Saving…' : 'Save Candidate'}
                    </Btn>
                    <Btn
                      type="button"
                      variant="ghost"
                      className="dx-btn-ghost"
                      onClick={() => setForm(null)}
                    >
                      Cancel
                    </Btn>
                  </div>
                </form>
              )}

              {!data ? (
                <div className="dx-spin">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="dx-table-wrap">
                    <table className="dx-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Position</th>
                          <th>Stage</th>
                          {isRec && <th>Move to</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {data.items.map((c, index) => (
                          <tr
                            key={c._id}
                            style={{ animationDelay: `${index * 45}ms` }}
                            className="dx-fade-up"
                          >
                            <td>
                              <div className="dx-cand">
                                <span className="dx-avatar">{initials(c.name)}</span>

                                <div className="dx-cand-info">
                                  <Link className="dx-name" to={`/candidates/${c._id}`}>
                                    {c.name}
                                  </Link>
                                  <div className="dx-email">{c.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="dx-position">{c.position}</td>

                            <td>
                              <span
                                className="dx-badge"
                                style={{
                                  '--bg': stageStyle[c.stage].bg,
                                  '--fg': stageStyle[c.stage].fg,
                                }}
                              >
                                <span style={{ fontSize: 11 }}>
                                  {stageStyle[c.stage].icon}
                                </span>
                                {c.stage}
                              </span>
                            </td>

                            {isRec && (
                              <td className="dx-move">
                                <Select
                                  value={c.stage}
                                  disabled={loadingAction}
                                  onChange={(e) => move(c._id, e.target.value)}
                                >
                                  {STAGES.map((s) => (
                                    <option key={s}>{s}</option>
                                  ))}
                                </Select>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {!data.items.length && (
                      <div className="dx-empty dx-scale">
                        <div className="ico">🗂️</div>
                        <b>No candidates found</b>
                        {isRec && <p>Add a candidate to start building your pipeline.</p>}
                      </div>
                    )}
                  </div>

                  {data && (
                    <div className="dx-pager">
                      <Btn
                        variant="ghost"
                        disabled={page <= 1}
                        className="dx-btn-ghost"
                        onClick={() => setPage(page - 1)}
                      >
                        ← Prev
                      </Btn>

                      <span className="dx-pager-info">
                        Page {page} / {data.pages}
                        <em>·</em>
                        {data.total} total
                      </span>

                      <Btn
                        variant="ghost"
                        disabled={page >= data.pages}
                        className="dx-btn-ghost"
                        onClick={() => setPage(page + 1)}
                      >
                        Next →
                      </Btn>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Sidebar */}
            <aside className="dx-aside">
              <section className="dx-panel dx-glass">
                <div className="dx-panel-head compact">
                  <div className="dx-head-row">
                    <div>
                      <p className="dx-eyebrow">Schedule</p>
                      <h2 className="dx-title sm">Upcoming interviews</h2>
                    </div>
                    <span className="dx-head-icon">📅</span>
                  </div>
                </div>

                <div className="dx-ivs">
                  {!ivs.length && (
                    <div className="dx-iv-empty">
                      <div className="big">🗓️</div>
                      <b>Nothing scheduled</b>
                      <p>Upcoming interviews will appear here.</p>
                    </div>
                  )}

                  {ivs.map((i) => {
                    const d = new Date(i.scheduledAt);

                    return (
                      <Link
                        key={i._id}
                        to={`/candidates/${i.candidate._id}`}
                        className="dx-iv"
                      >
                        <div className="dx-date">
                          <span>{d.toLocaleString([], { month: 'short' })}</span>
                          <strong>{d.getDate()}</strong>
                        </div>

                        <div className="dx-iv-info">
                          <b>{i.candidate.name}</b>
                          <span className="mode">{i.mode}</span>
                          <div className="time">
                            {d.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {isRec && ` · with ${i.interviewer.name}`}
                          </div>
                        </div>

                        <span className="dx-arrow">→</span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {isRec && (
                <section className="dx-panel dx-glass">
                  <div className="dx-panel-head compact">
                    <div className="dx-head-row">
                      <div>
                        <p className="dx-eyebrow">Live feed</p>
                        <h2 className="dx-title sm">Recent activity</h2>
                      </div>
                      <span className="dx-head-icon">⚡</span>
                    </div>
                  </div>

                  <div className="dx-activity">
                    {!stats?.activity.length && (
                      <p className="none">No activity yet.</p>
                    )}

                    <div>
                      {stats?.activity.map((a, index) => (
                        <div
                          key={a._id}
                          className="dx-act dx-fade-up"
                          style={{ animationDelay: `${index * 70}ms` }}
                        >
                          <div className="dx-act-rail">
                            <span className="dx-act-dot" />
                            {index < stats.activity.length - 1 && (
                              <span className="dx-act-line" />
                            )}
                          </div>

                          <div className="dx-act-body">
                            <p>
                              <b>{a.user?.name}</b> {a.action}
                              {a.candidate && (
                                <>
                                  {' '}
                                  —{' '}
                                  <span className="who">{a.candidate.name}</span>
                                </>
                              )}
                            </p>
                            <div className="dx-act-time">{fmt(a.createdAt)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
