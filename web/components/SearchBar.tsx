'use client';
import { Search, X } from 'lucide-react';
import { Input } from './ui/Input';

type Props = {
  query: string;
  category: string;
  tag: string;
  categories: string[];
  tags: string[];
  onQuery: (q: string) => void;
  onCategory: (c: string) => void;
  onTag: (t: string) => void;
  resultCount: number;
};

export function SearchBar({
  query,
  category,
  tag,
  categories,
  tags,
  onQuery,
  onCategory,
  onTag,
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
      <div className="mt-2 text-xs text-muted">
        <span className="font-semibold text-ink tabular-nums">
          {resultCount.toLocaleString()}
        </span>{' '}
        product{resultCount === 1 ? '' : 's'} matching your filters
      </div>
    </div>
  );
}
