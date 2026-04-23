import clsx from 'clsx';
import { ReactNode } from 'react';

export function Badge({
  children,
  tone = 'neutral'
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'gold' | 'warn' | 'accent';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'neutral' && 'bg-line/60 text-ink/80',
        tone === 'brand' && 'bg-brandSoft text-brand',
        tone === 'accent' && 'bg-brandSoft text-brand',
        tone === 'gold' && 'bg-goldSoft text-goldDeep',
        tone === 'warn' && 'bg-amber-100 text-amber-800'
      )}
    >
      {children}
    </span>
  );
}
