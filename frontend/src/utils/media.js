/** Shared helpers for WebSocket and static upload URLs (matches LiveClassroom / Reports). */

export function getApiRoot() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  if (apiUrl.startsWith('/')) return '';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

export function getWsBase() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  if (apiUrl.startsWith('/')) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  return apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
}

export function uploadUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/uploads/') ? path : `/uploads/${path}`;
  return `${getApiRoot()}${normalized}`;
}
