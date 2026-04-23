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
