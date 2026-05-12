import type { FastifyInstance } from "fastify";
import { recordTamper } from "../lib/strikes.js";

interface ReportBody {
  reason?: string;
  details?: Record<string, unknown>;
  page?: string;
}

export async function quarantineRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: ReportBody }>(
    "/api/quarantine/report",
    { onRequest: [app.requireSession] },
    async (request, reply) => {
      const { session } = request.bs!;
      const body = request.body ?? {};
      const reason = typeof body.reason === "string" ? body.reason : "unspecified";
      const page = typeof body.page === "string" ? body.page : null;
      const details = (body.details ?? {}) as Record<string, unknown>;

      const result = await recordTamper(request.log, session.id, reason, page, details);

      return reply.send({
        strike_count: result.strike_count,
        locked: result.locked,
        max_strikes: result.max_strikes,
      });
    },
  );

  // Cheap read-only endpoint the /quarantine page can use to refresh the
  // counter without going through the locked-aware requireSession hook.
  app.get(
    "/api/quarantine/status",
    { onRequest: [app.requireSession] },
    async (request) => {
      const { session } = request.bs!;
      return {
        strike_count: session.strike_count,
        locked: Boolean(session.locked_at),
      };
    },
  );
}
