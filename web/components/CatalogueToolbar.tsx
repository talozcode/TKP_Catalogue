'use client';
import {
  Trash2,
  Save,
  FolderOpen,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  Percent,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { useCatalogue, visibleItems } from '@/lib/store';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ColumnsDialog } from './ColumnsDialog';
import type { ColumnKey, ColumnsVisibility, ExportMode } from '@/lib/types';
import { displayCatalogueName, isUnnamed } from '@/lib/catalogue-name';

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
  const name           = useCatalogue((s) => s.catalogueName);
  const notes          = useCatalogue((s) => s.notes);
  const discountPct    = useCatalogue((s) => s.defaultDiscountPercent);
  const showDiscount   = useCatalogue((s) => s.showDiscountColumn);
  const exportMode     = useCatalogue((s) => s.exportMode);
  const columns        = useCatalogue((s) => s.columnsVisibility);
  const columnsOrder   = useCatalogue((s) => s.columnsOrder);
  const setMeta        = useCatalogue((s) => s.setMeta);
  const toggleColumn   = useCatalogue((s) => s.toggleColumn);
  const setColumnsOrder= useCatalogue((s) => s.setColumnsOrder);
  const moveColumn     = useCatalogue((s) => s.moveColumn);
  const items          = useCatalogue(visibleItems);

  const [showColumns, setShowColumns] = useState(false);
  const unnamed = isUnnamed(name);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      {/* Header strip */}
      <section className="border-b border-line bg-gradient-to-r from-brandSoft/60 to-goldSoft/30 px-4 py-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand/80">
            Catalogue
          </div>
          <div className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand shadow-sm">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </div>
        </div>
        <Input
          value={name}
          onChange={(e) => setMeta({ catalogueName: e.target.value })}
          placeholder="Optional name (used when saving and exporting)"
          className="h-10 border-transparent bg-white/90 text-base font-semibold focus:bg-white"
        />
        {unnamed ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
            <Sparkles size={11} className="text-gold" />
            Will export as{' '}
            <span className="font-medium text-ink">{displayCatalogueName('')}</span>
          </div>
        ) : null}
      </section>

      {/* Notes */}
      <section className="border-b border-line px-4 py-3">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setMeta({ notes: e.target.value })}
          placeholder="Optional notes — appear on PDF export only."
          rows={2}
          className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </section>

      {/* Document settings */}
      <section className="border-b border-line bg-bg/40 px-4 py-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Document settings
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </Field>

          <Field label="Columns" htmlFor="t-columns">
            <Button
              id="t-columns"
              size="sm"
              variant="secondary"
              onClick={() => setShowColumns(true)}
              className="h-9 w-full justify-between"
            >
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal size={14} /> Order &amp; visibility
              </span>
              <span className="text-[11px] font-normal text-muted">
                {countActive(columns, showDiscount)} on
              </span>
            </Button>
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </Field>
          <Field label=" " htmlFor="t-show-discount">
            <label
              htmlFor="t-show-discount"
              className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 text-sm hover:border-brand/30"
            >
              <input
                id="t-show-discount"
                type="checkbox"
                checked={showDiscount}
                onChange={(e) => setMeta({ showDiscountColumn: e.target.checked })}
                className="h-4 w-4 accent-brand"
              />
              Show discount column
            </label>
          </Field>
        </div>
      </section>

      {/* Storage */}
      <section className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Storage
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={onSave}>
            <Save size={14} /> Save
          </Button>
          <Button size="sm" variant="secondary" onClick={onLoad}>
            <FolderOpen size={14} /> Load
          </Button>
        </div>
      </section>

      {/* Export */}
      <section className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Export
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            size="sm"
            variant="danger"
            onClick={onClear}
            disabled={!itemCount}
            title="Clear current catalogue"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </section>

      <ColumnsDialog
        open={showColumns}
        onClose={() => setShowColumns(false)}
        columns={columns}
        order={columnsOrder}
        showDiscountColumn={showDiscount}
        onToggle={(k: keyof ColumnsVisibility) => toggleColumn(k)}
        onReorder={(o: ColumnKey[]) => setColumnsOrder(o)}
        onMove={(f: number, t: number) => moveColumn(f, t)}
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
        {label === ' ' ? '\u00A0' : label}
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
