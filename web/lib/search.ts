import type { Product } from './types';

// Lightweight in-memory search. We index once per product list and re-use the
// index across keystrokes so search is O(N) over a precomputed haystack string,
// not over every field. Good enough for tens of thousands of products.

export type ProductIndex = {
  products: Product[];
  haystacks: string[];
  categories: string[];
  tags: string[];
};

export function buildIndex(products: Product[]): ProductIndex {
  const categories = new Set<string>();
  const tags = new Set<string>();
  const haystacks = products.map((p) => {
    if (p.productCategory) categories.add(p.productCategory);
    p.tags.forEach((t) => tags.add(t));
    return [
      p.internalReference,
      p.productName,
      p.productNameHe,
      p.barcode,
      p.packagingBarcode,
      p.productCategory,
      p.ecommerceCategory,
      p.tags.join(' ')
    ].join(' ').toLowerCase();
  });
  return {
    products,
    haystacks,
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b))
  };
}

export type SearchFilters = {
  query: string;
  category?: string;
  tag?: string;
};

export function searchProducts(index: ProductIndex, filters: SearchFilters): Product[] {
  const tokens = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const cat = filters.category?.trim().toLowerCase() || '';
  const tag = filters.tag?.trim().toLowerCase() || '';

  const out: Product[] = [];
  for (let i = 0; i < index.products.length; i++) {
    const p = index.products[i];
    const h = index.haystacks[i];
    if (cat && p.productCategory.toLowerCase() !== cat) continue;
    if (tag && !p.tags.some((t) => t.toLowerCase() === tag)) continue;
    let ok = true;
    for (const t of tokens) {
      if (!h.includes(t)) { ok = false; break; }
    }
    if (ok) out.push(p);
  }
  return out;
}

/** Returns products whose category (case-insensitive) matches `category`. */
export function productsByCategory(index: ProductIndex, category: string): Product[] {
  const c = category.toLowerCase();
  return index.products.filter((p) => p.productCategory.toLowerCase() === c);
}

/** Returns products having `tag` (case-insensitive). */
export function productsByTag(index: ProductIndex, tag: string): Product[] {
  const t = tag.toLowerCase();
  return index.products.filter((p) => p.tags.some((x) => x.toLowerCase() === t));
}
