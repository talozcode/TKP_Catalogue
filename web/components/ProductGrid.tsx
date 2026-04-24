'use client';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

type Props = {
  products: Product[];
  inCatalogueKeys: Set<string>;
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
};

const PAGE = 60;

// Simple paged rendering — keeps the DOM light even with thousands of results.
// (Could swap in react-virtual later if grids grow much larger.)
export function ProductGrid({ products, inCatalogueKeys, onAdd, onRemove }: Props) {
  const [count, setCount] = useState(PAGE);
  const visible = products.slice(0, count);
  const hasMore = products.length > count;

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        No products match your filters.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((p) => (
          <ProductCard
            key={p.internalReference || p.barcode || p.productName}
            product={p}
            inCatalogue={inCatalogueKeys.has(p.internalReference)}
            onAdd={() => onAdd(p.internalReference)}
            onRemove={() => onRemove(p.internalReference)}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-5 flex justify-center">
          <button
            className="rounded-full border border-line bg-white px-5 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-brand hover:text-brand"
            onClick={() => setCount((c) => c + PAGE)}
          >
            Show {Math.min(PAGE, products.length - count)} more · {products.length - count} remaining
          </button>
        </div>
      ) : null}
    </div>
  );
}
