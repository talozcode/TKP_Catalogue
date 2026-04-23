'use client';
import { formatDate } from '@/lib/format';

const LOGO_URL =
  'https://res.cloudinary.com/dakhwegyt/image/upload/v1776678465/kp-primary_4x_totp25.png';

type Props = { lastSyncedAt: string | null; productCount: number };

export function Header({ lastSyncedAt, productCount }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_URL}
            alt="The Kosher Place"
            className="h-10 w-auto md:h-12"
          />
          <div className="hidden border-l border-line pl-4 sm:block">
            <div className="font-serif text-xl font-semibold leading-tight text-brand">
              Catalogue
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold">
              Build · Preview · Export
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <div className="text-sm font-semibold text-ink">
            {productCount.toLocaleString()} <span className="text-muted">products</span>
          </div>
          {lastSyncedAt ? (
            <div>Last sync {formatDate(lastSyncedAt)}</div>
          ) : (
            <div className="text-muted">Sheet not yet synced</div>
          )}
        </div>
      </div>
    </header>
  );
}
