'use client';
import { Search, X, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Input } from './ui/Input';

type Props = {
  query: string;
  category: string;
  tag: string;
  categories: string[];
  tags: string[];
  onlyNew: boolean;
  newCount: number;
  onQuery: (q: string) => void;
  onCategory: (c: string) => void;
  onTag: (t: string) => void;
  onOnlyNew: (v: boolean) => void;
  resultCount: number;
};

export function SearchBar({
  query,
  category,
  tag,
  categories,
  tags,
  onlyNew,
  newCount,
  onQuery,
  onCategory,
  onTag,
  onOnlyNew,
  resultCount
}: Props) {
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

        <select
          value={tag}
          onChange={(e) => onTag(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 md:w-48"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted">
          <span className="font-semibold text-ink tabular-nums">
            {resultCount.toLocaleString()}
          </span>{' '}
          product{resultCount === 1 ? '' : 's'} matching your filters
        </div>
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
          title={`Show only products added in the last 30 days${newCount ? ` (${newCount} available)` : ''}`}
        >
          <Sparkles size={12} />
          New only
          <span className="rounded-full bg-white/60 px-1.5 tabular-nums">
            {newCount}
          </span>
        </button>
      </div>
    </div>
  );
}
