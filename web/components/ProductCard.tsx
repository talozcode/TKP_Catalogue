'use client';
import { Plus, Minus, ImageOff, Sparkles, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import type { Product } from '@/lib/types';
import { formatMoney, parseLotExpiry } from '@/lib/format';
import { isNewProduct } from '@/lib/search';
import { Badge } from './ui/Badge';
import type { PriceMode } from './Header';

type Props = {
  product: Product;
  inCatalogue: boolean;
  onAdd: () => void;
  onRemove: () => void;
  priceMode: PriceMode;
};

export function ProductCard({ product, inCatalogue, onAdd, onRemove, priceMode }: Props) {
  const [imgError, setImgError] = useState(false);
  const isNew = isNewProduct(product);
  const lots = parseLotExpiry(product.lotExpiry);
  const displayPrice = priceMode === 'wholesale' ? product.wholesalePrice : product.salesPrice;

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
        {product.actualAvailableQty !== null ? (
          <span
            className={clsx(
              'absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm',
              product.actualAvailableQty > 0 ? 'bg-green-500' : 'bg-red-500'
            )}
            title={`Available qty: ${product.actualAvailableQty}`}
          >
            {product.actualAvailableQty}
          </span>
        ) : null}
        {lots.length > 0 ? (
          <span className="group/expiry absolute bottom-2 right-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm">
              <CalendarDays size={11} className="text-muted" />
            </span>
            <div className="absolute bottom-full right-0 z-20 mb-1.5 hidden min-w-[148px] rounded-lg border border-line bg-white p-2 shadow-cardHover group-hover/expiry:block">
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Expiry</div>
              {lots.map((l, i) => (
                <div key={`${l.date}-${l.qty}-${i}`} className="flex items-center justify-between gap-3 text-[13px] tabular-nums text-ink">
                  <span className="font-semibold">{l.qty}</span>
                  <span className="text-muted">{l.date}</span>
                </div>
              ))}
            </div>
          </span>
        ) : null}
        <button
          onClick={inCatalogue ? onRemove : onAdd}
          className={clsx(
            'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full shadow-card transition',
            inCatalogue
              ? 'bg-brand text-white hover:bg-red-600'
              : 'bg-white text-ink hover:bg-brand hover:text-white'
          )}
          aria-label={inCatalogue ? 'Remove from catalogue' : 'Add to catalogue'}
          title={inCatalogue ? 'Remove from catalogue' : 'Add to catalogue'}
        >
          {inCatalogue ? <Minus size={16} /> : <Plus size={16} />}
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
            {formatMoney(displayPrice)}
          </span>
          {product.productCategory ? (
            <Badge tone="gold">{product.productCategory}</Badge>
          ) : null}
        </div>
        {product.packaging ? (
          <div className="text-[13px] font-semibold text-muted">{product.packaging}</div>
        ) : null}
      </div>
    </div>
  );
}
