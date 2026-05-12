// Holds the current update nonce. In M3 we install a static client-side
// dev nonce when the shield starts so updateProtected() can be exercised
// end-to-end. M4 replaces that with a server-rotated nonce delivered by
// the verifier heartbeat.

let currentNonce: string | null = null;

export function setNonce(value: string | null): void {
  currentNonce = value;
}

export function getCurrentNonce(): string | null {
  return currentNonce;
}

export function isValidNonce(candidate: string | null | undefined): boolean {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  return candidate === currentNonce;
}
