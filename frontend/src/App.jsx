import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useStore } from './store';
import Login from './pages/Login.jsx'; import Dashboard from './pages/Dashboard.jsx'; import Candidate from './pages/Candidate.jsx';
import { Btn } from './components/ui.jsx';

function Layout({ children }) {
  const { user, logout } = useStore();
  const { pathname } = useLocation();
  return (<div>
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[rgba(12,12,8,.72)] px-4 py-3 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white hover:opacity-90">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffc83d] shadow-[0_0_12px_3px_rgba(255,200,61,.6)]" />
        Hiring <span className="text-[#ffc83d]">Pipeline</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-[#d6d2c0] sm:flex">
          <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-gradient-to-b from-[#ffd76a] to-[#e09a00] text-[10px] font-bold text-[#1a1608]">
            {user.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : (user.name || '?').slice(0, 1).toUpperCase()}
          </span>
          {user.name} · <span className="capitalize text-[#ffd76a]">{user.role}</span>
        </span>
        <Btn variant="ghost" onClick={logout}>Logout</Btn>
      </div>
    </header>
    <main key={pathname} className="animate-fade-up mx-auto max-w-7xl p-4">{children}</main>
  </div>);
}
const Protected = ({ children }) => useStore((s) => s.token) ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
export default function App() {
  const token = useStore((s) => s.token);
  return (<Routes>
    <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/" element={<Protected><Dashboard /></Protected>} />
    <Route path="/candidates/:id" element={<Protected><Candidate /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>);
}
