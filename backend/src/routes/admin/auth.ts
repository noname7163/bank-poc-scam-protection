import type { FastifyInstance } from "fastify";
import { pool } from "../../lib/db.js";
import { verifyPassword } from "../../lib/hash.js";
import {
  ADMIN_COOKIE_NAME,
  signAdminToken,
} from "../../lib/admin-session.js";

interface LoginBody {
  username: string;
  password: string;
}

export async function adminAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>("/api/admin/auth/login", async (request, reply) => {
    const { username, password } = request.body ?? ({} as LoginBody);
    if (typeof username !== "string" || typeof password !== "string") {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const { rows } = await pool.query<{
      id: string;
      username: string;
      password_hash: string;
    }>("SELECT id, username, password_hash FROM admin_accounts WHERE username = $1", [
      username.trim(),
    ]);
    const admin = rows[0];
    if (!admin) return reply.code(401).send({ error: "invalid_credentials" });
    const ok = await verifyPassword(password, admin.password_hash);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

    const token = signAdminToken(app, admin.id);
    reply.setCookie(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return { admin: { id: admin.id, username: admin.username } };
  });

  app.post("/api/admin/auth/logout", async (_request, reply) => {
    reply.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get(
    "/api/admin/auth/me",
    { onRequest: [app.requireAdminSession] },
    async (request) => ({ admin: request.admin! }),
  );
}
