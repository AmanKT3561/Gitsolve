// Thin fetch wrapper around the GitSolve backend.
// Token is stored in localStorage under 'gitsolve_token' (same key the
// extension uses in chrome.storage.local — they are independent stores but
// we keep the name consistent for clarity).

export const BACKEND_URL = 'http://localhost:3001';
const TOKEN_KEY = 'gitsolve_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isAuthed() {
  return Boolean(getToken());
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error || body.message || '';
    } catch (e) {
      /* ignore */
    }
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  me: async () => (await request('/api/me')).user,
  statistics: async () => (await request('/api/statistics')).statistics,
  submissions: ({ page = 1, limit = 20, platform, status } = {}) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (platform) q.set('platform', platform);
    if (status) q.set('status', status);
    return request(`/api/submissions?${q.toString()}`); // { items, page, total, pages }
  },
  submission: async (id) => (await request(`/api/submissions/${id}`)).submission,
};

// Open GitHub OAuth in a popup; resolve with the token posted back by the
// /auth/success page via window.opener.postMessage.
export function loginWithGithubPopup() {
  return new Promise((resolve, reject) => {
    const w = 520;
    const h = 640;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      `${BACKEND_URL}/auth/github`,
      'gitsolve_oauth',
      `width=${w},height=${h},left=${left},top=${top}`
    );
    if (!popup) {
      reject(new Error('Popup blocked. Allow popups for this site and try again.'));
      return;
    }

    function onMessage(event) {
      // Backend page posts {source:'gitsolve', token}. Origin is the backend.
      if (event.origin !== BACKEND_URL) return;
      const data = event.data || {};
      if (data.source !== 'gitsolve' || !data.token) return;
      window.removeEventListener('message', onMessage);
      clearInterval(poll);
      setToken(data.token);
      try {
        popup.close();
      } catch (e) {
        /* ignore */
      }
      resolve(data.token);
    }
    window.addEventListener('message', onMessage);

    // Fallback: detect manual close.
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener('message', onMessage);
        if (!isAuthed()) reject(new Error('Sign-in was cancelled.'));
        else resolve(getToken());
      }
    }, 600);
  });
}
