// Shared helper: given a user, idempotently create their banking account
// + initial transactions. Used by both the boot-time demo seeder and by
// the admin "create user" endpoint.

import crypto from "node:crypto";
import { pool } from "./db.js";
import { generateAccount, generateTransactions } from "./seed.js";

export async function ensureAccountForUser(
  userId: string,
  holderName: string,
): Promise<void> {
  const existing = await pool.query("SELECT 1 FROM accounts WHERE user_id = $1", [userId]);
  if (existing.rowCount && existing.rowCount > 0) return;

  const seedHex = crypto.createHash("sha256").update(userId).digest("hex");
  const account = generateAccount(seedHex, holderName);
  const transactions = generateTransactions(seedHex);

  await pool.query(
    `INSERT INTO accounts (id, user_id, iban, holder_name, balance_cents)
     VALUES ($1, $2, $3, $4, $5)`,
    [account.id, userId, account.iban, account.holder_name, account.balance_cents],
  );

  for (const tx of transactions) {
    await pool.query(
      `INSERT INTO transactions (
         id, account_id, direction, type, amount_cents,
         counterparty_name, counterparty_iban, reference, booked_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tx.id,
        account.id,
        tx.direction,
        tx.type,
        tx.amount_cents,
        tx.counterparty_name,
        tx.counterparty_iban,
        tx.reference,
        tx.booked_at,
      ],
    );
  }
}
