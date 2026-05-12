import type { FastifyInstance } from "fastify";
import { pool } from "../../lib/db.js";
import { effectiveStrikeCountSql } from "../../lib/strikes.js";

interface ImageProtectionPatch {
  balance?: boolean;
  tx_amount?: boolean;
  tx_iban?: boolean;
}

interface AccountPatchBody {
  balance_cents?: number;
  iban?: string;
  holder_name?: string;
  image_protection?: ImageProtectionPatch;
}

const PROTECTION_KEYS = ["balance", "tx_amount", "tx_iban"] as const;

function sanitizeImageProtection(raw: unknown): ImageProtectionPatch | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const cleaned: ImageProtectionPatch = {};
  for (const key of PROTECTION_KEYS) {
    if (key in r) {
      if (typeof r[key] !== "boolean") return null;
      cleaned[key] = r[key] as boolean;
    }
  }
  return cleaned;
}

export async function adminAccountRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { userId: string } }>(
    "/api/admin/accounts/:userId",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const { rows } = await pool.query(
        `SELECT a.id, a.user_id, a.iban, a.holder_name, a.balance_cents,
                a.image_protection,
                u.email, u.display_name AS user_display_name,
                u.max_strikes, u.locked_at AS user_locked_at,
                COALESCE(latest.strike_count, 0) AS strike_count
           FROM accounts a
           JOIN users u ON u.id = a.user_id
           LEFT JOIN LATERAL (
             SELECT ${effectiveStrikeCountSql("s")} AS strike_count
               FROM sessions s
              WHERE s.user_id = u.id
              ORDER BY s.created_at DESC
              LIMIT 1
           ) latest ON true
          WHERE a.user_id = $1`,
        [request.params.userId],
      );
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return reply.code(404).send({ error: "not_found" });
      return {
        account: {
          id: row.id,
          user_id: row.user_id,
          iban: row.iban,
          holder_name: row.holder_name,
          balance_cents: row.balance_cents,
          image_protection: row.image_protection ?? {},
        },
        user: {
          id: row.user_id,
          email: row.email,
          display_name: row.user_display_name,
          max_strikes: row.max_strikes,
          locked_at: row.user_locked_at,
          strike_count: row.strike_count,
        },
      };
    },
  );

  app.put<{ Params: { userId: string }; Body: AccountPatchBody }>(
    "/api/admin/accounts/:userId",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const body = request.body ?? {};
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (typeof body.balance_cents === "number" && Number.isFinite(body.balance_cents)) {
        fields.push(`balance_cents = $${idx++}`);
        values.push(Math.trunc(body.balance_cents));
      }
      if (typeof body.iban === "string" && body.iban.trim().length > 0) {
        fields.push(`iban = $${idx++}`);
        values.push(body.iban.trim());
      }
      if (typeof body.holder_name === "string" && body.holder_name.trim().length > 0) {
        fields.push(`holder_name = $${idx++}`);
        values.push(body.holder_name.trim());
      }
      if (body.image_protection !== undefined) {
        const cleaned = sanitizeImageProtection(body.image_protection);
        if (cleaned === null) {
          return reply.code(400).send({ error: "invalid_image_protection" });
        }
        // Merge into existing JSONB so missing keys don't get wiped.
        fields.push(`image_protection = image_protection || $${idx++}::jsonb`);
        values.push(JSON.stringify(cleaned));
      }
      if (fields.length === 0) {
        return reply.code(400).send({ error: "no_fields" });
      }

      values.push(request.params.userId);
      const { rows } = await pool.query(
        `UPDATE accounts SET ${fields.join(", ")}
          WHERE user_id = $${idx}
        RETURNING id, user_id, iban, holder_name, balance_cents, image_protection`,
        values,
      );
      if (rows.length === 0) return reply.code(404).send({ error: "not_found" });
      request.log.info(
        { user_id: request.params.userId, by: request.admin?.username },
        "admin updated account",
      );
      return { account: rows[0] };
    },
  );
}
