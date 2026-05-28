'use client';
import { Search, X, Sparkles, ChevronDown, Check, Eraser, PackageCheck, CircleDollarSign } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Input } from './ui/Input';

type Props = {
  query: string;
  category: string;
  tags: string[];
  excludedTags: string[];
  categories: string[];
  allTags: string[];
  onlyNew: boolean;
  newCount: number;
  inStockOnly: boolean;
  hidePriceZero: boolean;
  onQuery: (q: string) => void;
  onCategory: (c: string) => void;
  onTagsChange: (t: string[]) => void;
  onExcludedTagsChange: (t: string[]) => void;
  onOnlyNew: (v: boolean) => void;
  onInStockOnly: (v: boolean) => void;
  onHidePriceZero: (v: boolean) => void;
  onClearAll: () => void;
  resultCount: number;
};

export function SearchBar({
  query,
  category,
  tags,
  excludedTags,
  categories,
  allTags,
  onlyNew,
  newCount,
  inStockOnly,
  hidePriceZero,
  onQuery,
  onCategory,
  onTagsChange,
  onExcludedTagsChange,
  onOnlyNew,
  onInStockOnly,
  onHidePriceZero,
  onClearAll,
  resultCount
}: Props) {
  const hasFilter = !!(query || category || tags.length || excludedTags.length || onlyNew || inStockOnly || hidePriceZero);

  return (
    <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            size={16}
          />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search by name, reference, barcode, category, or tag…"
            className="pl-9"
          />
          {query ? (
            <button
              onClick={() => onQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-brandSoft hover:text-brand"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <select
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 md:w-56"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <TagMultiSelect
          allTags={allTags}
          selected={tags}
          onChange={onTagsChange}
          placeholder="All tags"
        />
        <TagMultiSelect
          allTags={allTags}
          selected={excludedTags}
          onChange={onExcludedTagsChange}
          placeholder="Exclude tags…"
          variant="exclude"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>
            <span className="font-semibold text-ink tabular-nums">
              {resultCount.toLocaleString()}
            </span>{' '}
            product{resultCount === 1 ? '' : 's'} matching your filters
          </span>
          {tags.length ? (
            <div className="flex flex-wrap items-center gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-bg px-2 py-0.5 text-[11px] text-ink"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => onTagsChange(tags.filter((x) => x !== t))}
                    className="rounded-full p-0.5 text-muted hover:bg-brandSoft hover:text-brand"
                    aria-label={`Remove tag ${t}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {excludedTags.length ? (
            <div className="flex flex-wrap items-center gap-1">
              {excludedTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700"
                >
                  <X size={9} className="shrink-0" />
                  {t}
                  <button
                    type="button"
                    onClick={() => onExcludedTagsChange(excludedTags.filter((x) => x !== t))}
                    className="rounded-full p-0.5 text-red-400 hover:bg-red-100 hover:text-red-700"
                    aria-label={`Remove exclusion ${t}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {hasFilter ? (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-muted hover:border-brand/40 hover:text-brand"
              title="Clear all filters"
            >
              <Eraser size={11} /> Clear filters
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onHidePriceZero(!hidePriceZero)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              hidePriceZero
                ? 'border-brand bg-brandSoft text-brand shadow-sm'
                : 'border-line bg-white text-muted hover:border-brand/40 hover:text-brand'
            )}
            title="Hide products with no price or price = 0"
          >
            <CircleDollarSign size={12} />
            Has price
          </button>
          <button
            type="button"
            onClick={() => onInStockOnly(!inStockOnly)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              inStockOnly
                ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                : 'border-line bg-white text-muted hover:border-green-400 hover:text-green-700'
            )}
            title="Show only products with stock > 0"
          >
            <PackageCheck size={12} />
            In stock only
          </button>
          <button
            type="button"
            onClick={() => onOnlyNew(!onlyNew)}
            disabled={newCount === 0 && !onlyNew}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              onlyNew
                ? 'border-gold bg-goldSoft text-goldDeep shadow-sm'
                : 'border-line bg-white text-muted hover:border-gold/60 hover:text-goldDeep',
              newCount === 0 && !onlyNew && 'opacity-50'
            )}
            title={`Show only products added in the last 7 days${newCount ? ` (${newCount} available)` : ''}`}
          >
            <Sparkles size={12} />
            New only
            <span className="rounded-full bg-white/60 px-1.5 tabular-nums">
              {newCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TagMultiSelect({
  allTags,
  selected,
  onChange,
  placeholder = 'All tags',
  variant = 'include'
}: {
  allTags: string[];
  selected: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
  variant?: 'include' | 'exclude';
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectedSet = new Set(selected);
  const visibleTags = filter
    ? allTags.filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    : allTags;

  function toggle(tag: string) {
    if (selectedSet.has(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  const isExclude = variant === 'exclude';
  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} ${isExclude ? 'excluded' : 'tags'}`;

  return (
    <div ref={ref} className="relative md:w-48">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-2 text-sm focus:outline-none focus:ring-2',
          isExclude
            ? selected.length
              ? 'border-red-300 text-red-700 focus:border-red-400 focus:ring-red-200'
              : 'border-line text-muted hover:border-red-300 hover:text-red-600 focus:border-red-400 focus:ring-red-200'
            : selected.length
              ? 'border-brand/40 text-ink focus:border-brand focus:ring-brand/30'
              : 'border-line text-ink focus:border-brand focus:ring-brand/30'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-cardHover">
          <div className="border-b border-line p-2">
            <Input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tags…"
              className="h-8 text-xs"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {visibleTags.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted">No tags match</div>
            ) : (
              visibleTags.map((t) => {
                const on = selectedSet.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className={clsx(
                      'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm',
                      isExclude
                        ? on ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'hover:bg-red-50'
                        : on ? 'bg-brandSoft/60 text-brand hover:bg-brandSoft' : 'hover:bg-brandSoft'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'flex h-4 w-4 items-center justify-center rounded border',
                          on
                            ? isExclude
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-brand bg-brand text-white'
                            : 'border-line bg-white'
                        )}
                      >
                        {on ? <Check size={12} /> : null}
                      </span>
                      {t}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {selected.length ? (
            <div className="flex justify-between border-t border-line p-2 text-xs">
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded px-2 py-1 text-muted hover:bg-bg hover:text-ink"
              >
                Clear ({selected.length})
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={clsx(
                  'rounded px-3 py-1 font-semibold text-white',
                  isExclude ? 'bg-red-500 hover:bg-red-600' : 'bg-brand hover:bg-brandDeep'
                )}
              >
                Done
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
