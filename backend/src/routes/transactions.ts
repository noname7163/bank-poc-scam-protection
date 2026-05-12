import type { FastifyInstance } from "fastify";
import {
  loadAccountByUser,
  loadTransactionForUser,
  loadTransactionsByUser,
} from "../lib/data.js";
import { renderUrl } from "../lib/render-tokens.js";

export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/transactions", { onRequest: [app.requireSession] }, async (request) => {
    const { user } = request.bs!;
    const transactions = await loadTransactionsByUser(user.id);
    return { transactions };
  });

  app.get<{ Params: { id: string } }>(
    "/api/transactions/:id",
    { onRequest: [app.requireSession] },
    async (request, reply) => {
      const { session, user } = request.bs!;
      const tx = await loadTransactionForUser(user.id, request.params.id);
      if (!tx) {
        return reply.code(404).send({ error: "not_found" });
      }

      const account = await loadAccountByUser(user.id);
      const protection = account?.image_protection ?? {};

      const render_urls: Record<string, string> = {};
      if (protection.tx_amount === true) {
        render_urls.tx_amount = renderUrl("tx_amount", tx.id, session.id);
      }
      if (protection.tx_iban === true) {
        render_urls.tx_sender_iban = renderUrl("tx_sender_iban", tx.id, session.id);
        render_urls.tx_recipient_iban = renderUrl("tx_recipient_iban", tx.id, session.id);
      }

      return { transaction: { ...tx, render_urls } };
    },
  );
}
