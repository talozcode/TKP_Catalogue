export function formatMoney(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

export function applyDiscount(price: number | null, discountPct: number, excluded: boolean): number | null {
  if (price == null) return null;
  if (excluded || !discountPct) return price;
  return +(price * (1 - discountPct / 100)).toFixed(2);
}

export type LotEntry = { qty: number; date: string };

export function parseLotExpiry(raw: string): LotEntry[] {
  if (!raw) return [];
  return raw
    .split('|')
    .map((s) => s.trim())
    .map((s) => {
      const m = s.match(/^(\d+)\s*\(([^)]+)\)$/);
      if (!m) return null;
      return { qty: parseInt(m[1], 10), date: m[2].trim() };
    })
    .filter((e): e is LotEntry => e !== null);
}
