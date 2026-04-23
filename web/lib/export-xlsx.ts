import * as XLSX from 'xlsx';
import type { CatalogueItem, ColumnsVisibility, ExportMode, Product } from './types';
import { applyDiscount, formatMoney } from './format';

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
  const { catalogueName, items, productByKey, defaultDiscountPercent, showDiscountColumn, columns, exportMode } = args;

  // Customer-facing mode hides internal-only columns; compact shows everything compactly.
  const isCustomer = exportMode === 'customer';

  const headers: string[] = [];
  if (columns.internalReference && !isCustomer) headers.push('Ref');
  if (columns.productName) headers.push('Product');
  if (columns.barcode) headers.push('Barcode');
  if (columns.uom) headers.push('UOM');
  if (columns.packaging) headers.push('Packaging');
  if (columns.category) headers.push('Category');
  if (columns.tags && !isCustomer) headers.push('Tags');
  if (columns.salesPrice) headers.push('Sales price');
  if (columns.wholesalePrice && !isCustomer) headers.push('Wholesale');
  if (showDiscountColumn) headers.push('Discount %');
  if (showDiscountColumn) headers.push('Final price');
  if (columns.note) headers.push('Note');

  const rows: (string | number)[][] = items.map((it) => {
    const p = productByKey.get(it.productKey);
    if (!p) return [];
    const final = applyDiscount(p.salesPrice, defaultDiscountPercent, it.excludedFromDiscount);
    const row: (string | number)[] = [];
    if (columns.internalReference && !isCustomer) row.push(p.internalReference);
    if (columns.productName) row.push(p.productName);
    if (columns.barcode) row.push(p.barcode);
    if (columns.uom) row.push(p.uom);
    if (columns.packaging) row.push(p.packaging);
    if (columns.category) row.push(p.productCategory);
    if (columns.tags && !isCustomer) row.push(p.tags.join(', '));
    if (columns.salesPrice) row.push(p.salesPrice ?? '');
    if (columns.wholesalePrice && !isCustomer) row.push(p.wholesalePrice ?? '');
    if (showDiscountColumn) row.push(it.excludedFromDiscount ? 0 : defaultDiscountPercent);
    if (showDiscountColumn) row.push(final ?? '');
    if (columns.note) row.push(it.customNote);
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Reasonable default widths.
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 4) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catalogue');
  const safeName = catalogueName.replace(/[^a-z0-9-_]+/gi, '_');
  XLSX.writeFile(wb, `${safeName}.xlsx`);
}

// formatMoney is re-exported so the PDF exporter can use the same currency formatting.
export { formatMoney };
