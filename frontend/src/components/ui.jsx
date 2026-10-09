import React from 'react';

export const Card = ({ className = '', ...p }) => (
  <div className={`rounded-2xl border border-white/10 bg-[rgba(34,33,27,.62)] p-5 shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-xl transition-all duration-200 hover:border-white/20 ${className}`} {...p} />
);

const variants = {
  primary: 'bg-gradient-to-b from-[#ffd23f] to-[#fbb914] text-[#1a1608] shadow-md shadow-amber-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30',
  ghost: 'border border-white/10 bg-white/5 text-[#e8e5d8] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10',
  danger: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-red-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110',
};

export const Btn = ({ variant = 'primary', className = '', ...p }) => (
  <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc83d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c08] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...p} />
);

const field = 'w-full rounded-xl border border-white/10 bg-[#0a0a08] px-3 py-2.5 text-sm text-white transition-all duration-200 placeholder:text-[#6d6a5d] hover:border-white/20 focus:border-[#ffc83d] focus:outline-none focus:ring-2 focus:ring-[#ffc83d]/20 [&>option]:bg-[#14130f]';
export const Input = (p) => <input className={field} {...p} />;
export const Select = (p) => <select className={field} {...p} />;
export const Textarea = (p) => <textarea className={field} rows={3} {...p} />;

export const Spinner = () => (
  <div className="flex items-center justify-center gap-3 p-8 text-sm text-[#a8a595]">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#ffc83d] border-t-transparent" />Loading…
  </div>
);
export const ErrorMsg = ({ error }) => error ? <p role="alert" className="animate-fade-up rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null;
export const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
