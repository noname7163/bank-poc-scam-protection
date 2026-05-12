// Separate auth track for the admin UI. Same JWT secret as the banking
// session for simplicity, but a different cookie name (`bs_admin`) and a
// distinct payload field (`aid`) so the two cookies cannot be mixed up.

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { pool } from "./db.js";

export interface AdminPrincipal {
  id: string;
  username: string;
}

declare module "fastify" {
  interface FastifyRequest {
    admin?: AdminPrincipal;
  }
  interface FastifyInstance {
    requireAdminSession: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const ADMIN_COOKIE_NAME = "bs_admin";

interface AdminTokenPayload {
  aid: string;
  kind: "admin";
}

function isAdminPayload(p: unknown): p is AdminTokenPayload {
  return (
    typeof p === "object" &&
    p !== null &&
    (p as Record<string, unknown>).kind === "admin" &&
    typeof (p as Record<string, unknown>).aid === "string"
  );
}

async function loadAdmin(adminId: string): Promise<AdminPrincipal | null> {
  const { rows } = await pool.query<AdminPrincipal>(
    "SELECT id, username FROM admin_accounts WHERE id = $1",
    [adminId],
  );
  return rows[0] ?? null;
}

export function registerRequireAdminHook(app: FastifyInstance): void {
  app.decorate(
    "requireAdminSession",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.cookies?.[ADMIN_COOKIE_NAME];
      if (!token) {
        reply.code(401).send({ error: "admin_unauthorized" });
        return;
      }
      let payload: unknown;
      try {
        payload = app.jwt.verify(token);
      } catch {
        reply.code(401).send({ error: "admin_unauthorized" });
        return;
      }
      if (!isAdminPayload(payload)) {
        reply.code(401).send({ error: "admin_unauthorized" });
        return;
      }
      const admin = await loadAdmin(payload.aid);
      if (!admin) {
        reply.code(401).send({ error: "admin_unknown" });
        return;
      }
      request.admin = admin;
    },
  );
}

export function signAdminToken(app: FastifyInstance, adminId: string): string {
  const payload: AdminTokenPayload = { aid: adminId, kind: "admin" };
  return app.jwt.sign(payload);
}
