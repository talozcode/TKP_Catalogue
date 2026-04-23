'use client';
import { Copy, FolderOpen, Trash2 } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import type { CatalogueSummary } from '@/lib/types';
import { formatDate } from '@/lib/format';

type Props = {
  open: boolean;
  loading: boolean;
  catalogues: CatalogueSummary[];
  onClose: () => void;
  onLoad: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function LoadCatalogueDialog({ open, loading, catalogues, onClose, onLoad, onDuplicate, onDelete }: Props) {
  return (
    <Dialog open={open} title="Load catalogue" onClose={onClose} width="max-w-2xl">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Loading…</div>
      ) : !catalogues.length ? (
        <div className="rounded border border-dashed border-line p-6 text-center text-sm text-muted">
          No saved catalogues yet.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {catalogues.map((c) => (
            <li key={c.catalogueId} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.catalogueName}</div>
                <div className="text-xs text-muted">
                  Updated {formatDate(c.updatedAt)} · {c.exportMode}
                  {c.defaultDiscountPercent ? ` · ${c.defaultDiscountPercent}% discount` : ''}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => onLoad(c.catalogueId)}><FolderOpen size={14} /> Load</Button>
                <Button size="sm" variant="ghost" onClick={() => onDuplicate(c.catalogueId)}><Copy size={14} /></Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { if (confirm(`Delete "${c.catalogueName}"? This cannot be undone.`)) onDelete(c.catalogueId); }}
                >
                  <Trash2 size={14} className="text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
