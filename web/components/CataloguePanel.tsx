'use client';
import { useMemo } from 'react';
import clsx from 'clsx';
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
  const items        = useCatalogue(visibleItems);
  const sources      = useCatalogue((s) => s.sources);
  const discountPct  = useCatalogue((s) => s.defaultDiscountPercent);
  const showDiscount = useCatalogue((s) => s.showDiscountColumn);
  const showNotes    = useCatalogue((s) => !!s.columnsVisibility.note);

  const remove        = useCatalogue((s) => s.removeProduct);
  const toggleExclude = useCatalogue((s) => s.toggleExclude);
  const setNote       = useCatalogue((s) => s.setNote);
  const reorder       = useCatalogue((s) => s.reorder);
  const removeSource  = useCatalogue((s) => s.removeSource);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const ids = useMemo(() => items.map((i) => i.productKey), [items]);

  if (!items.length && !sources.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white/70 p-8 text-center text-sm text-muted">
        <div className="font-serif text-base text-ink">Your catalogue is empty</div>
        <div className="mt-1">
          Add products from the search results, or by category / tag.
        </div>
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
              className="group inline-flex items-center gap-1 rounded-full border border-gold/30 bg-goldSoft/60 px-2.5 py-1 text-xs text-goldDeep transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              title="Remove source (does not delete already-added products)"
            >
              {s.sourceType === 'category' ? <Folder size={11} /> : <Tag size={11} />}
              <span className="font-medium">{s.sourceValue}</span>
              <X size={11} className="opacity-60 group-hover:opacity-100" />
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
          <ul className="space-y-1.5">
            {items.map((it, idx) => {
              const p = productByKey.get(it.productKey);
              return (
                <SortableRow
                  key={it.productKey}
                  id={it.productKey}
                  index={idx + 1}
                  product={p}
                  productKey={it.productKey}
                  excluded={it.excludedFromDiscount}
                  source={it.addedBySource}
                  discountPct={discountPct}
                  showDiscount={showDiscount}
                  showNotes={showNotes}
                  note={it.customNote}
                  onRemove={() => remove(it.productKey)}
                  onToggleExclude={() => toggleExclude(it.productKey)}
                  onNoteChange={(v) => setNote(it.productKey, v)}
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
  index: number;
  product?: Product;
  productKey: string;
  excluded: boolean;
  source: string;
  discountPct: number;
  showDiscount: boolean;
  showNotes: boolean;
  note: string;
  onRemove: () => void;
  onToggleExclude: () => void;
  onNoteChange: (v: string) => void;
};

function SortableRow({
  id,
  index,
  product,
  productKey,
  excluded,
  source,
  discountPct,
  showDiscount,
  showNotes,
  note,
  onRemove,
  onToggleExclude,
  onNoteChange
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };
  const finalPrice = product
    ? applyDiscount(product.salesPrice, discountPct, excluded)
    : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx(
        'rounded-xl border border-line bg-white px-2 py-2 shadow-card transition',
        isDragging ? 'ring-2 ring-brand/40' : 'hover:border-brand/30'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="flex h-7 w-5 cursor-grab items-center justify-center text-line hover:text-brand active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>

        <div className="w-5 text-center text-[11px] font-semibold text-muted tabular-nums">
          {index}
        </div>

        <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-line bg-bg">
          {product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-line">
              <ImageOff size={14} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">
            {product?.productName || (
              <span className="text-muted">Missing: {productKey}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="tabular-nums">{productKey}</span>
            {source !== 'manual' ? <Badge tone="brand">via {source}</Badge> : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 pr-1 text-right">
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney(product?.salesPrice ?? null)}
          </span>
          {showDiscount && discountPct > 0 ? (
            <span
              className={clsx(
                'text-[11px] tabular-nums',
                excluded ? 'text-muted line-through' : 'text-goldDeep'
              )}
            >
              → {formatMoney(finalPrice)}
            </span>
          ) : null}
        </div>

        {showDiscount && discountPct > 0 ? (
          <button
            onClick={onToggleExclude}
            title={excluded ? 'Include in discount' : 'Exclude from discount'}
            className={clsx(
              'inline-flex h-7 w-7 items-center justify-center rounded',
              excluded
                ? 'bg-amber-100 text-amber-800'
                : 'text-muted hover:bg-brandSoft hover:text-brand'
            )}
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
      </div>

      {showNotes ? (
        <div className="mt-2 pl-7">
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Note for this product…"
            rows={1}
            className="w-full resize-y rounded-md border border-line bg-bg/60 px-2 py-1 text-xs text-ink placeholder:text-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      ) : null}
    </li>
  );
}
