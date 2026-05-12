// Bootstrap hash check (Layer 5). Public endpoint — no session required,
// because the saved-page detection has to work before a login.
//
// ALLOWED_BUNDLE_HASHES is a comma-separated list of lowercase SHA-256
// hex digests. Leave it empty in dev to accept any hash. Populate it from
// the production build pipeline once we ship.

import type { FastifyInstance } from "fastify";

const ALLOWED = (process.env.ALLOWED_BUNDLE_HASHES ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s.length > 0);

interface Body {
  hash?: unknown;
}

export async function verifyBootstrapRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: Body }>("/api/verify/bootstrap", async (request, reply) => {
    const hash =
      typeof request.body?.hash === "string"
        ? request.body.hash.toLowerCase()
        : null;

    if (ALLOWED.length === 0) {
      return { status: "ok", dev_mode: true };
    }
    if (!hash || !ALLOWED.includes(hash)) {
      request.log.warn(
        { event: "bundle_hash_rejected", hash },
        "bootstrap hash rejected",
      );
      return reply.code(403).send({ status: "rejected" });
    }
    return { status: "ok" };
  });
}
