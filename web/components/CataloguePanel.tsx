'use client';
import { useMemo } from 'react';
import { GripVertical, X, Tag, Folder, ImageOff, Percent } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Product } from '@/lib/types';
import { useCatalogue, visibleItems } from '@/lib/store';
import { applyDiscount, formatMoney } from '@/lib/format';
import { Badge } from './ui/Badge';

type Props = { productByKey: Map<string, Product> };

export function CataloguePanel({ productByKey }: Props) {
  const items = useCatalogue(visibleItems);
  const sources = useCatalogue((s) => s.sources);
  const discountPct = useCatalogue((s) => s.defaultDiscountPercent);
  const showDiscount = useCatalogue((s) => s.showDiscountColumn);

  const remove        = useCatalogue((s) => s.removeProduct);
  const toggleExclude = useCatalogue((s) => s.toggleExclude);
  const reorder       = useCatalogue((s) => s.reorder);
  const removeSource  = useCatalogue((s) => s.removeSource);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const ids = useMemo(() => items.map((i) => i.productKey), [items]);

  if (!items.length && !sources.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
        Your catalogue is empty.<br />Add products from the search results, or by category / tag.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sources.length ? (
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <button
              key={`${s.sourceType}:${s.sourceValue}`}
              onClick={() => removeSource(s.sourceType, s.sourceValue)}
              className="group inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-xs hover:border-red-200 hover:bg-red-50"
              title="Remove source (does not delete already-added products)"
            >
              {s.sourceType === 'category' ? <Folder size={12} /> : <Tag size={12} />}
              <span>{s.sourceValue}</span>
              <X size={12} className="text-muted group-hover:text-red-600" />
            </button>
          ))}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          const from = ids.indexOf(String(e.active.id));
          const to = e.over ? ids.indexOf(String(e.over.id)) : -1;
          if (from >= 0 && to >= 0 && from !== to) reorder(from, to);
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((it) => {
              const p = productByKey.get(it.productKey);
              return (
                <SortableRow
                  key={it.productKey}
                  id={it.productKey}
                  product={p}
                  productKey={it.productKey}
                  excluded={it.excludedFromDiscount}
                  source={it.addedBySource}
                  discountPct={discountPct}
                  showDiscount={showDiscount}
                  onRemove={() => remove(it.productKey)}
                  onToggleExclude={() => toggleExclude(it.productKey)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

type RowProps = {
  id: string;
  product?: Product;
  productKey: string;
  excluded: boolean;
  source: string;
  discountPct: number;
  showDiscount: boolean;
  onRemove: () => void;
  onToggleExclude: () => void;
};

function SortableRow({ id, product, productKey, excluded, source, discountPct, showDiscount, onRemove, onToggleExclude }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };
  const finalPrice = product ? applyDiscount(product.salesPrice, discountPct, excluded) : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-line bg-white p-2 shadow-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted hover:text-ink"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-50">
        {product?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageOff size={16} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {product?.productName || <span className="text-muted">Missing: {productKey}</span>}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted">
          <span>{productKey}</span>
          {source !== 'manual' ? <Badge tone="neutral">via {source}</Badge> : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 pr-1 text-right">
        <span className="text-sm font-semibold">{formatMoney(product?.salesPrice ?? null)}</span>
        {showDiscount && discountPct > 0 ? (
          <span className={'text-xs ' + (excluded ? 'text-muted line-through' : 'text-emerald-700')}>
            → {formatMoney(finalPrice)}
          </span>
        ) : null}
      </div>

      {showDiscount && discountPct > 0 ? (
        <button
          onClick={onToggleExclude}
          title={excluded ? 'Include in discount' : 'Exclude from discount'}
          className={
            'inline-flex h-7 w-7 items-center justify-center rounded ' +
            (excluded ? 'bg-amber-100 text-amber-800' : 'text-muted hover:bg-slate-100')
          }
        >
          <Percent size={13} />
        </button>
      ) : null}

      <button
        onClick={onRemove}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-red-50 hover:text-red-600"
        aria-label="Remove from catalogue"
      >
        <X size={14} />
      </button>
    </li>
  );
}
