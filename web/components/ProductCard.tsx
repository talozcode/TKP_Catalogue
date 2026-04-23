'use client';
import { Plus, Check, ImageOff, Sparkles } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import type { Product } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { isNewProduct } from '@/lib/search';
import { Badge } from './ui/Badge';

type Props = {
  product: Product;
  inCatalogue: boolean;
  onAdd: () => void;
};

export function ProductCard({ product, inCatalogue, onAdd }: Props) {
  const [imgError, setImgError] = useState(false);
  const isNew = isNewProduct(product);
  return (
    <div
      className={clsx(
        'group flex flex-col overflow-hidden rounded-xl border bg-white shadow-card transition',
        inCatalogue
          ? 'border-brand/40 ring-1 ring-brand/20'
          : 'border-line hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-cardHover'
      )}
    >
      <div className="relative aspect-square w-full bg-bg">
        {product.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.productName}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-line">
            <ImageOff size={32} />
          </div>
        )}
        {isNew ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            <Sparkles size={10} /> New
          </span>
        ) : null}
        <button
          onClick={onAdd}
          className={clsx(
            'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full shadow-card transition',
            inCatalogue
              ? 'bg-brand text-white'
              : 'bg-white text-ink hover:bg-brand hover:text-white'
          )}
          aria-label={inCatalogue ? 'In catalogue' : 'Add to catalogue'}
          title={inCatalogue ? 'In catalogue' : 'Add to catalogue'}
        >
          {inCatalogue ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-medium leading-snug text-ink">
          {product.productName}
        </div>
        <div className="text-[11px] text-muted tabular-nums">
          {product.internalReference}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-brand tabular-nums">
            {formatMoney(product.salesPrice)}
          </span>
          {product.productCategory ? (
            <Badge tone="gold">{product.productCategory}</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
