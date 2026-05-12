// Server-side computation of the expected SHA-256 / HMAC-token fingerprint
// for every protected element on the protected pages.
//
// For text-protected fields the fingerprint is sha256(textContent).
// For image-protected fields the fingerprint is the HMAC token that the
// `/api/render/...` URL carries — both client and server compute the
// same token from `type|id|session_id`, so no shared state is needed.

import { createHash } from "node:crypto";
import {
  loadAccountByUser,
  loadTransactionForUser,
  type StoredAccount,
  type StoredTransaction,
} from "./data.js";
import { formatCurrencyCents, formatDateTime, formatSignedCents } from "./format.js";
import { signRenderToken } from "./render-tokens.js";

export interface ExpectedFingerprint {
  protected_id: string;
  fingerprint: string;
}

export type Locale = "en" | "de" | "fr";

const DIRECTION_LABEL: Record<Locale, { in: string; out: string }> = {
  en: { in: "Incoming", out: "Outgoing" },
  de: { in: "Eingang", out: "Ausgang" },
  fr: { in: "Entrant", out: "Sortant" },
};

function normalizeLocale(value: unknown): Locale {
  return value === "de" || value === "fr" ? value : "en";
}

export { normalizeLocale };

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function expectedFingerprintsForOverview(
  userId: string,
  sessionId: string,
): Promise<ExpectedFingerprint[]> {
  const account = await loadAccountByUser(userId);
  if (!account) return [];

  const balanceFingerprint =
    account.image_protection?.balance === true
      ? signRenderToken("balance", account.id, sessionId)
      : sha256Hex(formatCurrencyCents(account.balance_cents));

  return [
    { protected_id: "balance", fingerprint: balanceFingerprint },
    { protected_id: "iban", fingerprint: sha256Hex(account.iban) },
  ];
}

export async function expectedFingerprintsForTransaction(
  userId: string,
  txId: string,
  sessionId: string,
  locale: Locale = "en",
): Promise<{ fingerprints: ExpectedFingerprint[]; tx: StoredTransaction; account: StoredAccount } | null> {
  const [account, tx] = await Promise.all([
    loadAccountByUser(userId),
    loadTransactionForUser(userId, txId),
  ]);
  if (!account || !tx) return null;
  const prot = account.image_protection ?? {};

  const userIban = account.iban;
  const holderName = account.holder_name;
  const senderName = tx.direction === "in" ? tx.counterparty_name : holderName;
  const senderIban = tx.direction === "in" ? tx.counterparty_iban : userIban;
  const recipientName = tx.direction === "in" ? holderName : tx.counterparty_name;
  const recipientIban = tx.direction === "in" ? userIban : tx.counterparty_iban;

  const amountFp =
    prot.tx_amount === true
      ? signRenderToken("tx_amount", tx.id, sessionId)
      : sha256Hex(formatSignedCents(tx.direction, tx.amount_cents));
  const senderIbanFp =
    prot.tx_iban === true
      ? signRenderToken("tx_sender_iban", tx.id, sessionId)
      : sha256Hex(senderIban);
  const recipientIbanFp =
    prot.tx_iban === true
      ? signRenderToken("tx_recipient_iban", tx.id, sessionId)
      : sha256Hex(recipientIban);

  const fingerprints: ExpectedFingerprint[] = [
    { protected_id: "tx-amount", fingerprint: amountFp },
    {
      protected_id: "tx-direction",
      fingerprint: sha256Hex(DIRECTION_LABEL[locale][tx.direction]),
    },
    { protected_id: "tx-date", fingerprint: sha256Hex(formatDateTime(tx.booked_at)) },
    { protected_id: "tx-sender-name", fingerprint: sha256Hex(senderName) },
    { protected_id: "tx-sender-iban", fingerprint: senderIbanFp },
    { protected_id: "tx-recipient-name", fingerprint: sha256Hex(recipientName) },
    { protected_id: "tx-recipient-iban", fingerprint: recipientIbanFp },
    { protected_id: "tx-reference", fingerprint: sha256Hex(tx.reference) },
  ];

  return { fingerprints, tx, account };
}
