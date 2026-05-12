import type { FastifyInstance } from "fastify";
import { pool, withRetry } from "../lib/db.js";
import { ensureAccountForUser } from "../lib/seed-user-data.js";

export async function seedDemoAccounts(app: FastifyInstance): Promise<void> {
  await withRetry(async () => {
    const { rows: users } = await pool.query<{ id: string; display_name: string }>(
      `SELECT u.id, u.display_name
         FROM users u
         LEFT JOIN accounts a ON a.user_id = u.id
        WHERE a.id IS NULL`,
    );

    for (const user of users) {
      await ensureAccountForUser(user.id, user.display_name);
      app.log.info({ user_id: user.id }, "seeded demo account");
    }
  });
}
