// Shared types — these mirror the shapes returned by the Apps Script backend.
// Keep them in sync with apps-script/Products.gs and apps-script/Catalogues.gs.

export type Product = {
  internalReference: string;
  productName: string;
  productNameHe: string;
  barcode: string;
  uom: string;
  packaging: string;
  packagingUom: string;
  packagingBarcode: string;
  dateCreated: string;
  tags: string[];
  productCategory: string;
  ecommerceCategory: string;
  salesPrice: number | null;
  wholesalePrice: number | null;
  imageUrl: string;
};

export type GetProductsResponse = {
  products: Product[];
  lastSyncedAt: string | null;
  count: number;
};

export type CatalogueSummary = {
  catalogueId: string;
  catalogueName: string;
  notes: string;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  exportMode: ExportMode;
  createdAt: string;
  updatedAt: string;
};

export type AddedBySource = 'search' | 'category' | 'tag' | 'manual';

export type CatalogueItem = {
  productKey: string;            // Internal Reference
  selectedOrder: number;
  excludedFromDiscount: boolean;
  customNote: string;
  manuallyRemoved: boolean;
  addedBySource: AddedBySource;
};

export type CatalogueSource = {
  sourceType: 'category' | 'tag';
  sourceValue: string;
};

export type ExportMode = 'customer' | 'compact';

export type ColumnKey =
  | 'image'
  | 'internalReference'
  | 'productName'
  | 'productNameHe'
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

export type ColumnsVisibility = Partial<Record<ColumnKey, boolean>>;

export type Catalogue = {
  catalogueId: string;
  catalogueName: string;
  notes: string;
  titleDate: string;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  exportMode: ExportMode;
  columnsVisibility: ColumnsVisibility;
  columnsOrder: ColumnKey[];
  createdAt: string;
  updatedAt: string;
};

export type LoadCatalogueResponse = {
  catalogue: Catalogue;
  items: CatalogueItem[];
  sources: CatalogueSource[];
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
