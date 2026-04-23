'use client';
import { Plus, Check, ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { Badge } from './ui/Badge';

type Props = {
  product: Product;
  inCatalogue: boolean;
  onAdd: () => void;
};

export function ProductCard({ product, inCatalogue, onAdd }: Props) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card transition hover:shadow-md">
      <div className="relative aspect-square w-full bg-slate-50">
        {product.imageUrl && !imgError ? (
          // Plain <img> with native lazy loading — works for any external URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.productName}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageOff size={32} />
          </div>
        )}
        <button
          onClick={onAdd}
          className={
            'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full shadow-card transition ' +
            (inCatalogue
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-ink hover:bg-ink hover:text-white')
          }
          aria-label={inCatalogue ? 'In catalogue' : 'Add to catalogue'}
          title={inCatalogue ? 'In catalogue' : 'Add to catalogue'}
        >
          {inCatalogue ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-medium leading-snug">{product.productName}</div>
        <div className="text-xs text-muted">{product.internalReference}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold">{formatMoney(product.salesPrice)}</span>
          {product.productCategory ? <Badge>{product.productCategory}</Badge> : null}
        </div>
      </div>
    </div>
  );
}
