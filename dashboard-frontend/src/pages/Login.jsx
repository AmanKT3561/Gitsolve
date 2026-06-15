import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGithubPopup, isAuthed } from '../lib/api';
import { Button, Card } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (isAuthed()) {
    navigate('/', { replace: true });
  }

  async function connect() {
    setBusy(true);
    setError('');
    try {
      await loginWithGithubPopup();
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-ac font-mono text-xl font-bold text-ink-900">
            G
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            GitSolve <span className="text-ac">AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your accepted solutions, archived to GitHub and explained — automatically.
          </p>
        </div>

        <Card className="p-6">
          <p className="text-sm text-slate-300">
            Sign in with the same GitHub account your browser extension uses. This dashboard reads the
            solutions and statistics that the extension has already captured.
          </p>

          <Button className="mt-5 w-full" onClick={connect} disabled={busy}>
            {busy ? 'Waiting for GitHub…' : 'Connect GitHub'}
          </Button>

          {error && <p className="mt-3 text-center text-xs text-wa">{error}</p>}

          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            A popup will open for GitHub authorization. Allow popups if nothing appears.
          </p>
        </Card>

        <p className="mt-6 text-center text-[11px] text-faint">
          Backend expected at <span className="mono text-muted">https://gitsolve-1.onrender.com</span>
        </p>
      </div>
    </div>
  );
}
