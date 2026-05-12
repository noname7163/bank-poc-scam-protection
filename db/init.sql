-- Banking Shield — database initialisation.
--
-- This file is mounted into the postgres container's
-- /docker-entrypoint-initdb.d directory and runs exactly once, when the
-- volume is first created. To re-run it after schema changes, run:
--
--   docker compose down -v && docker compose up --build

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  locked_at     TIMESTAMPTZ,
  max_strikes   INT NOT NULL DEFAULT 3,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed            TEXT NOT NULL,
  strike_count    INT NOT NULL DEFAULT 0,
  last_strike_at  TIMESTAMPTZ,
  locked_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS accounts (
  id               TEXT PRIMARY KEY,
  user_id          UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iban             TEXT NOT NULL,
  holder_name      TEXT NOT NULL,
  balance_cents    BIGINT NOT NULL,
  image_protection JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
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
);

CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);

CREATE TABLE IF NOT EXISTS quarantine_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  details     JSONB,
  page        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quarantine_events_session_id_idx
  ON quarantine_events(session_id);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
