// Per-session update nonces issued by the verifier ack. In-memory only —
// single-process backend, demo scope. Each successful verify replaces the
// previous nonce; old nonces simply expire.

import crypto from "node:crypto";

const NONCE_TTL_MS = 5000;

interface Entry {
  value: string;
  expires_at: number;
}

const store = new Map<string, Entry>();

export function issueNonce(sessionId: string): { nonce: string; expires_at: number } {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const expires_at = Date.now() + NONCE_TTL_MS;
  store.set(sessionId, { value: nonce, expires_at });
  return { nonce, expires_at };
}

export function validateNonce(sessionId: string, candidate: string): boolean {
  const entry = store.get(sessionId);
  if (!entry) return false;
  if (entry.expires_at < Date.now()) {
    store.delete(sessionId);
    return false;
  }
  return entry.value === candidate;
}

export function clearNonce(sessionId: string): void {
  store.delete(sessionId);
}
