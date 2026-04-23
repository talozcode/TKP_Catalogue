import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CatalogueItem, ColumnsVisibility, ExportMode, Product } from './types';
import { applyDiscount, formatMoney } from './format';

type ExportArgs = {
  catalogueName: string;
  notes: string;
  items: CatalogueItem[];
  productByKey: Map<string, Product>;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  columns: ColumnsVisibility;
  exportMode: ExportMode;
};

export function exportToPdf(args: ExportArgs) {
  const { catalogueName, notes, items, productByKey, defaultDiscountPercent, showDiscountColumn, columns, exportMode } = args;
  const isCustomer = exportMode === 'customer';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(18);
  doc.text(catalogueName || 'Catalogue', 40, 40);
  if (notes) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(notes, 40, 58);
    doc.setTextColor(0);
  }
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 40, 74);

  const head: string[] = [];
  if (columns.internalReference && !isCustomer) head.push('Ref');
  if (columns.productName) head.push('Product');
  if (columns.barcode) head.push('Barcode');
  if (columns.category) head.push('Category');
  if (columns.tags && !isCustomer) head.push('Tags');
  if (columns.salesPrice) head.push('Price');
  if (columns.wholesalePrice && !isCustomer) head.push('Wholesale');
  if (showDiscountColumn) head.push('Disc %');
  if (showDiscountColumn) head.push('Final');
  if (columns.note) head.push('Note');

  const body = items.map((it) => {
    const p = productByKey.get(it.productKey);
    if (!p) return [];
    const final = applyDiscount(p.salesPrice, defaultDiscountPercent, it.excludedFromDiscount);
    const row: string[] = [];
    if (columns.internalReference && !isCustomer) row.push(p.internalReference);
    if (columns.productName) row.push(p.productName);
    if (columns.barcode) row.push(p.barcode);
    if (columns.category) row.push(p.productCategory);
    if (columns.tags && !isCustomer) row.push(p.tags.join(', '));
    if (columns.salesPrice) row.push(formatMoney(p.salesPrice));
    if (columns.wholesalePrice && !isCustomer) row.push(formatMoney(p.wholesalePrice));
    if (showDiscountColumn) row.push(it.excludedFromDiscount ? '—' : `${defaultDiscountPercent}%`);
    if (showDiscountColumn) row.push(formatMoney(final));
    if (columns.note) row.push(it.customNote);
    return row;
  });

  autoTable(doc, {
    head: [head],
    body,
    startY: 90,
    styles:    { fontSize: 9, cellPadding: 4 },
    headStyles:{ fillColor: [15, 23, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin:    { left: 40, right: 40 }
  });

  const safeName = (catalogueName || 'catalogue').replace(/[^a-z0-9-_]+/gi, '_');
  doc.save(`${safeName}.pdf`);
}
