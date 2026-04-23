'use client';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

type Props = {
  products: Product[];
  inCatalogueKeys: Set<string>;
  onAdd: (key: string) => void;
};

const PAGE = 60;

// Simple paged rendering — keeps the DOM light even with thousands of results.
// (Could swap in react-virtual later if grids grow much larger.)
export function ProductGrid({ products, inCatalogueKeys, onAdd }: Props) {
  const [count, setCount] = useState(PAGE);
  const visible = products.slice(0, count);
  const hasMore = products.length > count;

  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
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
          />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            className="rounded-md border border-line bg-white px-4 py-2 text-sm hover:bg-slate-50"
            onClick={() => setCount((c) => c + PAGE)}
          >
            Show more ({products.length - count} more)
          </button>
        </div>
      ) : null}
    </div>
  );
}
