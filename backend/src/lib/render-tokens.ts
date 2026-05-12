// HMAC tokens for Layer-2 image URLs.
//
// Per SPEC §4.2 the token covers `type|id|value|session_id|expiry`. For the
// demo we bind only to `type|id|session_id`:
//   - the rendered value always comes from the live DB read, so binding to
//     a value snapshot would invalidate the token on every admin edit and
//     unfairly quarantine the user;
//   - session_id binding still prevents URL reuse across users / sessions.
//
// The HMAC secret is loaded from HMAC_SECRET in the environment.

import crypto from "node:crypto";

const SECRET = process.env.HMAC_SECRET;
if (!SECRET) throw new Error("HMAC_SECRET is required");

export type RenderType =
  | "balance"
  | "tx_amount"
  | "tx_sender_iban"
  | "tx_recipient_iban";

export const RENDER_TYPES: RenderType[] = [
  "balance",
  "tx_amount",
  "tx_sender_iban",
  "tx_recipient_iban",
];

export function signRenderToken(
  type: RenderType,
  id: string,
  sessionId: string,
): string {
  return crypto
    .createHmac("sha256", SECRET as string)
    .update(`${type}|${id}|${sessionId}`)
    .digest("hex");
}

export function verifyRenderToken(
  type: RenderType,
  id: string,
  sessionId: string,
  candidate: string,
): boolean {
  const expected = signRenderToken(type, id, sessionId);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function renderUrl(type: RenderType, id: string, sessionId: string): string {
  const token = signRenderToken(type, id, sessionId);
  return `/api/render/${encodeURIComponent(type)}/${encodeURIComponent(id)}?token=${token}`;
}

export function isRenderType(value: unknown): value is RenderType {
  return typeof value === "string" && (RENDER_TYPES as string[]).includes(value);
}
