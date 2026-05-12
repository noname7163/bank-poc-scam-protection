import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { pool } from "../../lib/db.js";

const VALID_DIRECTIONS = new Set(["in", "out"]);
const VALID_TYPES = new Set([
  "salary",
  "rent",
  "groceries",
  "transfer",
  "subscription",
  "refund",
  "purchase",
  "other",
]);

interface TxBody {
  direction?: string;
  type?: string;
  amount_cents?: number;
  counterparty_name?: string;
  counterparty_iban?: string;
  reference?: string;
  booked_at?: string;
}

function newTxId(): string {
  return `tx_${crypto.randomBytes(3).toString("hex")}`;
}

function normalizeTx(body: TxBody, partial: boolean): {
  errors: string[];
  values: Record<string, unknown>;
} {
  const errors: string[] = [];
  const values: Record<string, unknown> = {};

  if (body.direction !== undefined) {
    if (typeof body.direction !== "string" || !VALID_DIRECTIONS.has(body.direction)) {
      errors.push("direction");
    } else values.direction = body.direction;
  } else if (!partial) errors.push("direction");

  if (body.type !== undefined) {
    if (typeof body.type !== "string" || !VALID_TYPES.has(body.type)) errors.push("type");
    else values.type = body.type;
  } else if (!partial) errors.push("type");

  if (body.amount_cents !== undefined) {
    if (typeof body.amount_cents !== "number" || !Number.isFinite(body.amount_cents) || body.amount_cents < 0) {
      errors.push("amount_cents");
    } else values.amount_cents = Math.trunc(body.amount_cents);
  } else if (!partial) errors.push("amount_cents");

  for (const key of ["counterparty_name", "counterparty_iban", "reference"] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string" || (body[key] as string).trim().length === 0) {
        errors.push(key);
      } else values[key] = (body[key] as string).trim();
    } else if (!partial) errors.push(key);
  }

  if (body.booked_at !== undefined) {
    if (typeof body.booked_at !== "string" || Number.isNaN(Date.parse(body.booked_at))) {
      errors.push("booked_at");
    } else values.booked_at = body.booked_at;
  } else if (!partial) values.booked_at = new Date().toISOString();

  return { errors, values };
}

export async function adminTransactionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { userId: string } }>(
    "/api/admin/accounts/:userId/transactions",
    { onRequest: [app.requireAdminSession] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT t.id, t.direction, t.type, t.amount_cents,
                t.counterparty_name, t.counterparty_iban, t.reference, t.booked_at
           FROM transactions t
           JOIN accounts a ON a.id = t.account_id
          WHERE a.user_id = $1
          ORDER BY t.booked_at DESC`,
        [request.params.userId],
      );
      return { transactions: rows };
    },
  );

  app.post<{ Params: { userId: string }; Body: TxBody }>(
    "/api/admin/accounts/:userId/transactions",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const { rows: accs } = await pool.query<{ id: string }>(
        "SELECT id FROM accounts WHERE user_id = $1",
        [request.params.userId],
      );
      const account = accs[0];
      if (!account) return reply.code(404).send({ error: "account_not_found" });

      const { errors, values } = normalizeTx(request.body ?? {}, false);
      if (errors.length > 0) {
        return reply.code(400).send({ error: "invalid_body", fields: errors });
      }

      const id = newTxId();
      const { rows } = await pool.query(
        `INSERT INTO transactions (
           id, account_id, direction, type, amount_cents,
           counterparty_name, counterparty_iban, reference, booked_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, direction, type, amount_cents,
                   counterparty_name, counterparty_iban, reference, booked_at`,
        [
          id,
          account.id,
          values.direction,
          values.type,
          values.amount_cents,
          values.counterparty_name,
          values.counterparty_iban,
          values.reference,
          values.booked_at,
        ],
      );
      return reply.code(201).send({ transaction: rows[0] });
    },
  );

  app.put<{ Params: { id: string }; Body: TxBody }>(
    "/api/admin/transactions/:id",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const { errors, values } = normalizeTx(request.body ?? {}, true);
      if (Object.keys(values).length === 0) {
        return reply.code(400).send({ error: "no_fields", fields: errors });
      }
      if (errors.length > 0) {
        return reply.code(400).send({ error: "invalid_body", fields: errors });
      }

      const setClauses: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(values)) {
        setClauses.push(`${k} = $${idx++}`);
        params.push(v);
      }
      params.push(request.params.id);
      const { rows } = await pool.query(
        `UPDATE transactions SET ${setClauses.join(", ")}
          WHERE id = $${idx}
         RETURNING id, direction, type, amount_cents,
                   counterparty_name, counterparty_iban, reference, booked_at`,
        params,
      );
      if (rows.length === 0) return reply.code(404).send({ error: "not_found" });
      return { transaction: rows[0] };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/admin/transactions/:id",
    { onRequest: [app.requireAdminSession] },
    async (request, reply) => {
      const { rowCount } = await pool.query("DELETE FROM transactions WHERE id = $1", [
        request.params.id,
      ]);
      if (rowCount === 0) return reply.code(404).send({ error: "not_found" });
      return reply.code(204).send();
    },
  );
}
