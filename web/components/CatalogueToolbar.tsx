'use client';
import {
  Trash2,
  Save,
  FolderOpen,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  Percent
} from 'lucide-react';
import { useState } from 'react';
import { useCatalogue, visibleItems } from '@/lib/store';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ColumnsDialog } from './ColumnsDialog';
import type { ColumnsVisibility, ExportMode } from '@/lib/types';

type Props = {
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportXlsx: () => void;
  onExportPdf: () => void;
  itemCount: number;
};

export function CatalogueToolbar({
  onClear,
  onSave,
  onLoad,
  onExportXlsx,
  onExportPdf,
  itemCount
}: Props) {
  const name         = useCatalogue((s) => s.catalogueName);
  const notes        = useCatalogue((s) => s.notes);
  const discountPct  = useCatalogue((s) => s.defaultDiscountPercent);
  const showDiscount = useCatalogue((s) => s.showDiscountColumn);
  const exportMode   = useCatalogue((s) => s.exportMode);
  const columns      = useCatalogue((s) => s.columnsVisibility);
  const setMeta      = useCatalogue((s) => s.setMeta);
  const toggleColumn = useCatalogue((s) => s.toggleColumn);
  const items        = useCatalogue(visibleItems);

  const [showColumns, setShowColumns] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      {/* Header strip */}
      <div className="border-b border-line bg-gradient-to-r from-brandSoft/60 to-goldSoft/30 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Input
            value={name}
            onChange={(e) => setMeta({ catalogueName: e.target.value })}
            placeholder="Catalogue name"
            className="h-10 flex-1 border-transparent bg-white/80 text-base font-semibold focus:bg-white"
          />
          <div className="whitespace-nowrap rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-brand">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setMeta({ notes: e.target.value })}
          placeholder="Notes (shown on PDF export)…"
          rows={2}
          className="mt-2 w-full resize-none rounded-md border border-transparent bg-white/70 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:bg-white focus:outline-none"
        />
      </div>

      {/* Settings row */}
      <div className="grid grid-cols-1 gap-3 border-b border-line px-4 py-3 sm:grid-cols-3">
        <Field label="Discount %" htmlFor="t-discount">
          <div className="relative">
            <Percent
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="t-discount"
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={(e) =>
                setMeta({
                  defaultDiscountPercent: Math.max(
                    0,
                    Math.min(100, Number(e.target.value) || 0)
                  )
                })
              }
              className="h-9 w-full rounded-md border border-line bg-white pl-3 pr-7 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <label className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={showDiscount}
              onChange={(e) => setMeta({ showDiscountColumn: e.target.checked })}
              className="h-3 w-3 accent-brand"
            />
            Show discount column
          </label>
        </Field>

        <Field label="Export mode" htmlFor="t-mode">
          <select
            id="t-mode"
            value={exportMode}
            onChange={(e) => setMeta({ exportMode: e.target.value as ExportMode })}
            className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="customer">Customer (clean)</option>
            <option value="compact">Compact (all columns)</option>
          </select>
          <div className="mt-1 text-[11px] text-muted">
            {exportMode === 'customer'
              ? 'Hides Ref / Wholesale / Tags.'
              : 'Shows everything you enable.'}
          </div>
        </Field>

        <Field label="Columns" htmlFor="t-columns">
          <Button
            id="t-columns"
            size="sm"
            variant="secondary"
            onClick={() => setShowColumns(true)}
            className="h-9 w-full"
          >
            <SlidersHorizontal size={14} /> Edit columns
          </Button>
          <div className="mt-1 truncate text-[11px] text-muted">
            {countActive(columns, showDiscount)} active
          </div>
        </Field>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={onSave}>
            <Save size={14} /> Save
          </Button>
          <Button size="sm" variant="secondary" onClick={onLoad}>
            <FolderOpen size={14} /> Load
          </Button>
          <Button
            size="sm"
            variant="gold"
            onClick={onExportXlsx}
            disabled={!itemCount}
          >
            <FileSpreadsheet size={14} /> XLSX
          </Button>
          <Button
            size="sm"
            variant="gold"
            onClick={onExportPdf}
            disabled={!itemCount}
          >
            <FileText size={14} /> PDF
          </Button>
        </div>
        <Button
          size="sm"
          variant="danger"
          onClick={onClear}
          disabled={!itemCount}
        >
          <Trash2 size={14} /> Clear
        </Button>
      </div>

      <ColumnsDialog
        open={showColumns}
        onClose={() => setShowColumns(false)}
        columns={columns}
        onToggle={(k: keyof ColumnsVisibility) => toggleColumn(k)}
      />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function countActive(cv: ColumnsVisibility, showDiscount: boolean): number {
  let n = 0;
  for (const v of Object.values(cv)) if (v) n++;
  if (showDiscount) n += 2; // discount + finalPrice
  return n;
}
