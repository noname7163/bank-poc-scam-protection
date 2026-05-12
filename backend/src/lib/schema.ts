// Idempotent schema reconciliation. Runs on every backend boot so that
// schema changes between milestones don't require wiping the DB volume.
// The same DDL is also in db/init.sql for clean first-time setups.

import { pool, withRetry } from "./db.js";

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email         TEXT UNIQUE NOT NULL,
     display_name  TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     locked_at     TIMESTAMPTZ,
     max_strikes   INT NOT NULL DEFAULT 3,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS max_strikes INT NOT NULL DEFAULT 3`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     seed            TEXT NOT NULL,
     strike_count    INT NOT NULL DEFAULT 0,
     last_strike_at  TIMESTAMPTZ,
     locked_at       TIMESTAMPTZ,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_strike_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS accounts (
     id               TEXT PRIMARY KEY,
     user_id          UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     iban             TEXT NOT NULL,
     holder_name      TEXT NOT NULL,
     balance_cents    BIGINT NOT NULL,
     image_protection JSONB NOT NULL DEFAULT '{}'::jsonb,
     created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS image_protection JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `CREATE TABLE IF NOT EXISTS transactions (
     id                TEXT PRIMARY KEY,
     account_id        TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     direction         TEXT NOT NULL CHECK (direction IN ('in', 'out')),
     type              TEXT NOT NULL,
     amount_cents      BIGINT NOT NULL,
     counterparty_name TEXT NOT NULL,
     counterparty_iban TEXT NOT NULL,
     reference         TEXT NOT NULL,
     booked_at         TIMESTAMPTZ NOT NULL,
     created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS transactions_account_id_idx
     ON transactions(account_id)`,
  `CREATE TABLE IF NOT EXISTS quarantine_events (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
     reason      TEXT NOT NULL,
     details     JSONB,
     page        TEXT,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS quarantine_events_session_id_idx
     ON quarantine_events(session_id)`,
  `CREATE TABLE IF NOT EXISTS admin_accounts (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     username      TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
];

export async function ensureSchema(): Promise<void> {
  await withRetry(async () => {
    for (const sql of STATEMENTS) {
      await pool.query(sql);
    }
  });
}
