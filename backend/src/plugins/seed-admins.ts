import type { FastifyInstance } from "fastify";
import { pool, withRetry } from "../lib/db.js";
import { hashPassword } from "../lib/hash.js";

// Upsert: rotates the password every boot to match ADMIN_PASSWORD in .env.
// Useful in dev — change the env, restart backend, new password applies.
export async function seedAdminAccount(app: FastifyInstance): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    app.log.warn("ADMIN_USERNAME/ADMIN_PASSWORD missing — admin login disabled");
    return;
  }

  await withRetry(async () => {
    const hash = await hashPassword(password);
    await pool.query(
      `INSERT INTO admin_accounts (username, password_hash)
            VALUES ($1, $2)
       ON CONFLICT (username)
       DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [username, hash],
    );
    app.log.info({ username }, "seeded/updated admin account");
  });
}
