import type { FastifyInstance } from "fastify";
import {
  expectedFingerprintsForOverview,
  expectedFingerprintsForTransaction,
  normalizeLocale,
  type ExpectedFingerprint,
} from "../lib/fingerprints.js";
import { issueNonce } from "../lib/nonces.js";
import { recordTamper } from "../lib/strikes.js";

interface ClientFingerprint {
  protected_id: string;
  fingerprint: string;
}

interface VerifyBody {
  page?: string;
  page_context?: Record<string, unknown>;
  fingerprints?: ClientFingerprint[];
  locale?: string;
}

export async function verifyRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: VerifyBody }>(
    "/api/verify",
    { onRequest: [app.requireSession] },
    async (request, reply) => {
      const { user, session } = request.bs!;
      const body = request.body ?? {};
      const page = typeof body.page === "string" ? body.page : "";
      const ctx = (body.page_context ?? {}) as Record<string, unknown>;
      const clientFps = Array.isArray(body.fingerprints) ? body.fingerprints : [];

      const locale = normalizeLocale(body.locale);
      const expected = await buildExpected(page, ctx, user.id, session.id, locale);
      if (expected === null) {
        return reply.code(400).send({ error: "invalid_page_context" });
      }

      const mismatches = compareFingerprints(expected, clientFps);

      if (mismatches.length > 0) {
        const strike = await recordTamper(
          request.log,
          session.id,
          "verify_mismatch",
          page,
          { element_ids: mismatches },
        );
        return reply.send({
          status: "mismatch",
          element_ids: mismatches,
          strike_count: strike.strike_count,
          locked: strike.locked,
          max_strikes: strike.max_strikes,
        });
      }

      const { nonce, expires_at } = issueNonce(session.id);
      return reply.send({
        status: "ok",
        nonce,
        nonce_expires_at: expires_at,
      });
    },
  );
}

async function buildExpected(
  page: string,
  ctx: Record<string, unknown>,
  userId: string,
  sessionId: string,
  locale: ReturnType<typeof normalizeLocale>,
): Promise<ExpectedFingerprint[] | null> {
  if (page === "overview") {
    return expectedFingerprintsForOverview(userId, sessionId);
  }
  if (page === "transaction") {
    const txId = typeof ctx.tx_id === "string" ? ctx.tx_id : null;
    if (!txId) return null;
    const result = await expectedFingerprintsForTransaction(userId, txId, sessionId, locale);
    if (!result) return null;
    return result.fingerprints;
  }
  return null;
}

function compareFingerprints(
  expected: ExpectedFingerprint[],
  client: ClientFingerprint[],
): string[] {
  const clientMap = new Map<string, string>();
  for (const c of client) {
    if (typeof c?.protected_id === "string" && typeof c?.fingerprint === "string") {
      clientMap.set(c.protected_id, c.fingerprint);
    }
  }
  const mismatches: string[] = [];
  for (const e of expected) {
    const got = clientMap.get(e.protected_id);
    if (!got || got !== e.fingerprint) {
      mismatches.push(e.protected_id);
    }
  }
  return mismatches;
}
