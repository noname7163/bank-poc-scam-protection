import type { FastifyInstance } from "fastify";
import { pool } from "../lib/db.js";
import { DEMO_EMAILS } from "../lib/demo-users.js";
import { verifyPassword } from "../lib/hash.js";
import { createSession, SESSION_COOKIE_NAME } from "../lib/session.js";

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body ?? ({} as LoginBody);
    if (typeof email !== "string" || typeof password !== "string") {
      return reply.code(400).send({ error: "invalid_body" });
    }

    const { rows } = await pool.query<{
      id: string;
      email: string;
      display_name: string;
      password_hash: string;
      locked_at: Date | null;
    }>(
      "SELECT id, email, display_name, password_hash, locked_at FROM users WHERE email = $1",
      [email.toLowerCase().trim()],
    );
    const user = rows[0];
    if (!user) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    if (user.locked_at) {
      return reply.code(423).send({
        error: "account_locked",
        locked_at: user.locked_at,
      });
    }

    const session = await createSession(user.id);
    const token = app.jwt.sign({ sid: session.id, uid: user.id });

    reply.setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return {
      user: { id: user.id, email: user.email, display_name: user.display_name },
    };
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", { onRequest: [app.requireSession] }, async (request) => {
    const { user, session } = request.bs!;
    return {
      user,
      session: {
        id: session.id,
        strike_count: session.strike_count,
        locked: Boolean(session.locked_at),
      },
    };
  });

  // Demo-only: which of the three seeded accounts are locked. Used by the
  // login page dropdown so the demo presenter can see at a glance which
  // user needs bank clarification before re-use.
  app.get("/api/auth/demo-status", async () => {
    const { rows } = await pool.query<{ email: string }>(
      "SELECT email FROM users WHERE email = ANY($1) AND locked_at IS NOT NULL",
      [DEMO_EMAILS],
    );
    return { locked_emails: rows.map((r) => r.email) };
  });
}
