import type { FastifyInstance } from "fastify";
import { pool } from "../../lib/db.js";
import { hashPassword } from "../../lib/hash.js";
import { ensureAccountForUser } from "../../lib/seed-user-data.js";
import { effectiveStrikeCountSql } from "../../lib/strikes.js";

interface UserSummaryRow {
  id: string;
  email: string;
  display_name: string;
  user_locked_at: Date | null;
  max_strikes: number;
  account_id: string | null;
  iban: string | null;
  holder_name: string | null;
  balance_cents: number | null;
  strike_count: number;
}

interface CreateUserBody {
  email?: string;
  display_name?: string;
  password?: string;
  max_strikes?: number;
}

interface PatchUserBody {
  display_name?: string;
  password?: string;
  max_strikes?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 4;
const MS_MIN = 1;
const MS_MAX = 50;

function clampMaxStrikes(n: number): number {
  return Math.max(MS_MIN, Math.min(MS_MAX, Math.trunc(n)));
}

export async function adminUserRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/admin/users",
    { onRequest: [app.requireAdminSession] },
    async () => {
      const { rows } = await pool.query<UserSummaryRow>(
        `SELECT u.id,
                u.email,
                u.display_name,
                u.locked_at   AS user_locked_at,
                u.max_strikes,
                a.id          AS account_id,
                a.iban,
                a.holder_name,
                a.balance_cents,
                COALESCE(latest.strike_count, 0) AS strike_count
           FROM users u
           LEFT JOIN accounts a ON a.user_id = u.id
           LEFT JOIN LATERAL (
             SELECT ${effectiveStrikeCountSql("s")} AS strike_count
               FROM sessions s
              WHERE s.user_id = u.id
              ORDER BY s.created_at DESC
              LIMIT 1
           ) latest ON true
          ORDER BY u.email`,
      );
      return { users: rows };
    },
  );

  app.post<{ Body: CreateUserBody }>(
    "/api/admin/users",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const body = request.body ?? {};
      const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
      const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const errors: string[] = [];

      if (!EMAIL_RE.test(email)) errors.push("email");
      if (display_name.length === 0) errors.push("display_name");
      if (password.length < PASSWORD_MIN) errors.push("password");

      const max_strikes =
        typeof body.max_strikes === "number" && Number.isFinite(body.max_strikes)
          ? clampMaxStrikes(body.max_strikes)
          : 3;

      if (errors.length > 0) {
        return reply.code(400).send({ error: "invalid_body", fields: errors });
      }

      const hash = await hashPassword(password);
      let userId: string;
      try {
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO users (email, display_name, password_hash, max_strikes)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [email, display_name, hash, max_strikes],
        );
        userId = rows[0]!.id;
      } catch (err) {
        if ((err as { code?: string }).code === "23505") {
          return reply.code(409).send({ error: "email_taken" });
        }
        throw err;
      }

      await ensureAccountForUser(userId, display_name);

      request.log.info(
        { user_id: userId, email, by: request.admin?.username },
        "admin created user",
      );
      return reply.code(201).send({ user_id: userId });
    },
  );

  app.put<{ Params: { id: string }; Body: PatchUserBody }>(
    "/api/admin/users/:id",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const body = request.body ?? {};
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (typeof body.display_name === "string" && body.display_name.trim().length > 0) {
        fields.push(`display_name = $${idx++}`);
        values.push(body.display_name.trim());
      }
      if (typeof body.max_strikes === "number" && Number.isFinite(body.max_strikes)) {
        fields.push(`max_strikes = $${idx++}`);
        values.push(clampMaxStrikes(body.max_strikes));
      }
      if (typeof body.password === "string" && body.password.length >= PASSWORD_MIN) {
        const hash = await hashPassword(body.password);
        fields.push(`password_hash = $${idx++}`);
        values.push(hash);
      }
      if (fields.length === 0) {
        return reply.code(400).send({ error: "no_fields" });
      }

      values.push(request.params.id);
      const { rowCount } = await pool.query(
        `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}`,
        values,
      );
      if (rowCount === 0) return reply.code(404).send({ error: "not_found" });
      request.log.info(
        { user_id: request.params.id, by: request.admin?.username },
        "admin updated user",
      );
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/admin/users/:id",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [
        request.params.id,
      ]);
      if (rowCount === 0) return reply.code(404).send({ error: "not_found" });
      request.log.info(
        { user_id: request.params.id, by: request.admin?.username },
        "admin deleted user",
      );
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/admin/users/:id/unlock",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const userId = request.params.id;

      const { rowCount } = await pool.query(
        "UPDATE users SET locked_at = NULL WHERE id = $1",
        [userId],
      );
      if (rowCount === 0) {
        return reply.code(404).send({ error: "user_not_found" });
      }
      await pool.query(
        `UPDATE sessions
            SET locked_at = NULL, strike_count = 0, last_strike_at = NULL
          WHERE user_id = $1`,
        [userId],
      );
      request.log.info({ user_id: userId, by: request.admin?.username }, "admin unlocked user");
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/admin/users/:id/reset-strikes",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const userId = request.params.id;
      const { rows } = await pool.query<{ id: string }>(
        "SELECT id FROM users WHERE id = $1",
        [userId],
      );
      if (rows.length === 0) {
        return reply.code(404).send({ error: "user_not_found" });
      }
      // Reset strikes only — lock state stays as-is.
      await pool.query(
        `UPDATE sessions
            SET strike_count = 0, last_strike_at = NULL
          WHERE user_id = $1`,
        [userId],
      );
      request.log.info(
        { user_id: userId, by: request.admin?.username },
        "admin reset strikes",
      );
      return { ok: true };
    },
  );
}
