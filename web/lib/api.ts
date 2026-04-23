import type {
  ApiResult,
  Catalogue,
  CatalogueItem,
  CatalogueSource,
  CatalogueSummary,
  GetProductsResponse,
  LoadCatalogueResponse
} from './types';

const URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!;
const TOKEN = process.env.NEXT_PUBLIC_API_TOKEN!;

if (typeof window !== 'undefined' && (!URL || !TOKEN)) {
  // Surface configuration mistakes early in dev.
  console.warn('[api] Missing NEXT_PUBLIC_APPS_SCRIPT_URL or NEXT_PUBLIC_API_TOKEN');
}

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(URL, {
    method: 'POST',
    // text/plain avoids the CORS preflight that Apps Script can't handle.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, action, params })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as ApiResult<T>;
  if (!json.ok) throw new Error(json.error || 'Unknown error');
  return json.data;
}

export const api = {
  getProducts:              () => call<GetProductsResponse>('getProducts'),
  refreshProductsFromOdoo:  () => call<{ lastSyncedAt: string; productCount: number }>('refreshProductsFromOdoo'),
  listCatalogues:           () => call<{ catalogues: CatalogueSummary[] }>('listCatalogues'),
  loadCatalogue:            (catalogueId: string) =>
    call<LoadCatalogueResponse>('loadCatalogue', { catalogueId }),
  saveCatalogue:            (payload: { catalogue: Partial<Catalogue>; items: CatalogueItem[]; sources: CatalogueSource[] }) =>
    call<{ catalogueId: string; updatedAt: string }>('saveCatalogue', payload),
  deleteCatalogue:          (catalogueId: string) =>
    call<{ deleted: true }>('deleteCatalogue', { catalogueId }),
  duplicateCatalogue:       (catalogueId: string, newName?: string) =>
    call<{ catalogueId: string }>('duplicateCatalogue', { catalogueId, newName })
};
