import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { pool } from "./db.js";
import { effectiveStrikeCountSql } from "./strikes.js";

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  seed: string;
  strike_count: number;
  locked_at: Date | null;
}

declare module "fastify" {
  interface FastifyRequest {
    bs?: { user: AuthUser; session: AuthSession };
  }
  interface FastifyInstance {
    requireSession: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sid: string; uid: string };
    user: { sid: string; uid: string };
  }
}

export const SESSION_COOKIE_NAME = "bs_session";

export function makeSeed(userId: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  return crypto
    .createHash("sha256")
    .update(`${userId}|${Date.now()}|${nonce}`)
    .digest("hex");
}

export async function createSession(userId: string): Promise<AuthSession> {
  const seed = makeSeed(userId);
  const { rows } = await pool.query<AuthSession>(
    `INSERT INTO sessions (user_id, seed)
     VALUES ($1, $2)
     RETURNING id, user_id, seed, strike_count, locked_at`,
    [userId, seed],
  );
  return rows[0]!;
}

export async function loadSessionWithUser(
  sessionId: string,
): Promise<{ session: AuthSession; user: AuthUser } | null> {
  const { rows } = await pool.query<AuthSession & { email: string; display_name: string }>(
    `SELECT s.id, s.user_id, s.seed,
            ${effectiveStrikeCountSql("s")} AS strike_count,
            s.locked_at,
            u.email, u.display_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1`,
    [sessionId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    session: {
      id: row.id,
      user_id: row.user_id,
      seed: row.seed,
      strike_count: row.strike_count,
      locked_at: row.locked_at,
    },
    user: { id: row.user_id, email: row.email, display_name: row.display_name },
  };
}

export async function touchSession(sessionId: string): Promise<void> {
  await pool.query("UPDATE sessions SET last_seen_at = NOW() WHERE id = $1", [sessionId]);
}

export function registerRequireSessionHook(app: FastifyInstance): void {
  app.decorate("requireSession", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    const payload = request.user;
    const found = await loadSessionWithUser(payload.sid);
    if (!found) {
      reply.code(401).send({ error: "session_not_found" });
      return;
    }
    if (found.session.locked_at) {
      reply.code(423).send({ error: "session_locked" });
      return;
    }
    request.bs = found;
    await touchSession(found.session.id);
  });
}
