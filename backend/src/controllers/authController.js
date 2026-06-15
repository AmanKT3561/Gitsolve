'use strict';
const { signToken } = require('../utils/jwt');

/**
 * Final handler of the OAuth callback. By the time we are here, passport has
 * populated req.user. We mint a JWT and bounce the browser to the same
 * /auth/success path but with the token in the URL *fragment* (#token=...).
 *
 * The fragment is never sent to the server, so the subsequent GET /auth/success
 * has no ?code and simply serves the static success page. The Chrome extension
 * watches the tab URL for "/auth/success#token=" and lifts the token out.
 */
function oauthCallback(req, res) {
  const token = signToken(req.user);
  return res.redirect(`/auth/success#token=${encodeURIComponent(token)}`);
}

function buildSuccessHtml(frontendOrigin) {
  const targetOrigin = JSON.stringify(frontendOrigin || '*');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GitSolve AI — Connected</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      display:grid; place-items:center; min-height:100vh; background:#0b1020; color:#e8ecf5; }
    .card { text-align:center; padding:40px 48px; border-radius:16px; background:#141a2e;
      box-shadow:0 20px 60px rgba(0,0,0,.45); max-width:420px; }
    .tick { width:64px;height:64px;border-radius:50%;display:grid;place-items:center;margin:0 auto 18px;
      background:#16331f;color:#37d67a;font-size:34px; }
    h1 { font-size:20px; margin:0 0 8px; }
    p { margin:0; color:#9aa6c4; font-size:14px; line-height:1.5; }
    code { background:#0b1020; padding:2px 6px; border-radius:6px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="tick">&#10003;</div>
    <h1>GitHub connected</h1>
    <p>You can close this tab and return to GitSolve AI. Your token has been captured automatically.</p>
  </div>
  <script>
    (function () {
      try {
        var m = location.hash.match(/token=([^&]+)/);
        if (!m) return;
        var token = decodeURIComponent(m[1]);
        // 1) Extension tab-watcher reads the URL hash directly (no JS needed),
        //    but we also expose it on window.name as a belt-and-suspenders.
        window.name = 'gitsolve_token:' + token;
        // 2) Dashboard login flow opens this page as a popup; hand the token
        //    back to the opener window, then close.
        if (window.opener) {
          window.opener.postMessage({ source: 'gitsolve', token: token }, ${targetOrigin});
          setTimeout(function () { window.close(); }, 400);
        }
      } catch (e) {}
    })();
  </script>
</body>
</html>`;
}

function successPage(_req, res) {
  const html = buildSuccessHtml(process.env.FRONTEND_URL);
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
}

function failure(_req, res) {
  res.status(401).send('<h1>GitHub authentication failed.</h1><p>Please try again.</p>');
}

module.exports = { oauthCallback, successPage, failure };
