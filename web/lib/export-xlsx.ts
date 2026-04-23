import * as XLSX from 'xlsx';
import type { CatalogueItem, ColumnsVisibility, ExportMode, Product } from './types';
import { resolveColumns, cellRaw } from './columns';

type ExportArgs = {
  catalogueName: string;
  items: CatalogueItem[];
  productByKey: Map<string, Product>;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  columns: ColumnsVisibility;
  exportMode: ExportMode;
};

export function exportToXlsx(args: ExportArgs) {
  const cols = resolveColumns({
    columns: args.columns,
    showDiscountColumn: args.showDiscountColumn,
    exportMode: args.exportMode
  }).filter((c) => c.id !== 'image');

  const headers = cols.map((c) => c.label);
  const rows = args.items.map((it) => {
    const product = args.productByKey.get(it.productKey);
    const ctx = {
      product,
      item: it,
      defaultDiscountPercent: args.defaultDiscountPercent
    };
    return cols.map((c) => cellRaw(c.id, ctx));
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 4) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catalogue');
  const safeName = (args.catalogueName || 'catalogue').replace(/[^a-z0-9-_]+/gi, '_');
  XLSX.writeFile(wb, `${safeName}.xlsx`);
}
