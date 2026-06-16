# GitSolve AI

Automatically detect **accepted** competitive-programming submissions across 9 online judges, archive each solution to your own GitHub repo, attach an AI-generated explanation, and browse everything from a dashboard (streaks, stats, per-problem write-ups).

This guide explains how to run it **from the zip on your PC**.

---

## What's inside the zip

```
GitSolve-AI/
├── backend/             Node + Express API (MongoDB, GitHub OAuth, Gemini)
├── dashboard-frontend/  React + Vite dashboard
├── chrome-extension/    Chrome MV3 extension (the part that watches judges)
├── DEPLOY.md            Production deployment guide (Render + Vercel)
└── README.md            This file
```

Supported judges: **LeetCode, Codeforces, CodeChef, CSES, GeeksforGeeks, HackerRank, AtCoder, Naukri Code360, InterviewBit.**

---

## Option A — Just use it (recommended)

This build is already wired to a hosted backend (`https://gitsolve-1.onrender.com`) and dashboard (`https://gitsolve-five.vercel.app`). You only need to load the extension.

1. **Unzip** `GitSolve-AI.zip` anywhere (avoid `Downloads`/OneDrive folders — they can lock files).
2. Open Chrome → go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** → select the `chrome-extension` folder.
5. Click the GitSolve icon in the toolbar → **Connect GitHub** → authorize.
6. Open the dashboard: **https://gitsolve-five.vercel.app** → **Connect GitHub**.
7. Solve any problem on a supported judge. On an **Accepted** verdict you'll see a **"Saved ✓"** toast — the solution lands in your `gitsolve-solutions` GitHub repo and shows up on the dashboard with an AI explanation.

> First action after the backend has been idle may take ~30s (free hosting cold start). Just retry once it wakes.

---

## Option B — Run the whole thing locally (for development)

Use this if you want your own backend instead of the hosted one.

### Prerequisites
- **Node.js 18+**
- A free **MongoDB Atlas** cluster
- A **GitHub OAuth App**
- A **Google AI Studio (Gemini)** API key

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values below
npm run dev               # starts on http://localhost:3001
```

Fill `backend/.env`:

```
PORT=3001
NODE_ENV=development
MONGODB_URI=<your Atlas connection string>
JWT_SECRET=<any long random string>
GITHUB_CLIENT_ID=<from your GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from your GitHub OAuth App>
GITHUB_CALLBACK_URL=http://localhost:3001/auth/success
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=<your Gemini key>
ENCRYPTION_KEY=<64 hex characters>
```

Generate the encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then:
- **MongoDB Atlas → Network Access** → add your IP (or `0.0.0.0/0`).
- **GitHub OAuth App** (github.com/settings/developers → New OAuth App):
  - Homepage URL: `http://localhost:5173`
  - Authorization callback URL: `http://localhost:3001/auth/success`

### 2. Dashboard

```bash
cd dashboard-frontend
npm install
echo "VITE_BACKEND_URL=http://localhost:3001" > .env   # point at local backend
npm run dev               # opens http://localhost:5173
```

### 3. Extension (point it at your local backend)

Edit two files, then load unpacked:
- `chrome-extension/background.js` → set `BACKEND_URL = 'http://localhost:3001'`
- `chrome-extension/manifest.json` → add `"http://localhost:3001/*"` to `host_permissions`

Then `chrome://extensions` → Load unpacked → `chrome-extension`.

---

## How it works (30-second tour)

1. The extension watches supported judge pages. On an **Accepted** verdict it reads your code, language, and problem info.
2. It sends that to the backend, which **pushes the file to your `gitsolve-solutions` repo** using your GitHub token (stored encrypted).
3. The backend asks **Gemini** for an explanation (intuition, approach, complexity) and saves it.
4. The **dashboard** reads your submissions and shows stats, streaks, a heatmap, and each solution's AI write-up.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ERR_CONNECTION_REFUSED` / "localhost refused" on Connect GitHub | The loaded extension points at localhost but no local backend is running. Either start the backend, or reload the extension from a folder whose `background.js` uses the hosted URL. After editing URLs, **reload** the extension in `chrome://extensions`. |
| GitHub: "The redirect_uri is not associated with this application" | The OAuth App's **Authorization callback URL** must match `GITHUB_CALLBACK_URL` exactly (scheme, host, `/auth/success`, no trailing slash). |
| Backend: "Could not connect to MongoDB Atlas… IP not whitelisted" | Atlas → Network Access → add your IP or `0.0.0.0/0`. |
| Dashboard shows **404: NOT_FOUND** on Vercel | Set the project's **Root Directory** to `dashboard-frontend`, then redeploy. |
| `npm install` fails with esbuild `Expected "x" but got "y"` | `unset ESBUILD_BINARY_PATH`, delete `node_modules` + `package-lock.json`, `npm cache clean --force`, reinstall. Avoid running from `Downloads`/OneDrive. |
| AI explanation shows a fallback message | Check the backend terminal for `[gemini] request failed` — usually an invalid/missing `GEMINI_API_KEY`. Keys from aistudio.google.com work (formats `AIza…` or `AQ.…`). |
| Extension changes don't take effect | Reload the extension in `chrome://extensions` (⟳). Unpacked extensions reload from the same folder, so edit the folder you actually loaded. |

---

## Notes
- Keep `backend/.env` **out of Git** (it's in `.gitignore`). If secrets ever get pushed, rotate them.
- For deploying your own hosted copy (Render + Vercel), see **DEPLOY.md**.
