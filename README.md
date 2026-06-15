# GitSolve AI

Automatically detect **accepted** competitive-programming submissions across 9 judges, archive the solution to a GitHub repo, and attach an AI-generated explanation — then browse everything from a dashboard.

```
gitsolve-ai/
├── backend/            Node + Express + MongoDB API, GitHub OAuth, Gemini
├── chrome-extension/   Manifest V3 extension (detects ACs, posts to backend)
└── dashboard-frontend/ React + Vite + Tailwind dashboard
```

## Architecture in one breath

1. The **extension** injects a tiny detector into each judge's submission page. On an *Accepted* verdict it grabs the source code and POSTs it to the backend.
2. The **backend** immediately stores the submission (`status: pending`, returns `201`), then asynchronously: pushes the file to your GitHub `gitsolve-solutions` repo → calls Gemini for an explanation → updates statistics. Status walks `pending → github_saved → ai_processing → completed`.
3. The **dashboard** reads your stats and submissions and renders them — including a GitHub-style activity heatmap, difficulty/topic/month charts, and a per-submission code + AI view.

### The one non-obvious design decision

Chrome MV3 content scripts that run in the page's `MAIN` world (needed to patch `fetch` and read the Monaco/Ace editor globals) **cannot call `chrome.*` APIs**. So the extension injects `content/_bridge.js` into the `ISOLATED` world first; the MAIN-world detector talks to it via `window.postMessage`, and the bridge relays to the background service worker via `chrome.runtime.sendMessage`. This split is intentional — don't merge the two.

---

## Prerequisites

- **Node.js 18+**
- A **MongoDB** connection string (Atlas or local)
- A **GitHub OAuth App** (Settings → Developer settings → OAuth Apps)
- A **Gemini API key** (Google AI Studio)
- **Google Chrome** (or any Chromium browser) for the extension

### GitHub OAuth App settings (must match exactly)

- **Homepage URL:** `http://localhost:3001`
- **Authorization callback URL:** `http://localhost:3001/auth/success`

The callback URL must be *character-for-character* identical to `GITHUB_CALLBACK_URL` in your `.env`. A trailing slash mismatch is the #1 cause of OAuth failures.

---

## 1) Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in real values
npm start                 # serves on http://localhost:3001
```

Required `.env` values:

| Variable | Notes |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | any long random string |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | from your OAuth App |
| `GITHUB_CALLBACK_URL` | `http://localhost:3001/auth/success` |
| `GEMINI_API_KEY` | Google AI Studio key |
| `ENCRYPTION_KEY` | **exactly 64 hex characters** (32 bytes) |
| `FRONTEND_URL` | `http://localhost:5173` |
| `PORT` | optional, defaults to `3001` |

Generate a valid `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Health check: open `http://localhost:3001/health` → should return `{ ok: true }`.

## 2) Chrome extension

```
1. Go to chrome://extensions
2. Toggle "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select the  chrome-extension/  folder
```

Then click the GitSolve icon → **Connect GitHub**. A tab opens, you authorize, and the extension captures your token automatically (it watches the tab for `/auth/success#token=`). The popup dot turns green when connected.

> The extension's `BACKEND_URL` is `http://localhost:3001`. If you change the backend port, update it at the top of `chrome-extension/background.js`.

## 3) Dashboard

```bash
cd dashboard-frontend
npm install
npm run dev               # serves on http://localhost:5173
```

Open `http://localhost:5173`, click **Connect GitHub** (popup OAuth), and your data appears. The dashboard stores its JWT in `localStorage` under `gitsolve_token`.

---

## Testing each component

**Backend alone**
- `GET /health` → `{ ok: true }`.
- Visit `http://localhost:3001/auth/github` in a browser → completes GitHub OAuth → lands on the success page with a token in the URL fragment.
- With a token: `curl -H "Authorization: Bearer <JWT>" http://localhost:3001/api/me`.

**Extension**
- Open the service worker console: `chrome://extensions` → GitSolve → "service worker" → Inspect. Watch the logs.
- Solve any easy problem on LeetCode/Codeforces/etc. On *Accepted*, you should see a toast on the page and a submission POST in the worker logs, and a badge count on the icon.

**End to end**
- After an accepted solve, check your GitHub account for a `gitsolve-solutions` repo containing `solutions/<slug>.<ext>`.
- Refresh the dashboard — the submission appears, status progresses to **Completed**, and the AI explanation shows up on its detail page.

---

## Common issues & fixes

| Symptom | Cause / fix |
|---|---|
| OAuth redirect error / `redirect_uri_mismatch` | The GitHub OAuth App callback must be **exactly** `http://localhost:3001/auth/success` and match `GITHUB_CALLBACK_URL`. |
| Backend crashes on start with an encryption error | `ENCRYPTION_KEY` must be **64 hex chars** (32 bytes). Regenerate with the command above. |
| GitHub push fails / repo never created | Your OAuth App must request the **`repo`** scope (already set in the strategy). Re-authorize after changing scopes. |
| Extension detects nothing | Judges change their DOM/markup often. The per-platform selectors in `chrome-extension/content/<platform>.js` may need tuning. This is inherent to scraping. Check the service worker console for errors. |
| `chrome.* is undefined` in a content script | You're editing the MAIN-world detector. It can't use `chrome.*` — route messages through `_bridge.js` (see "the one non-obvious decision"). |
| Submission stuck at `pending`/`ai_processing` | Check the backend logs. AI failures never block the pipeline — they fall back to a placeholder explanation (`isFallback: true`); GitHub/network errors mark the submission `failed` with `statusError`. |
| Dashboard popup does nothing | Allow popups for `localhost:5173`. The token is delivered via `window.opener.postMessage` from the backend's success page, which reads `FRONTEND_URL`. |
| Service worker "inactive" | MV3 workers sleep when idle; they wake on navigation/events. This is normal — no action needed. |
| CORS error from dashboard | The backend allows all origins by default (`cors({ origin: true })`). If you locked it down, add `http://localhost:5173`. |

## Notes on the stack

- **shadcn/ui:** the dashboard ships lightweight, self-contained Tailwind primitives (`src/components/ui.jsx`) so the project runs with zero extra setup. To switch to real shadcn/ui, run its CLI and replace the imports from `./ui` with the generated components — the prop shapes (`Card`, `Button`, `Badge`) are intentionally compatible.
- **GitHub token storage:** never stored in plaintext. It's encrypted at rest with AES-256-GCM via a Mongoose virtual and excluded from all JSON responses.
