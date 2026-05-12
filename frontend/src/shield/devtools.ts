// DevTools heuristic detection.
//
// Single probe: outerHeight − innerHeight jumps. Docking DevTools shrinks
// the viewport without changing window outer size, producing a sudden
// gap change. False positives are real (window resize, browser zoom,
// mobile orientation change) — this is a soft signal only, never
// triggers quarantine.
//
// The console.log-getter trick was removed: it leaked a visible (if
// styled-transparent) object into the user's console, and modern browsers
// rarely fire the getter during preview anyway.

import { softSignal } from "./soft-signal.js";

const PROBE_PERIOD_MS = 1500;
const SIZE_JUMP_THRESHOLD_PX = 100;

let intervalId: number | undefined;
let lastGap = 0;

export function startDevtoolsHeuristic(): void {
  if (intervalId !== undefined) return;
  lastGap = window.outerHeight - window.innerHeight;

  intervalId = window.setInterval(() => {
    const gap = window.outerHeight - window.innerHeight;
    if (Math.abs(gap - lastGap) > SIZE_JUMP_THRESHOLD_PX) {
      softSignal("devtools_size_jump", {
        previous_gap: lastGap,
        current_gap: gap,
      });
    }
    lastGap = gap;
  }, PROBE_PERIOD_MS);
}

export function stopDevtoolsHeuristic(): void {
  if (intervalId !== undefined) clearInterval(intervalId);
  intervalId = undefined;
}
