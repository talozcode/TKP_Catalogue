const BRAND_NAME = 'The Kosher Place Catalogue';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function prettyDate(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Display name shown in the header strip and document preview. The date
 * suffix is optional and free-form — pass an empty string to omit it.
 */
export function displayCatalogueName(name: string, date?: string): string {
  const t = name.trim();
  const d = (date || '').trim();
  if (t && d) return `${t} · ${d}`;
  if (t) return t;
  if (d) return `${BRAND_NAME} · ${d}`;
  return BRAND_NAME;
}

/** Filesystem-safe name used for downloaded XLSX / PDF. */
export function fileBaseName(name: string): string {
  const t = name.trim();
  if (t) return t.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || `TKP-Catalogue-${isoDate()}`;
  return `TKP-Catalogue-${isoDate()}`;
}

/** Returns true when the user hasn't provided a custom name. */
export function isUnnamed(name: string): boolean {
  return !name.trim();
}
