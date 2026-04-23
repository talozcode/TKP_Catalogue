'use client';
import { Dialog } from './ui/Dialog';
import type { ColumnKey, ColumnsVisibility } from '@/lib/types';

const GROUPS: Array<{ title: string; cols: ColumnKey[] }> = [
  {
    title: 'Identification',
    cols: ['image', 'internalReference', 'productName', 'barcode']
  },
  {
    title: 'Packaging & classification',
    cols: ['uom', 'packaging', 'category', 'tags']
  },
  {
    title: 'Pricing',
    cols: ['salesPrice', 'wholesalePrice', 'discount', 'finalPrice']
  },
  {
    title: 'Custom',
    cols: ['note']
  }
];

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
    <Dialog open={open} onClose={onClose} title="Visible columns" width="max-w-xl">
      <p className="mb-4 text-sm text-muted">
        Pick what shows in the preview and exports. Discount % and Final price
        also need the <em className="text-ink">Show discount column</em> toggle on
        the toolbar.
      </p>
      <div className="space-y-4">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gold">
              {g.title}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {g.cols.map((k) => (
                <label
                  key={k}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-line hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={!!columns[k]}
                    onChange={() => onToggle(k)}
                    className="h-4 w-4 accent-brand"
                  />
                  {LABELS[k]}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
