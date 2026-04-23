import type {
  ApiResult,
  Catalogue,
  CatalogueItem,
  CatalogueSource,
  CatalogueSummary,
  GetProductsResponse,
  LoadCatalogueResponse
} from './types';

async function call<T>(
  path: string,
  init?: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown }
): Promise<T> {
  const res = await fetch(path, {
    method: init?.method || 'GET',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store'
  });
  let json: ApiResult<T> | undefined;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    throw new Error(`HTTP ${res.status}`);
  }
  if (!res.ok || !json.ok) {
    const msg = !json.ok ? json.error : `HTTP ${res.status}`;
    throw new Error(msg || 'Unknown error');
  }
  return json.data;
}

export const api = {
  getProducts: () => call<GetProductsResponse>('/api/products'),
  listCatalogues: () => call<{ catalogues: CatalogueSummary[] }>('/api/catalogues'),
  loadCatalogue: (id: string) => call<LoadCatalogueResponse>(`/api/catalogues/${encodeURIComponent(id)}`),
  saveCatalogue: (payload: {
    catalogue: Partial<Catalogue>;
    items: CatalogueItem[];
    sources: CatalogueSource[];
  }) =>
    call<{ catalogueId: string; updatedAt: string }>('/api/catalogues', {
      method: 'POST',
      body: payload
    }),
  deleteCatalogue: (id: string) =>
    call<{ deleted: true }>(`/api/catalogues/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  duplicateCatalogue: (id: string, newName?: string) =>
    call<{ catalogueId: string }>(
      `/api/catalogues/${encodeURIComponent(id)}/duplicate`,
      { method: 'POST', body: newName ? { newName } : {} }
    )
};
