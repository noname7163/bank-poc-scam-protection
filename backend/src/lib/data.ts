// DB readers for the bank-side data.

import { pool } from "./db.js";
import type { Transaction } from "./seed.js";

export interface ImageProtection {
  balance?: boolean;
  tx_amount?: boolean;
  tx_iban?: boolean;
}

export interface StoredAccount {
  id: string;
  iban: string;
  holder_name: string;
  balance_cents: number;
  image_protection: ImageProtection;
}

export interface StoredTransaction extends Omit<Transaction, "booked_at"> {
  booked_at: Date;
}

export async function loadAccountByUser(userId: string): Promise<StoredAccount | null> {
  const { rows } = await pool.query<StoredAccount>(
    `SELECT id, iban, holder_name, balance_cents, image_protection
       FROM accounts
      WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function loadTransactionsByUser(userId: string): Promise<StoredTransaction[]> {
  const { rows } = await pool.query<StoredTransaction>(
    `SELECT t.id, t.direction, t.type, t.amount_cents,
            t.counterparty_name, t.counterparty_iban, t.reference, t.booked_at
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
      WHERE a.user_id = $1
      ORDER BY t.booked_at DESC`,
    [userId],
  );
  return rows;
}

export async function loadTransactionForUser(
  userId: string,
  txId: string,
): Promise<StoredTransaction | null> {
  const { rows } = await pool.query<StoredTransaction>(
    `SELECT t.id, t.direction, t.type, t.amount_cents,
            t.counterparty_name, t.counterparty_iban, t.reference, t.booked_at
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
      WHERE a.user_id = $1 AND t.id = $2`,
    [userId, txId],
  );
  return rows[0] ?? null;
}
