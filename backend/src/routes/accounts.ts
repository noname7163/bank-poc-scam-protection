import type { FastifyInstance } from "fastify";
import { loadAccountByUser } from "../lib/data.js";
import { renderUrl } from "../lib/render-tokens.js";

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/accounts/me", { onRequest: [app.requireSession] }, async (request, reply) => {
    const { session, user } = request.bs!;
    const account = await loadAccountByUser(user.id);
    if (!account) {
      return reply.code(500).send({ error: "account_missing" });
    }

    const render_urls: Record<string, string> = {};
    if (account.image_protection?.balance === true) {
      render_urls.balance = renderUrl("balance", account.id, session.id);
    }

    return { account: { ...account, render_urls } };
  });
}
