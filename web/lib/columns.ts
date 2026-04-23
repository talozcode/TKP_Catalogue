import type {
  CatalogueItem,
  ColumnsVisibility,
  ExportMode,
  Product
} from './types';
import { applyDiscount, formatMoney } from './format';

export type ColumnId =
  | 'image'
  | 'internalReference'
  | 'productName'
  | 'barcode'
  | 'uom'
  | 'packaging'
  | 'category'
  | 'tags'
  | 'salesPrice'
  | 'wholesalePrice'
  | 'discount'
  | 'finalPrice'
  | 'note';

export type ResolvedColumn = {
  id: ColumnId;
  label: string;
  align: 'left' | 'right' | 'center';
  pdfWidth?: number;
};

const ALL: ResolvedColumn[] = [
  { id: 'image',             label: 'Image',     align: 'center', pdfWidth: 56 },
  { id: 'internalReference', label: 'Ref',       align: 'left',   pdfWidth: 60 },
  { id: 'productName',       label: 'Product',   align: 'left' },
  { id: 'barcode',           label: 'Barcode',   align: 'left',   pdfWidth: 90 },
  { id: 'uom',               label: 'UOM',       align: 'left',   pdfWidth: 50 },
  { id: 'packaging',         label: 'Packaging', align: 'left',   pdfWidth: 80 },
  { id: 'category',          label: 'Category',  align: 'left',   pdfWidth: 90 },
  { id: 'tags',              label: 'Tags',      align: 'left' },
  { id: 'salesPrice',        label: 'Price',     align: 'right',  pdfWidth: 60 },
  { id: 'wholesalePrice',    label: 'Wholesale', align: 'right',  pdfWidth: 70 },
  { id: 'discount',          label: 'Disc %',    align: 'right',  pdfWidth: 50 },
  { id: 'finalPrice',        label: 'Final',     align: 'right',  pdfWidth: 60 },
  { id: 'note',              label: 'Note',      align: 'left' }
];

const HIDDEN_FROM_CUSTOMER: ColumnId[] = [
  'internalReference',
  'tags',
  'wholesalePrice'
];

export function resolveColumns(opts: {
  columns: ColumnsVisibility;
  showDiscountColumn: boolean;
  exportMode: ExportMode;
}): ResolvedColumn[] {
  const isCustomer = opts.exportMode === 'customer';
  return ALL.filter((c) => {
    if (c.id === 'discount' || c.id === 'finalPrice') {
      return opts.showDiscountColumn;
    }
    if (!opts.columns[c.id]) return false;
    if (isCustomer && HIDDEN_FROM_CUSTOMER.includes(c.id)) return false;
    return true;
  });
}

export type CellContext = {
  product: Product | undefined;
  item: CatalogueItem;
  defaultDiscountPercent: number;
};

export function cellText(col: ColumnId, ctx: CellContext): string {
  const { product: p, item: it, defaultDiscountPercent } = ctx;
  if (!p) return col === 'productName' ? `Missing: ${it.productKey}` : '';
  switch (col) {
    case 'image':             return p.imageUrl || '';
    case 'internalReference': return p.internalReference;
    case 'productName':       return p.productName;
    case 'barcode':           return p.barcode;
    case 'uom':               return p.uom;
    case 'packaging':         return p.packaging;
    case 'category':          return p.productCategory;
    case 'tags':              return p.tags.join(', ');
    case 'salesPrice':        return formatMoney(p.salesPrice);
    case 'wholesalePrice':    return formatMoney(p.wholesalePrice);
    case 'discount':          return it.excludedFromDiscount ? '—' : `${defaultDiscountPercent}%`;
    case 'finalPrice':        return formatMoney(applyDiscount(p.salesPrice, defaultDiscountPercent, it.excludedFromDiscount));
    case 'note':              return it.customNote;
  }
}

export function cellRaw(col: ColumnId, ctx: CellContext): string | number | null {
  const { product: p, item: it, defaultDiscountPercent } = ctx;
  if (!p) return col === 'productName' ? `Missing: ${it.productKey}` : '';
  switch (col) {
    case 'salesPrice':     return p.salesPrice ?? '';
    case 'wholesalePrice': return p.wholesalePrice ?? '';
    case 'discount':       return it.excludedFromDiscount ? 0 : defaultDiscountPercent;
    case 'finalPrice':     return applyDiscount(p.salesPrice, defaultDiscountPercent, it.excludedFromDiscount) ?? '';
    default:               return cellText(col, ctx);
  }
}
