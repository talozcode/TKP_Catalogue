import {
  SHEETS,
  appendByHeaders,
  appendManyByHeaders,
  deleteRowsWhere,
  ensureSheet,
  getMetadataValue,
  newId,
  nowIso,
  num,
  readAll,
  splitTags,
  str,
  truthy,
  updateRowByHeaders
} from './sheets';
import type {
  Catalogue,
  CatalogueItem,
  CatalogueSource,
  CatalogueSummary,
  ColumnKey,
  ColumnsVisibility,
  ExportMode,
  GetProductsResponse,
  LoadCatalogueResponse,
  Product
} from './types';

const CATALOGUE_SCHEMA: Array<[string, string[]]> = [
  [
    SHEETS.CATALOGUES,
    [
      'catalogue_id',
      'catalogue_name',
      'notes',
      'default_discount_percent',
      'show_discount_column',
      'export_mode',
      'columns_visibility_json',
      'created_at',
      'updated_at'
    ]
  ],
  [
    SHEETS.ITEMS,
    [
      'catalogue_id',
      'product_key',
      'selected_order',
      'excluded_from_discount',
      'custom_note',
      'manually_removed',
      'added_by_source'
    ]
  ],
  [SHEETS.SOURCES, ['catalogue_id', 'source_type', 'source_value']]
];

async function ensureCatalogueSheets(): Promise<void> {
  for (const [name, headers] of CATALOGUE_SCHEMA) {
    await ensureSheet(name, headers);
  }
}

function mapProduct(r: Record<string, unknown>): Product {
  let dateCreated = r['Date Created'];
  if (dateCreated instanceof Date) dateCreated = dateCreated.toISOString();
  return {
    internalReference: str(r['Internal Reference']),
    productName: str(r['Product Name']),
    productNameHe: str(r['Product Name (Hebrew)']),
    barcode: str(r['Product Barcode']),
    uom: str(r['UOM']),
    packaging: str(r['Packaging']),
    packagingUom: str(r['Packaging UOM']),
    packagingBarcode: str(r['Packaging Barcode']),
    dateCreated: dateCreated ? String(dateCreated) : '',
    tags: splitTags(r['Product Tags']),
    productCategory: str(r['Product Category']),
    ecommerceCategory: str(r['Ecommerce Category']),
    salesPrice: num(r['Sales Price']),
    wholesalePrice: num(r['Wholesale Price']),
    imageUrl: str(r['Image URL'])
  };
}

export async function getProducts(): Promise<GetProductsResponse> {
  const rows = await readAll(SHEETS.PRODUCTS);
  const products = rows
    .map(mapProduct)
    .filter((p) => p.internalReference || p.productName || p.barcode);
  const lastSyncedAt = await safeMetadata('last_synced_at');
  return { products, lastSyncedAt, count: products.length };
}

async function safeMetadata(key: string): Promise<string | null> {
  try {
    return await getMetadataValue(key);
  } catch {
    // App_Metadata sheet may not exist yet — treat as no value.
    return null;
  }
}

export async function listCatalogues(): Promise<{ catalogues: CatalogueSummary[] }> {
  const rows = await readAll(SHEETS.CATALOGUES);
  rows.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  return {
    catalogues: rows.map((r) => ({
      catalogueId: str(r.catalogue_id),
      catalogueName: str(r.catalogue_name),
      notes: str(r.notes),
      defaultDiscountPercent: num(r.default_discount_percent) || 0,
      showDiscountColumn: truthy(r.show_discount_column),
      exportMode: (str(r.export_mode) || 'customer') as ExportMode,
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at)
    }))
  };
}

export async function loadCatalogue(catalogueId: string): Promise<LoadCatalogueResponse> {
  if (!catalogueId) throw new Error('catalogueId required');
  const allMeta = await readAll(SHEETS.CATALOGUES);
  const meta = allMeta.find((r) => String(r.catalogue_id) === String(catalogueId));
  if (!meta) throw new Error('Catalogue not found');

  const allItems = await readAll(SHEETS.ITEMS);
  const items: CatalogueItem[] = allItems
    .filter((r) => String(r.catalogue_id) === String(catalogueId))
    .sort((a, b) => (Number(a.selected_order) || 0) - (Number(b.selected_order) || 0))
    .map((r) => ({
      productKey: str(r.product_key),
      selectedOrder: Number(r.selected_order) || 0,
      excludedFromDiscount: truthy(r.excluded_from_discount),
      customNote: str(r.custom_note),
      manuallyRemoved: truthy(r.manually_removed),
      addedBySource: (str(r.added_by_source) || 'manual') as CatalogueItem['addedBySource']
    }));

  const allSources = await readAll(SHEETS.SOURCES);
  const sources: CatalogueSource[] = allSources
    .filter((r) => String(r.catalogue_id) === String(catalogueId))
    .map((r) => ({
      sourceType: (str(r.source_type) as CatalogueSource['sourceType']) || 'category',
      sourceValue: str(r.source_value)
    }));

  let columnsVisibility: ColumnsVisibility = {};
  let columnsOrder: ColumnKey[] = [];
  let titleDate = '';
  if (meta.columns_visibility_json) {
    try {
      const parsed = JSON.parse(String(meta.columns_visibility_json));
      // Backward compat: old shape was the visibility map directly.
      if (parsed && typeof parsed === 'object' && 'visibility' in parsed) {
        columnsVisibility = (parsed.visibility as ColumnsVisibility) || {};
        columnsOrder = Array.isArray(parsed.order) ? (parsed.order as ColumnKey[]) : [];
        titleDate = typeof parsed.titleDate === 'string' ? parsed.titleDate : '';
      } else {
        columnsVisibility = parsed as ColumnsVisibility;
      }
    } catch {
      // Ignore bad JSON — fall back to empty visibility map.
    }
  }

  const catalogue: Catalogue = {
    catalogueId: str(meta.catalogue_id),
    catalogueName: str(meta.catalogue_name),
    notes: str(meta.notes),
    titleDate,
    defaultDiscountPercent: num(meta.default_discount_percent) || 0,
    showDiscountColumn: truthy(meta.show_discount_column),
    exportMode: (str(meta.export_mode) || 'customer') as ExportMode,
    columnsVisibility,
    columnsOrder,
    createdAt: str(meta.created_at),
    updatedAt: str(meta.updated_at)
  };

  return { catalogue, items, sources };
}

export type SaveInput = {
  catalogue: Partial<Catalogue>;
  items: CatalogueItem[];
  sources: CatalogueSource[];
};

export async function saveCatalogue(
  input: SaveInput
): Promise<{ catalogueId: string; updatedAt: string }> {
  const c = input.catalogue || {};
  const items = input.items || [];
  const sources = input.sources || [];
  if (!c.catalogueName) throw new Error('catalogueName required');

  // Defensive: make sure the catalogue tabs exist before we write. If the user
  // never ran /api/setup (or recreated the spreadsheet), saving would fail
  // silently with a 'sheet not found' error otherwise.
  await ensureCatalogueSheets();

  const existing = await readAll(SHEETS.CATALOGUES);
  const now = nowIso();
  const id = c.catalogueId;
  let rowIndex = -1;
  if (id) {
    rowIndex = existing.findIndex((r) => String(r.catalogue_id) === String(id));
  }

  const record = {
    catalogue_id: id || newId(),
    catalogue_name: c.catalogueName,
    notes: c.notes || '',
    default_discount_percent: c.defaultDiscountPercent || 0,
    show_discount_column: !!c.showDiscountColumn,
    export_mode: c.exportMode || 'customer',
    columns_visibility_json: JSON.stringify({
      visibility: c.columnsVisibility || {},
      order: c.columnsOrder || [],
      titleDate: c.titleDate || ''
    }),
    created_at:
      rowIndex >= 0 && existing[rowIndex].created_at
        ? String(existing[rowIndex].created_at)
        : now,
    updated_at: now
  };

  if (rowIndex >= 0) {
    await updateRowByHeaders(SHEETS.CATALOGUES, rowIndex, record);
  } else {
    await appendByHeaders(SHEETS.CATALOGUES, record);
  }

  await deleteRowsWhere(SHEETS.ITEMS, 'catalogue_id', record.catalogue_id);
  await deleteRowsWhere(SHEETS.SOURCES, 'catalogue_id', record.catalogue_id);

  if (items.length) {
    await appendManyByHeaders(
      SHEETS.ITEMS,
      items.map((it, idx) => ({
        catalogue_id: record.catalogue_id,
        product_key: it.productKey,
        selected_order: it.selectedOrder != null ? it.selectedOrder : idx,
        excluded_from_discount: !!it.excludedFromDiscount,
        custom_note: it.customNote || '',
        manually_removed: !!it.manuallyRemoved,
        added_by_source: it.addedBySource || 'manual'
      }))
    );
  }

  if (sources.length) {
    await appendManyByHeaders(
      SHEETS.SOURCES,
      sources.map((s) => ({
        catalogue_id: record.catalogue_id,
        source_type: s.sourceType,
        source_value: s.sourceValue
      }))
    );
  }

  return { catalogueId: record.catalogue_id, updatedAt: record.updated_at };
}

export async function deleteCatalogue(catalogueId: string): Promise<{ deleted: true }> {
  if (!catalogueId) throw new Error('catalogueId required');
  await deleteRowsWhere(SHEETS.CATALOGUES, 'catalogue_id', catalogueId);
  await deleteRowsWhere(SHEETS.ITEMS, 'catalogue_id', catalogueId);
  await deleteRowsWhere(SHEETS.SOURCES, 'catalogue_id', catalogueId);
  return { deleted: true };
}

export async function duplicateCatalogue(
  catalogueId: string,
  newName?: string
): Promise<{ catalogueId: string }> {
  if (!catalogueId) throw new Error('catalogueId required');
  const loaded = await loadCatalogue(catalogueId);
  const copy: Partial<Catalogue> = {
    ...loaded.catalogue,
    catalogueId: undefined,
    catalogueName: newName || `${loaded.catalogue.catalogueName} (copy)`
  };
  const saved = await saveCatalogue({
    catalogue: copy,
    items: loaded.items,
    sources: loaded.sources
  });
  return { catalogueId: saved.catalogueId };
}

export async function runSetup(): Promise<{ created: string[] }> {
  const created: string[] = [];
  const tabs: Array<[string, string[]]> = [
    ...CATALOGUE_SCHEMA,
    [SHEETS.METADATA, ['key', 'value']]
  ];
  for (const [name, headers] of tabs) {
    await ensureSheet(name, headers);
    created.push(name);
  }
  return { created };
}
