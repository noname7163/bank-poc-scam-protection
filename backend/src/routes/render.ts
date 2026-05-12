import type { FastifyInstance } from "fastify";
import {
  loadAccountByUser,
  loadTransactionForUser,
} from "../lib/data.js";
import {
  renderAmountPng,
  renderBalancePng,
  renderIbanPng,
} from "../lib/render.js";
import {
  isRenderType,
  verifyRenderToken,
  type RenderType,
} from "../lib/render-tokens.js";

interface Query {
  token?: string;
}

interface Params {
  type: string;
  id: string;
}

export async function renderRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: Params; Querystring: Query }>(
    "/api/render/:type/:id",
    { onRequest: [app.requireSession] },
    async (request, reply) => {
      const { user, session } = request.bs!;
      const { type: rawType, id } = request.params;
      const token = request.query?.token;

      if (!isRenderType(rawType)) {
        return reply.code(404).send({ error: "unknown_render_type" });
      }
      const type = rawType as RenderType;

      if (typeof token !== "string" || token.length === 0) {
        return reply.code(401).send({ error: "missing_token" });
      }
      if (!verifyRenderToken(type, id, session.id, token)) {
        return reply.code(401).send({ error: "invalid_token" });
      }

      const png = await renderForType(type, id, user.id);
      if (!png) return reply.code(404).send({ error: "not_found" });

      reply
        .header("Content-Type", "image/png")
        .header("Cache-Control", "no-store, no-cache, must-revalidate, private")
        .header("Pragma", "no-cache")
        .header("X-Content-Type-Options", "nosniff");
      return reply.send(png);
    },
  );
}

async function renderForType(
  type: RenderType,
  id: string,
  userId: string,
): Promise<Buffer | null> {
  if (type === "balance") {
    const account = await loadAccountByUser(userId);
    if (!account || account.id !== id) return null;
    return renderBalancePng(account.balance_cents);
  }

  // The remaining types all live on a transaction owned by this user.
  const tx = await loadTransactionForUser(userId, id);
  if (!tx) return null;

  if (type === "tx_amount") {
    return renderAmountPng(tx.direction, tx.amount_cents);
  }

  // For IBAN tokens we need to know which side is which. On outgoing
  // transactions the sender is the user; on incoming, the recipient.
  const account = await loadAccountByUser(userId);
  if (!account) return null;

  if (type === "tx_sender_iban") {
    const iban = tx.direction === "in" ? tx.counterparty_iban : account.iban;
    return renderIbanPng(iban);
  }
  if (type === "tx_recipient_iban") {
    const iban = tx.direction === "in" ? account.iban : tx.counterparty_iban;
    return renderIbanPng(iban);
  }
  return null;
}
