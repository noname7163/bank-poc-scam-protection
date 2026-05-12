const CURRENCY_FMT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATETIME_FMT = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCurrencyCents(cents: number): string {
  return CURRENCY_FMT.format(cents / 100);
}

export function formatDateTime(value: Date | string): string {
  return DATETIME_FMT.format(value instanceof Date ? value : new Date(value));
}

export function parseCurrencyInput(raw: string): number | null {
  // Accept "1234.56", "1234,56", "1234" → cents.
  const cleaned = raw.replace(/\./g, "").replace(",", ".").trim();
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
