// Deterministic generation of demo account + transactions from a session seed.
// Same seed in → exactly the same account + transactions out.

import { rngFromHex, type Rng } from "./prng.js";

export interface Account {
  id: string;
  iban: string;
  holder_name: string;
  balance_cents: number;
}

export type TxDirection = "in" | "out";
export type TxType = "salary" | "rent" | "groceries" | "transfer" | "subscription" | "refund" | "purchase" | "other";

export interface Transaction {
  id: string;
  direction: TxDirection;
  type: TxType;
  amount_cents: number;
  counterparty_name: string;
  counterparty_iban: string;
  reference: string;
  booked_at: string; // ISO
}

interface CounterpartyDef {
  name: string;
  type: TxType;
  direction: TxDirection;
  references: string[];
  amount: [number, number]; // cents min, max
}

const RECURRING: CounterpartyDef[] = [
  {
    name: "Lohnstelle XYZ GmbH",
    type: "salary",
    direction: "in",
    references: ["Gehalt", "Gehaltszahlung", "Lohn"],
    amount: [240000, 380000],
  },
  {
    name: "Vermietung Müller GbR",
    type: "rent",
    direction: "out",
    references: ["Miete", "Miete WG-Zimmer", "Kaltmiete + NK"],
    amount: [75000, 130000],
  },
  {
    name: "REWE Markt",
    type: "groceries",
    direction: "out",
    references: ["Einkauf", "Wocheneinkauf", "Einkauf REWE"],
    amount: [1800, 8500],
  },
  {
    name: "Lukas (WG-Kasse)",
    type: "transfer",
    direction: "in",
    references: ["Rückzahlung Essen", "Strom-Anteil", "Pizza gestern"],
    amount: [800, 4500],
  },
  {
    name: "Sarah Friedrich",
    type: "transfer",
    direction: "out",
    references: ["Geburtstagsgeschenk", "Konzert-Ticket", "Ausgleich"],
    amount: [1500, 6000],
  },
];

const ONE_OFFS: CounterpartyDef[] = [
  {
    name: "Stadtwerke",
    type: "subscription",
    direction: "out",
    references: ["Stromabschlag", "Gas-Vorauszahlung"],
    amount: [4500, 11000],
  },
  {
    name: "Spotify AB",
    type: "subscription",
    direction: "out",
    references: ["Spotify Premium"],
    amount: [999, 999],
  },
  {
    name: "Amazon EU S.à.r.l.",
    type: "purchase",
    direction: "out",
    references: ["Amazon Order #302-4471-2899", "Amazon Order #114-9982-1100"],
    amount: [1200, 14000],
  },
  {
    name: "Finanzamt",
    type: "refund",
    direction: "in",
    references: ["Steuerrückerstattung 2024"],
    amount: [12000, 95000],
  },
  {
    name: "Deutsche Bahn AG",
    type: "purchase",
    direction: "out",
    references: ["DB Ticket", "BahnCard 25"],
    amount: [1900, 9900],
  },
  {
    name: "Shell Tankstelle",
    type: "purchase",
    direction: "out",
    references: ["Tankstelle", "Kraftstoff"],
    amount: [4500, 9500],
  },
  {
    name: "Apple Distribution Intl.",
    type: "purchase",
    direction: "out",
    references: ["iCloud Speicher", "App Store"],
    amount: [199, 2999],
  },
  {
    name: "Versicherung Kfz",
    type: "subscription",
    direction: "out",
    references: ["Kfz-Versicherung Q4"],
    amount: [15000, 30000],
  },
];

const IBAN_COUNTRY = "DE";

function randomIban(rng: Rng): string {
  // Demo IBAN — not BBAN-checksum-correct, but visually realistic.
  const blz = String(rng.int(10000000, 99999999));
  const acct = String(rng.int(100000000, 999999999)).padStart(10, "0");
  const checkDigits = String(rng.int(10, 99));
  const raw = `${IBAN_COUNTRY}${checkDigits}${blz}${acct}`;
  return raw.replace(/(.{4})/g, "$1 ").trim();
}

function shortId(rng: Rng, prefix: string): string {
  const hex = Math.floor(rng.next() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
  return `${prefix}_${hex}`;
}

function pickAmount(rng: Rng, [min, max]: [number, number]): number {
  if (min === max) return min;
  return rng.int(min, max);
}

function isoDateDaysAgo(rng: Rng, days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(rng.int(7, 21), rng.int(0, 59), rng.int(0, 59), 0);
  return d.toISOString();
}

export function generateAccount(seedHex: string, holderName: string): Account {
  const rng = rngFromHex(seedHex);
  // Pre-roll some values to space out account fields from the tx generator.
  const id = shortId(rng, "acc");
  const iban = randomIban(rng);
  const balance_cents = rng.int(150000, 1200000);
  return { id, iban, holder_name: holderName, balance_cents };
}

export function generateTransactions(seedHex: string, count = 20): Transaction[] {
  // Use a different slice of the seed so account and tx generators don't share
  // the first u32 words — keeps account/tx values visually unrelated.
  const txSeed = rotateSeed(seedHex);
  const rng = rngFromHex(txSeed);

  const txs: Transaction[] = [];

  // Always include exactly one salary entry in the first ~5 days.
  txs.push(buildTx(rng, RECURRING[0]!, rng.int(0, 5)));
  // Always include exactly one rent entry.
  txs.push(buildTx(rng, RECURRING[1]!, rng.int(0, 5)));

  while (txs.length < count) {
    const pool = rng.chance(0.65) ? RECURRING : ONE_OFFS;
    const cp = rng.pick(pool);
    txs.push(buildTx(rng, cp, rng.int(0, 60)));
  }

  // Sort newest first.
  txs.sort((a, b) => (a.booked_at < b.booked_at ? 1 : -1));
  return txs;
}

function buildTx(rng: Rng, cp: CounterpartyDef, daysAgo: number): Transaction {
  return {
    id: shortId(rng, "tx"),
    direction: cp.direction,
    type: cp.type,
    amount_cents: pickAmount(rng, cp.amount),
    counterparty_name: cp.name,
    counterparty_iban: randomIban(rng),
    reference: rng.pick(cp.references),
    booked_at: isoDateDaysAgo(rng, daysAgo),
  };
}

function rotateSeed(seedHex: string): string {
  // Rotate by 16 hex chars so account/tx PRNGs use disjoint state.
  if (seedHex.length < 32) return seedHex;
  return seedHex.slice(16) + seedHex.slice(0, 16);
}
