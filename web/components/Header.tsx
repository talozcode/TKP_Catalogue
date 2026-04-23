'use client';
import { formatDate } from '@/lib/format';

type Props = { lastSyncedAt: string | null; productCount: number };

export function Header({ lastSyncedAt, productCount }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-ink" />
          <div>
            <div className="text-sm font-semibold leading-tight">Product Catalogue</div>
            <div className="text-xs text-muted">
              {productCount.toLocaleString()} products
              {lastSyncedAt ? <> · last sync {formatDate(lastSyncedAt)}</> : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
