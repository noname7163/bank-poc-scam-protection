const CURRENCY_FMT = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Pinned timezone — must match the backend's lib/format.ts so the
// verifier's text fingerprints line up regardless of the user's locale.
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

export function formatDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return DATETIME_FMT.format(new Date(iso));
}
