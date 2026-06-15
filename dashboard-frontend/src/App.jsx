import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import SubmissionDetail from './pages/SubmissionDetail.jsx';
import Login from './pages/Login.jsx';
import { isAuthed, clearToken } from './lib/api';
import { Button } from './components/ui';

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-ac font-mono text-sm font-bold text-ink-900">
        G
      </span>
      <span className="text-sm font-semibold tracking-tight text-slate-100">
        GitSolve <span className="text-ac">AI</span>
      </span>
    </Link>
  );
}

function TopBar() {
  function logout() {
    clearToken();
    window.location.assign('/login');
  }
  return (
    <header className="sticky top-0 z-20 border-b border-ink-600/80 bg-ink-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Brand />
        <nav className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted hover:text-slate-200"
          >
            Solutions repo
          </a>
          <Button variant="danger" className="px-3 py-1.5" onClick={logout}>
            Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/submissions/:id"
        element={
          <RequireAuth>
            <SubmissionDetail />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
