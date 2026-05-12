import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";

import { pool } from "./lib/db.js";
import { ensureSchema } from "./lib/schema.js";
import { registerRequireSessionHook, SESSION_COOKIE_NAME } from "./lib/session.js";
import { registerRequireAdminHook } from "./lib/admin-session.js";
import { seedDemoUsers } from "./plugins/seed-users.js";
import { seedDemoAccounts } from "./plugins/seed-accounts.js";
import { seedAdminAccount } from "./plugins/seed-admins.js";
import { authRoutes } from "./routes/auth.js";
import { accountRoutes } from "./routes/accounts.js";
import { transactionRoutes } from "./routes/transactions.js";
import { verifyRoutes } from "./routes/verify.js";
import { quarantineRoutes } from "./routes/quarantine.js";
import { renderRoutes } from "./routes/render.js";
import { signalRoutes } from "./routes/signal.js";
import { verifyBootstrapRoutes } from "./routes/verify-bootstrap.js";
import { adminAuthRoutes } from "./routes/admin/auth.js";
import { adminUserRoutes } from "./routes/admin/users.js";
import { adminAccountRoutes } from "./routes/admin/accounts.js";
import { adminTransactionRoutes } from "./routes/admin/transactions.js";

const PORT = Number(process.env.BACKEND_PORT ?? 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;

if (!JWT_SECRET) throw new Error("JWT_SECRET is required");
if (!COOKIE_SECRET) throw new Error("COOKIE_SECRET is required");

const app = Fastify({
  logger: {
    transport: { target: "pino-pretty", options: { colorize: true } },
  },
});

await app.register(fastifyCookie, { secret: COOKIE_SECRET });
await app.register(fastifyJwt, {
  secret: JWT_SECRET,
  cookie: { cookieName: SESSION_COOKIE_NAME, signed: false },
});

registerRequireSessionHook(app);
registerRequireAdminHook(app);

app.get("/api/health", async () => {
  const result = await pool.query<{ now: Date }>("SELECT NOW() AS now");
  return {
    status: "ok",
    db_time: result.rows[0]?.now ?? null,
    milestone: "M1",
  };
});

await app.register(authRoutes);
await app.register(accountRoutes);
await app.register(transactionRoutes);
await app.register(verifyRoutes);
await app.register(quarantineRoutes);
await app.register(renderRoutes);
await app.register(signalRoutes);
await app.register(verifyBootstrapRoutes);
await app.register(adminAuthRoutes);
await app.register(adminUserRoutes);
await app.register(adminAccountRoutes);
await app.register(adminTransactionRoutes);

try {
  await ensureSchema();
  await seedDemoUsers(app);
  await seedDemoAccounts(app);
  await seedAdminAccount(app);
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
