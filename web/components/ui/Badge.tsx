import clsx from 'clsx';
import { ReactNode } from 'react';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warn' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'accent'  && 'bg-accent/10 text-accent',
        tone === 'warn'    && 'bg-amber-100 text-amber-800',
        tone === 'neutral' && 'bg-slate-100 text-slate-700'
      )}
    >
      {children}
    </span>
  );
}
