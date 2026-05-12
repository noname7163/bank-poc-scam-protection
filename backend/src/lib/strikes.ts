// Centralised strike-count increment + structured logging.
// The lock threshold is configurable per user (users.max_strikes).

import type { FastifyBaseLogger } from "fastify";
import { pool } from "./db.js";

export const DEFAULT_MAX_STRIKES = 3;
export const STRIKE_DECAY_INTERVAL = "1 hour";

/**
 * SQL expression that returns the *effective* strike count for a session
 * row aliased as `s` (or whatever alias is passed). Strikes auto-decay to
 * 0 after STRIKE_DECAY_INTERVAL of inactivity, except when the session is
 * already locked — locked sessions keep showing the value that triggered
 * the lock.
 */
export function effectiveStrikeCountSql(alias = "s"): string {
  return `CASE
            WHEN ${alias}.locked_at IS NOT NULL THEN ${alias}.strike_count
            WHEN ${alias}.last_strike_at IS NULL
              OR ${alias}.last_strike_at < NOW() - INTERVAL '${STRIKE_DECAY_INTERVAL}'
              THEN 0
            ELSE ${alias}.strike_count
          END`;
}

export interface StrikeResult {
  strike_count: number;
  locked: boolean;
  max_strikes: number;
}

export async function recordTamper(
  log: FastifyBaseLogger,
  sessionId: string,
  reason: string,
  page: string | null,
  details: Record<string, unknown>,
): Promise<StrikeResult> {
  // 1. Log the event for the demo viewer.
  await pool.query(
    `INSERT INTO quarantine_events (session_id, reason, page, details)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, reason, page, details],
  );

  // 2. Pull this user's configured threshold.
  const { rows: userRows } = await pool.query<{ max_strikes: number }>(
    `SELECT u.max_strikes
       FROM users u
       JOIN sessions s ON s.user_id = u.id
      WHERE s.id = $1`,
    [sessionId],
  );
  const max_strikes = userRows[0]?.max_strikes ?? DEFAULT_MAX_STRIKES;

  // 3. Increment strike count; if the last strike was more than
  // STRIKE_DECAY_INTERVAL ago, reset back to 1 instead of += 1. Lock the
  // session if we hit the threshold.
  const { rows } = await pool.query<{
    strike_count: number;
    locked_at: Date | null;
    user_id: string;
  }>(
    `WITH new_count AS (
       SELECT id,
              CASE
                WHEN last_strike_at IS NULL
                  OR last_strike_at < NOW() - INTERVAL '${STRIKE_DECAY_INTERVAL}'
                  THEN 1
                ELSE strike_count + 1
              END AS next_count
         FROM sessions
        WHERE id = $1
     )
     UPDATE sessions s
        SET strike_count   = nc.next_count,
            last_strike_at = NOW(),
            locked_at      = CASE
                               WHEN s.locked_at IS NULL AND nc.next_count >= $2
                                 THEN NOW()
                               ELSE s.locked_at
                             END
       FROM new_count nc
      WHERE s.id = nc.id
      RETURNING s.strike_count, s.locked_at, s.user_id`,
    [sessionId, max_strikes],
  );

  const row = rows[0];
  const strike_count = row?.strike_count ?? 0;
  const locked = Boolean(row?.locked_at);

  // 4. Propagate the lock to the user, so re-login with the same account
  // is refused. Other demo accounts on the same DB stay usable.
  if (locked && row) {
    await pool.query(
      "UPDATE users SET locked_at = NOW() WHERE id = $1 AND locked_at IS NULL",
      [row.user_id],
    );
  }

  log.warn(
    {
      event: "tamper_recorded",
      session_id: sessionId,
      reason,
      page,
      strike_count,
      max_strikes,
      locked,
      details,
    },
    "tamper recorded",
  );

  return { strike_count, locked, max_strikes };
}
