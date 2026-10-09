import { useStore } from './store';
export async function api(path, { method = 'GET', body } = {}) {
  const token = useStore.getState().token;
  const res = await fetch(`/api${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body) });
  if (res.status === 401 && token) useStore.getState().logout();
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, code: data.code });
  return data;
}
