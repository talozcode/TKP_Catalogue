'use client';
import { ImageOff } from 'lucide-react';
import clsx from 'clsx';
import type { CatalogueItem, ColumnKey, ColumnsVisibility, ExportMode, Product } from '@/lib/types';
import { resolveColumns, cellText } from '@/lib/columns';
import { displayCatalogueName } from '@/lib/catalogue-name';

type Props = {
  catalogueName: string;
  titleDate: string;
  notes: string;
  items: CatalogueItem[];
  productByKey: Map<string, Product>;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  columns: ColumnsVisibility;
  columnsOrder: ColumnKey[];
  exportMode: ExportMode;
};

export function CataloguePreview({
  catalogueName,
  titleDate,
  notes,
  items,
  productByKey,
  defaultDiscountPercent,
  showDiscountColumn,
  columns,
  columnsOrder,
  exportMode
}: Props) {
  const cols = resolveColumns({ columns, showDiscountColumn, exportMode, order: columnsOrder });

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        Add products in the Build tab to see a preview here.
      </div>
    );
  }
  if (!cols.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        No columns selected. Open <span className="text-ink">Edit columns</span> on
        the toolbar to choose what to show.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      {/* Mock document header */}
      <div className="border-b-4 border-brand bg-gradient-to-r from-brandSoft/40 to-goldSoft/30 px-5 py-4">
        <div className="font-serif text-xl font-semibold text-brand">
          {displayCatalogueName(catalogueName, titleDate)}
        </div>
        {notes ? (
          <div className="mt-1 max-w-2xl text-sm leading-snug text-ink/70">
            {notes}
          </div>
        ) : null}
        {showDiscountColumn && defaultDiscountPercent > 0 ? (
          <div className="mt-2 text-[11px] uppercase tracking-wider text-gold">
            {defaultDiscountPercent}% discount
          </div>
        ) : null}
      </div>

      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand text-left text-white">
              {cols.map((c) => (
                <th
                  key={c.id}
                  className={clsx(
                    'px-3 py-2 text-[11px] font-semibold uppercase tracking-wider',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center'
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const product = productByKey.get(it.productKey);
              return (
                <tr
                  key={it.productKey}
                  className={clsx(
                    'border-t border-line',
                    idx % 2 === 0 ? 'bg-white' : 'bg-bg/60'
                  )}
                >
                  {cols.map((c) => {
                    if (c.id === 'image') {
                      return (
                        <td key={c.id} className="px-2 py-1.5 align-middle">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-bg">
                            {product?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <ImageOff size={14} className="text-line" />
                            )}
                          </div>
                        </td>
                      );
                    }
                    const text = cellText(c.id, {
                      product,
                      item: it,
                      defaultDiscountPercent
                    });
                    return (
                      <td
                        key={c.id}
                        className={clsx(
                          'px-3 py-2 align-middle',
                          c.align === 'right' && 'text-right tabular-nums',
                          c.align === 'center' && 'text-center',
                          c.id === 'productName' && 'font-medium text-ink'
                        )}
                      >
                        {text || <span className="text-line">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
