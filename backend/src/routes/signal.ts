import type { FastifyInstance } from "fastify";

interface SignalBody {
  reason?: string;
  details?: Record<string, unknown>;
  page?: string;
  timestamp?: number;
}

// Soft-signal sink. Logs structured to stdout for the demo viewer, but
// never touches the DB or the strike counter — these signals are too
// noisy to lock anyone on.
export async function signalRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: SignalBody }>(
    "/api/signal",
    { onRequest: [app.requireSession] },
    async (request, reply) => {
      const { session } = request.bs!;
      const body = request.body ?? {};
      request.log.info(
        {
          event: "soft_signal",
          session_id: session.id,
          reason: body.reason ?? "unspecified",
          page: body.page ?? null,
          details: body.details ?? {},
        },
        "soft signal received",
      );
      return reply.code(204).send();
    },
  );
}
