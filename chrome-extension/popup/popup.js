// GitSolve AI — popup logic
const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');
const recentEl = document.getElementById('recent');

function send(type, payload) {
  return new Promise((resolve) => chrome.runtime.sendMessage({ type, ...payload }, resolve));
}

function statusBadge(s) {
  if (s === 'saved') return '<span class="s saved">saved</span>';
  if (s === 'not_authenticated') return '<span class="s err">no auth</span>';
  if (String(s).startsWith('error')) return '<span class="s err">error</span>';
  return `<span class="s">${s}</span>`;
}

function timeAgo(ts) {
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

function renderRecent(recent) {
  if (!recent || !recent.length) {
    recentEl.innerHTML = '<div class="empty">No submissions captured yet.</div>';
    return;
  }
  recentEl.innerHTML = recent
    .map(
      (r) => `<div class="item">
        <span class="t">${(r.platform || '').toUpperCase()} · ${r.title || 'Untitled'}<br><span class="empty">${timeAgo(r.at)}</span></span>
        ${statusBadge(r.status)}
      </div>`
    )
    .join('');
}

async function refresh() {
  const state = await send('GITSOLVE_GET_STATE');
  const authed = state && state.authenticated;
  dot.classList.toggle('on', !!authed);
  statusText.textContent = authed ? 'Connected to GitHub' : 'Not connected';
  authBtn.style.display = authed ? 'none' : 'block';
  logoutBtn.style.display = authed ? 'block' : 'none';
  renderRecent(state && state.recent);
}

authBtn.addEventListener('click', async () => {
  await send('GITSOLVE_START_AUTH');
  statusText.textContent = 'Opening GitHub…';
  setTimeout(refresh, 1500);
});

logoutBtn.addEventListener('click', async () => {
  await send('GITSOLVE_LOGOUT');
  refresh();
});

document.addEventListener('DOMContentLoaded', refresh);
refresh();
