import type { FastifyInstance } from "fastify";
import { pool, withRetry } from "../lib/db.js";
import { hashPassword } from "../lib/hash.js";
import { DEMO_USERS } from "../lib/demo-users.js";

export async function seedDemoUsers(app: FastifyInstance): Promise<void> {
  await withRetry(async () => {
    for (const u of DEMO_USERS) {
      const exists = await pool.query<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        [u.email],
      );
      if (exists.rowCount && exists.rowCount > 0) continue;
      const hash = await hashPassword(u.password);
      await pool.query(
        "INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
        [u.email, u.display_name, hash],
      );
      app.log.info({ email: u.email }, "seeded demo user");
    }
  });
}
