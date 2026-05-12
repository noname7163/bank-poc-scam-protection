// Server-side mirror of the frontend's Intl formatters. The verifier compares
// SHA-256(textContent) values, so server and client must produce byte-for-byte
// identical strings. Node 22's ICU is full-fat by default, matching what
// Chromium/Gecko emit for de-DE.

const CURRENCY_FMT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Pinned timezone: without this, Node (UTC in containers) and the browser
// (user's local TZ) produce different strings for the same instant, which
// would make the verifier fingerprint for tx-date never match.
const DATETIME_FMT = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

export function formatCurrencyCents(cents: number): string {
  return CURRENCY_FMT.format(cents / 100);
}

export function formatSignedCents(direction: "in" | "out", cents: number): string {
  const sign = direction === "in" ? "+" : "−";
  return `${sign} ${CURRENCY_FMT.format(cents / 100)}`;
}

export function formatDateTime(value: Date | string): string {
  return DATETIME_FMT.format(value instanceof Date ? value : new Date(value));
}
