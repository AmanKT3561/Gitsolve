// GitSolve AI — background service worker (MV3, classic worker, NO ES imports)
//
// Responsibilities:
//   1. Programmatically inject detectors on supported platforms (earliest via
//      webNavigation.onCommitted). Each platform detector runs in world:'MAIN'
//      so it can patch window.fetch and read page globals (monaco/ace).
//   2. Inject content/_bridge.js FIRST in the default (ISOLATED) world. The
//      MAIN-world detector cannot call chrome.*, so it window.postMessage()s
//      its payload and the bridge relays it here via chrome.runtime.sendMessage.
//   3. Capture the JWT after GitHub OAuth by watching tabs for
//      '/auth/success#token='.
//   4. POST detected submissions to the backend with the stored JWT.

const BACKEND_URL = 'https://gitsolve-1.onrender.com';
const TOKEN_KEY = 'gitsolve_token';
const RECENT_KEY = 'gitsolve_recent';

// host (regex) -> detector file. Each detector is self-contained.
const PLATFORMS = [
  { id: 'leetcode',     test: (h) => /(^|\.)leetcode\.com$/.test(h),        file: 'content/leetcode.js' },
  { id: 'codeforces',   test: (h) => /(^|\.)codeforces\.com$/.test(h),      file: 'content/codeforces.js' },
  { id: 'cses',         test: (h) => /(^|\.)cses\.fi$/.test(h),             file: 'content/cses.js' },
  { id: 'codechef',     test: (h) => /(^|\.)codechef\.com$/.test(h),        file: 'content/codechef.js' },
  { id: 'gfg',          test: (h) => /(^|\.)geeksforgeeks\.org$/.test(h),   file: 'content/gfg.js' },
  { id: 'hackerrank',   test: (h) => /(^|\.)hackerrank\.com$/.test(h),      file: 'content/hackerrank.js' },
  { id: 'atcoder',      test: (h) => /(^|\.)atcoder\.jp$/.test(h),          file: 'content/atcoder.js' },
  { id: 'naukri',       test: (h) => /(^|\.)(naukri\.com|codingninjas\.com)$/.test(h), file: 'content/naukri.js' },
  { id: 'interviewbit', test: (h) => /(^|\.)interviewbit\.com$/.test(h),    file: 'content/interviewbit.js' },
];

function platformForUrl(url) {
  try {
    const host = new URL(url).hostname;
    return PLATFORMS.find((p) => p.test(host)) || null;
  } catch {
    return null;
  }
}

async function injectFor(tabId, platform) {
  try {
    // 1) bridge first (ISOLATED world) so the listener exists before the
    //    detector can post a message.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/_bridge.js'],
      // default world = ISOLATED (has chrome.* access)
    });
    // 2) the platform detector (MAIN world) so it can patch fetch / read editors.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [platform.file],
      world: 'MAIN',
    });
  } catch (err) {
    // Injection can fail on pre-rendered / restricted frames; safe to ignore.
    console.debug('[gitsolve] inject skipped:', err && err.message);
  }
}

function maybeInject(details) {
  if (details.frameId !== 0) return; // top frame only
  const platform = platformForUrl(details.url);
  if (!platform) return;
  injectFor(details.tabId, platform);
}

// Earliest reliable injection point for full navigations.
chrome.webNavigation.onCommitted.addListener(maybeInject);
// SPA route changes (LeetCode, GfG, etc.). Re-injection is a no-op thanks to
// the window.__gitsolve_* guard inside each detector.
chrome.webNavigation.onHistoryStateUpdated.addListener(maybeInject);

// ---------------- OAuth token capture ----------------
function extractToken(url) {
  if (!url || url.indexOf('/auth/success#token=') === -1) return null;
  const m = url.match(/#token=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function captureToken(token, tabId) {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  setBadge('ok');
  if (tabId != null) {
    // Give the success page a moment to render, then close it.
    setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 800);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || (tab && tab.url);
  const token = extractToken(url);
  if (token) captureToken(token, tabId);
});

function startAuth() {
  chrome.tabs.create({ url: `${BACKEND_URL}/auth/github` });
}

// ---------------- Submission relay ----------------
async function getToken() {
  const out = await chrome.storage.local.get(TOKEN_KEY);
  return out[TOKEN_KEY] || null;
}

function setBadge(kind) {
  const map = { busy: ['…', '#f59e0b'], ok: ['✓', '#16a34a'], err: ['!', '#dc2626'] };
  const [text, color] = map[kind] || ['', '#000'];
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  if (kind === 'ok') setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
}

async function recordRecent(entry) {
  const out = await chrome.storage.local.get(RECENT_KEY);
  const recent = Array.isArray(out[RECENT_KEY]) ? out[RECENT_KEY] : [];
  recent.unshift({ ...entry, at: Date.now() });
  await chrome.storage.local.set({ [RECENT_KEY]: recent.slice(0, 20) });
}

async function handleSubmission(payload) {
  setBadge('busy');
  const token = await getToken();
  if (!token) {
    setBadge('err');
    await recordRecent({ title: payload.problemTitle || payload.problemSlug, platform: payload.platform, status: 'not_authenticated' });
    return { ok: false, error: 'Not authenticated. Open the popup and Connect GitHub.' };
  }

  const res = await fetch(`${BACKEND_URL}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 200 && res.status !== 201) {
    setBadge('err');
    await recordRecent({ title: payload.problemTitle || payload.problemSlug, platform: payload.platform, status: `error_${res.status}` });
    return { ok: false, error: `Backend responded ${res.status}` };
  }

  setBadge('ok');
  await recordRecent({ title: payload.problemTitle || payload.problemSlug, platform: payload.platform, status: 'saved' });
  return { ok: true };
}

// ---------------- Message router ----------------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'GITSOLVE_SUBMISSION') {
    handleSubmission(msg.payload)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async response
  }

  if (msg.type === 'GITSOLVE_START_AUTH') {
    startAuth();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'GITSOLVE_GET_STATE') {
    Promise.all([getToken(), chrome.storage.local.get(RECENT_KEY)]).then(([token, out]) => {
      sendResponse({ authenticated: !!token, recent: out[RECENT_KEY] || [] });
    });
    return true;
  }

  if (msg.type === 'GITSOLVE_LOGOUT') {
    chrome.storage.local.remove(TOKEN_KEY).then(() => sendResponse({ ok: true }));
    return true;
  }
});

console.log('[gitsolve] background service worker ready');
