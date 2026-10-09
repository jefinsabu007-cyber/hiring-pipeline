import { create } from 'zustand';
const saved = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
// The lamp-lit theme is dark-only
document.documentElement.classList.add('dark');
export const useStore = create((set) => ({
  user: saved('user'), token: localStorage.getItem('token'),
  setAuth: ({ user, token }) => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token', token); set({ user, token }); },
  logout: () => { localStorage.removeItem('user'); localStorage.removeItem('token'); set({ user: null, token: null }); },
}));
export const STAGES = ['Applied','Screening','Technical Interview','HR Interview','Offered','Rejected','Hired'];
