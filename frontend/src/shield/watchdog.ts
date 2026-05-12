// Mutual-watchdog pattern: two independent intervals on different periods.
// Each tick records its own timestamp and checks that the *other* watchdog
// has ticked recently enough. Killing one watchdog (e.g. via clearInterval
// on a specific id) is detected within ~1s by the other. Killing both
// within ~1s of each other still has to evade the verifier heartbeat
// (Layer 3) — which would notice the silent backend within ~6s.

const PERIOD_A_MS = 900;
const PERIOD_B_MS = 1400;
// Allow up to ~2× the period as drift / tab-suspend tolerance before
// declaring the other watchdog dead.
const TOLERANCE_FROM_A_MS = 2200;
const TOLERANCE_FROM_B_MS = 2800;

let lastA = 0;
let lastB = 0;
let stopped = false;
let intervalA: number | undefined;
let intervalB: number | undefined;
let onFail: ((reason: string, details: Record<string, unknown>) => void) | null = null;

export function startWatchdog(
  fail: (reason: string, details: Record<string, unknown>) => void,
): void {
  if (intervalA !== undefined) return;
  onFail = fail;
  const now = Date.now();
  lastA = now;
  lastB = now;
  stopped = false;

  intervalA = window.setInterval(() => {
    if (stopped) return;
    lastA = Date.now();
    const gap = Date.now() - lastB;
    if (gap > TOLERANCE_FROM_A_MS) {
      stopped = true;
      onFail?.("watchdog_b_silent", { silent_ms: gap });
    }
  }, PERIOD_A_MS);

  intervalB = window.setInterval(() => {
    if (stopped) return;
    lastB = Date.now();
    const gap = Date.now() - lastA;
    if (gap > TOLERANCE_FROM_B_MS) {
      stopped = true;
      onFail?.("watchdog_a_silent", { silent_ms: gap });
    }
  }, PERIOD_B_MS);
}

export function stopWatchdog(): void {
  stopped = true;
  if (intervalA !== undefined) clearInterval(intervalA);
  if (intervalB !== undefined) clearInterval(intervalB);
  intervalA = undefined;
  intervalB = undefined;
}
