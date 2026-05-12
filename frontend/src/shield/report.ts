// Tamper reporting: POST to the backend, then navigate to /quarantine
// (or /locked, when the response says the session crossed the threshold).
// Only the first call within a page makes it through — subsequent calls
// are swallowed so a flurry of mutations doesn't fire a dozen requests.

import { stopVerifier } from "./verifier.js";

export interface TamperEvent {
  reason: string;
  details: Record<string, unknown>;
  page: string;
  timestamp: number;
}

let inProgress = false;

export function reportTamper(
  reason: string,
  details: Record<string, unknown> = {},
): void {
  if (inProgress) return;
  inProgress = true;

  const page = window.location.pathname;
  const event: TamperEvent = { reason, details, page, timestamp: Date.now() };
  console.error("[shield] tamper detected:", event);

  // Stop the heartbeat before we navigate so we don't fire another
  // verify call that might also reach the server.
  stopVerifier();

  void postAndNavigate(reason, details, page);
}

async function postAndNavigate(
  reason: string,
  details: Record<string, unknown>,
  page: string,
): Promise<void> {
  let strikes: number | null = null;
  let max: number | null = null;
  let locked = false;
  try {
    const res = await fetch("/api/quarantine/report", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ reason, details, page }),
    });
    if (res.status === 423) {
      window.location.replace("/locked");
      return;
    }
    if (res.status === 401) {
      window.location.replace("/");
      return;
    }
    if (res.ok) {
      const body = (await res.json()) as {
        strike_count?: number;
        locked?: boolean;
        max_strikes?: number;
      };
      strikes = typeof body.strike_count === "number" ? body.strike_count : null;
      max = typeof body.max_strikes === "number" ? body.max_strikes : null;
      locked = body.locked === true;
    }
  } catch {
    // Network failure — fall through to the static quarantine URL so the
    // user at least sees an explanation.
  }

  if (locked) {
    window.location.replace("/locked");
    return;
  }

  const params = new URLSearchParams({ reason });
  if (strikes !== null) params.set("strikes", String(strikes));
  if (max !== null) params.set("max", String(max));
  window.location.replace(`/quarantine?${params.toString()}`);
}
