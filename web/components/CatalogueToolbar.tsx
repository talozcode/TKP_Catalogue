'use client';
import { Trash2, Save, FolderOpen, Copy, FileSpreadsheet, FileText, Eye, Settings2 } from 'lucide-react';
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

export function CatalogueToolbar({ onClear, onSave, onLoad, onExportXlsx, onExportPdf, itemCount }: Props) {
  const name           = useCatalogue((s) => s.catalogueName);
  const notes          = useCatalogue((s) => s.notes);
  const discountPct    = useCatalogue((s) => s.defaultDiscountPercent);
  const showDiscount   = useCatalogue((s) => s.showDiscountColumn);
  const exportMode     = useCatalogue((s) => s.exportMode);
  const columns        = useCatalogue((s) => s.columnsVisibility);
  const setMeta        = useCatalogue((s) => s.setMeta);
  const toggleColumn   = useCatalogue((s) => s.toggleColumn);
  const items          = useCatalogue(visibleItems);

  const [showColumns, setShowColumns] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={name}
          onChange={(e) => setMeta({ catalogueName: e.target.value })}
          placeholder="Catalogue name"
          className="flex-1 font-medium"
        />
        <span className="whitespace-nowrap text-xs text-muted">{items.length} items</span>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setMeta({ notes: e.target.value })}
        placeholder="Notes (shown on PDF export)…"
        rows={2}
        className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex items-center gap-2 text-xs text-muted">
          Discount %
          <input
            type="number"
            min={0}
            max={100}
            value={discountPct}
            onChange={(e) => setMeta({ defaultDiscountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            className="h-8 w-20 rounded border border-line px-2 text-sm text-ink"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showDiscount}
            onChange={(e) => setMeta({ showDiscountColumn: e.target.checked })}
          />
          Show discount column
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          Mode
          <select
            value={exportMode}
            onChange={(e) => setMeta({ exportMode: e.target.value as ExportMode })}
            className="h-8 rounded border border-line bg-white px-2 text-sm text-ink"
          >
            <option value="customer">Customer</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <Button size="sm" variant="ghost" onClick={() => setShowColumns(true)}>
          <Eye size={14} /> Columns
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Button size="sm" variant="primary" onClick={onSave}><Save size={14} /> Save</Button>
        <Button size="sm" onClick={onLoad}><FolderOpen size={14} /> Load</Button>
        <Button size="sm" onClick={onExportXlsx} disabled={!itemCount}><FileSpreadsheet size={14} /> XLSX</Button>
        <Button size="sm" onClick={onExportPdf} disabled={!itemCount}><FileText size={14} /> PDF</Button>
        <Button size="sm" variant="danger" onClick={onClear} disabled={!itemCount}><Trash2 size={14} /> Clear</Button>
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
