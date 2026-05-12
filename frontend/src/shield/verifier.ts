// Layer 3 — verifier heartbeat.
//
//   Every HEARTBEAT_MS the verifier collects fingerprints of all
//   [data-protected] elements and POSTs them to /api/verify together with
//   the page identifier + context. The server compares against the
//   expected fingerprints derived from the session seed and answers with
//   either a fresh update nonce or a mismatch list.
//
//   Failure modes that escalate to /quarantine:
//     - server says { status: "mismatch", ... }     → reason=verify_mismatch
//     - request times out / network error           → after MAX_RETRIES
//     - response 423 (session locked)               → redirect to /locked
//
//   401 (no session) sends the user back to the login page.

import { setNonce } from "./nonce.js";
import { collectFingerprints } from "./fingerprint.js";
import { checkIntegrity } from "./integrity.js";
import { reportTamper } from "./report.js";
import { getLocale } from "../lib/i18n.js";

const HEARTBEAT_MS = 3000;
const REQUEST_TIMEOUT_MS = 6000;
const MAX_RETRIES = 2;
const BACKOFF_MS = [1500, 3000] as const;

interface PageContext {
  page: string;
  page_context: Record<string, unknown>;
}

interface VerifyOkResponse {
  status: "ok";
  nonce: string;
  nonce_expires_at: number;
}

interface VerifyMismatchResponse {
  status: "mismatch";
  element_ids: string[];
  strike_count: number;
  locked: boolean;
  max_strikes: number;
}

type VerifyResponse = VerifyOkResponse | VerifyMismatchResponse;

let context: PageContext | null = null;
let stopped = false;
let timerId: number | null = null;
let consecutiveFailures = 0;

export function startVerifier(ctx: PageContext): void {
  context = ctx;
  stopped = false;
  consecutiveFailures = 0;
  // First heartbeat fires immediately; subsequent every HEARTBEAT_MS.
  schedule(0);
}

export function stopVerifier(): void {
  stopped = true;
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function schedule(ms: number): void {
  if (stopped) return;
  timerId = window.setTimeout(tick, ms);
}

async function tick(): Promise<void> {
  if (stopped || !context) return;
  try {
    const tamperedFn = await checkIntegrity();
    if (stopped) return;
    if (tamperedFn) {
      reportTamper("function_integrity_broken", { function: tamperedFn });
      return;
    }
    const fingerprints = await collectFingerprints();
    if (stopped) return;
    const res = await postVerify({
      page: context.page,
      page_context: context.page_context,
      fingerprints,
      locale: getLocale(),
    });
    if (stopped) return;
    consecutiveFailures = 0;

    if (res.status === "ok") {
      setNonce(res.nonce);
    } else {
      navigateToQuarantine(
        "verify_mismatch",
        res.strike_count,
        res.max_strikes,
        res.element_ids,
        res.locked,
      );
      return;
    }
  } catch (err) {
    if (handleHttpError(err)) return; // 401/423 already redirected
    consecutiveFailures += 1;
    if (consecutiveFailures > MAX_RETRIES) {
      navigateToQuarantine("verifier_offline", null, null, [], false);
      return;
    }
    const delay = BACKOFF_MS[consecutiveFailures - 1] ?? HEARTBEAT_MS;
    schedule(delay);
    return;
  }
  schedule(HEARTBEAT_MS);
}

async function postVerify(body: unknown): Promise<VerifyResponse> {
  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!res.ok) {
      const err = new Error(`verify ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return (await res.json()) as VerifyResponse;
  } finally {
    window.clearTimeout(timer);
  }
}

function handleHttpError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  if (status === 401) {
    stopped = true;
    window.location.replace("/");
    return true;
  }
  if (status === 423) {
    stopped = true;
    window.location.replace("/locked");
    return true;
  }
  return false;
}

function navigateToQuarantine(
  reason: string,
  strikes: number | null,
  max: number | null,
  elementIds: string[],
  locked: boolean,
): void {
  stopped = true;
  if (locked) {
    window.location.replace("/locked");
    return;
  }
  const params = new URLSearchParams({ reason });
  if (strikes !== null) params.set("strikes", String(strikes));
  if (max !== null) params.set("max", String(max));
  if (elementIds.length > 0) params.set("ids", elementIds.join(","));
  window.location.replace(`/quarantine?${params.toString()}`);
}
