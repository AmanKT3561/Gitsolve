# GitSolve AI — Deployment

Production URLs this build is wired to:

- **Backend (Render):** https://gitsolve-1.onrender.com
- **Dashboard (Vercel):** https://gitsolve-pearl.vercel.app

To change them later: backend URL lives in `chrome-extension/background.js` (`BACKEND_URL`),
`chrome-extension/manifest.json` (`host_permissions`), and `dashboard-frontend/src/lib/api.js`
(`BACKEND_URL`, overridable with a `VITE_BACKEND_URL` env var). Dashboard URL lives in
`chrome-extension/popup/popup.html` and the backend `FRONTEND_URL` env var.

---

## 1. Backend — Render

Service settings:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

**Environment variables** (set these in Render → your service → Environment; the `.env`
file is NOT in the repo). Do not set `PORT` — Render injects it.

```
NODE_ENV=production
MONGODB_URI=<your Atlas connection string>
JWT_SECRET=<long random string>
GITHUB_CLIENT_ID=<from your GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from your GitHub OAuth App>
GITHUB_CALLBACK_URL=https://gitsolve-1.onrender.com/auth/success
FRONTEND_URL=https://gitsolve-pearl.vercel.app
GEMINI_API_KEY=<AI Studio key>
ENCRYPTION_KEY=<64 hex chars>
```

After saving env vars, trigger a manual deploy (or push to the connected branch).
Health check: open https://gitsolve-1.onrender.com/health → `{ "ok": true }`.

> Free tier sleeps after ~15 min idle; the first request then takes ~30s (cold start).

## 2. MongoDB Atlas

Network Access → add `0.0.0.0/0` (Render's outbound IPs rotate, so a fixed IP won't work).

## 3. GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → your app:
- **Homepage URL:** `https://gitsolve-pearl.vercel.app`
- **Authorization callback URL:** `https://gitsolve-1.onrender.com/auth/success`

This must match `GITHUB_CALLBACK_URL` exactly or OAuth fails.

## 4. Dashboard — Vercel

- Framework preset: Vite. Root Directory: `dashboard-frontend`. Build: `npm run build`, Output: `dist`.
- The backend URL defaults to the Render URL in code, so no env var is required.
  (Optional override: set `VITE_BACKEND_URL` in Vercel env.)
- Push the repo (or redeploy) so Vercel rebuilds with this version.

## 5. Chrome extension

The extension already points to the production backend/dashboard. To use it:
- `chrome://extensions` → Developer mode → **Load unpacked** → select `chrome-extension/`.
- Click the icon → **Connect GitHub** (OAuth opens against the Render backend).

To publish: zip the `chrome-extension/` folder and upload to the Chrome Web Store
(one-time $5) or the Microsoft Edge Add-ons store (free). A privacy policy is required
since the extension reads submitted code and handles GitHub tokens.

---

## End-to-end check

1. Backend `/health` returns ok.
2. Open the dashboard → Connect GitHub → you land on the dashboard.
3. Solve a problem on a supported judge with the extension loaded → "Saved ✓" toast.
4. A `gitsolve-solutions` repo gets the file; the dashboard shows the submission as Completed.
