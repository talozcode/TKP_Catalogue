'use client';
import { RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from './ui/Button';
import { formatDate } from '@/lib/format';
import { toast } from './ui/Toast';

type Props = { lastSyncedAt: string | null; productCount: number };

export function Header({ lastSyncedAt, productCount }: Props) {
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => api.refreshProductsFromOdoo(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Products refreshed from Odoo');
    },
    onError: (e: Error) => toast.error(e.message)
  });

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
        <Button size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <RefreshCw size={14} className={refresh.isPending ? 'animate-spin' : ''} />
          {refresh.isPending ? 'Refreshing…' : 'Refresh from Odoo'}
        </Button>
      </div>
    </header>
  );
}
