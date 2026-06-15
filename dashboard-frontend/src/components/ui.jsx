import React from 'react';
import { cn } from '../lib/utils';

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ink-600 bg-ink-700/80 shadow-card backdrop-blur-sm',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('px-5 pt-4 pb-2', className)}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('text-sm font-semibold tracking-wide text-slate-200', className)}>{children}</h3>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}

export function Button({ variant = 'solid', className, children, ...rest }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ac/60 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    solid: 'bg-ac text-ink-900 hover:bg-[#2fc06d]',
    ghost: 'bg-transparent text-slate-200 hover:bg-ink-600',
    outline: 'border border-ink-500 text-slate-200 hover:border-ac/50 hover:text-ac',
    danger: 'bg-transparent text-wa hover:bg-wa/10 border border-wa/30',
  };
  return (
    <button className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function Badge({ color = '#8c98b8', children, className, mono = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        mono && 'font-mono',
        className
      )}
      style={{
        color,
        backgroundColor: `${color}1a`,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}

export function Dot({ color = '#8c98b8', className }) {
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', className)}
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}99` }}
    />
  );
}

export function Spinner({ className }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink-500 border-t-ac',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Empty({ title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-600 py-14 text-center">
      <div className="mono text-2xl text-faint">{'{ }'}</div>
      <p className="mt-3 text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-wa/30 bg-wa/5 py-12 text-center">
      <Dot color="#ff5d6c" />
      <p className="mt-3 text-sm font-medium text-slate-200">Something went wrong</p>
      <p className="mt-1 max-w-md text-xs text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
