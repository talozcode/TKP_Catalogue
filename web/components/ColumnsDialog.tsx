'use client';
import { Dialog } from './ui/Dialog';
import type { ColumnKey, ColumnsVisibility } from '@/lib/types';

const LABELS: Record<ColumnKey, string> = {
  image: 'Image',
  internalReference: 'Internal Reference',
  productName: 'Product Name',
  barcode: 'Barcode',
  uom: 'UOM',
  packaging: 'Packaging',
  category: 'Category',
  tags: 'Tags',
  salesPrice: 'Sales price',
  wholesalePrice: 'Wholesale price',
  discount: 'Discount %',
  finalPrice: 'Final price',
  note: 'Note'
};

type Props = {
  open: boolean;
  onClose: () => void;
  columns: ColumnsVisibility;
  onToggle: (k: ColumnKey) => void;
};

export function ColumnsDialog({ open, onClose, columns, onToggle }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Visible columns">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(LABELS) as ColumnKey[]).map((k) => (
          <label key={k} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={!!columns[k]}
              onChange={() => onToggle(k)}
            />
            {LABELS[k]}
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Affects exports. Discount % and Final price also need the
        <em> Show discount column</em> toggle to be on.
      </p>
    </Dialog>
  );
}
