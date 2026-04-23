'use client';
import { useMemo } from 'react';
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
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import type { ColumnKey, ColumnsVisibility } from '@/lib/types';
import {
  ALL_COLUMN_IDS,
  COLUMN_LABELS,
  DEFAULT_COLUMN_ORDER,
  normalizeColumnOrder
} from '@/lib/columns';

const PRICING: ColumnKey[] = ['discount', 'finalPrice'];

type Props = {
  open: boolean;
  onClose: () => void;
  columns: ColumnsVisibility;
  order: ColumnKey[];
  showDiscountColumn: boolean;
  onToggle: (k: ColumnKey) => void;
  onReorder: (order: ColumnKey[]) => void;
  onMove: (from: number, to: number) => void;
};

export function ColumnsDialog({
  open,
  onClose,
  columns,
  order,
  showDiscountColumn,
  onToggle,
  onReorder,
  onMove
}: Props) {
  const ids = useMemo(() => normalizeColumnOrder(order), [order]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  return (
    <Dialog open={open} onClose={onClose} title="Columns" width="max-w-md">
      <p className="mb-3 text-sm text-muted">
        Drag rows to reorder. Toggle the checkbox to show or hide each column in the
        preview and exports.
      </p>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gold">
          Order &amp; visibility
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onReorder([...DEFAULT_COLUMN_ORDER] as ColumnKey[])}
          title="Reset order to default"
        >
          Reset order
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          const from = ids.indexOf(String(e.active.id) as ColumnKey);
          const to = e.over ? ids.indexOf(String(e.over.id) as ColumnKey) : -1;
          if (from >= 0 && to >= 0 && from !== to) onMove(from, to);
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {ids.map((id, idx) => {
              const isPricing = PRICING.includes(id);
              const checked = isPricing ? showDiscountColumn : !!columns[id];
              return (
                <SortableItem
                  key={id}
                  id={id}
                  idx={idx}
                  total={ids.length}
                  label={COLUMN_LABELS[id]}
                  checked={checked}
                  disabled={isPricing}
                  hint={isPricing ? 'Toggled by Show discount column' : undefined}
                  onToggle={() => !isPricing && onToggle(id)}
                  onUp={() => idx > 0 && onMove(idx, idx - 1)}
                  onDown={() => idx < ids.length - 1 && onMove(idx, idx + 1)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <p className="mt-3 text-[11px] text-muted">
        Discount % and Final price toggle together via{' '}
        <em className="text-ink">Show discount column</em> in the toolbar.
      </p>
    </Dialog>
  );
}

type ItemProps = {
  id: ColumnKey;
  idx: number;
  total: number;
  label: string;
  checked: boolean;
  disabled: boolean;
  hint?: string;
  onToggle: () => void;
  onUp: () => void;
  onDown: () => void;
};

function SortableItem({
  id,
  idx,
  total,
  label,
  checked,
  disabled,
  hint,
  onToggle,
  onUp,
  onDown
}: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };
  const isFirst = idx === 0;
  const isLast = idx === total - 1;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 text-sm',
        isDragging
          ? 'border-brand/40 ring-2 ring-brand/30'
          : 'border-line hover:border-brand/30'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex h-7 w-5 cursor-grab items-center justify-center text-line hover:text-brand active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      <label
        className={clsx(
          'flex flex-1 items-center gap-2',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          className="h-4 w-4 accent-brand disabled:opacity-60"
        />
        <span className={clsx('flex-1', disabled && 'text-muted')}>{label}</span>
        {hint ? <span className="text-[10px] text-muted">{hint}</span> : null}
      </label>

      <div className="flex items-center">
        <button
          onClick={onUp}
          disabled={isFirst}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-brandSoft hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
          aria-label="Move up"
          title="Move up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={onDown}
          disabled={isLast}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-brandSoft hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
          aria-label="Move down"
          title="Move down"
        >
          <ArrowDown size={12} />
        </button>
      </div>
    </li>
  );
}

// Re-export for callers that count visible columns.
export const ALL_COLUMNS = ALL_COLUMN_IDS;
