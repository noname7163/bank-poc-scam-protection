// Public entry point for the shield. Pages call startShield() AFTER their
// initial render so the observers don't fire on legitimate first-paint
// mutations.
//
// Module encapsulation note (SPEC §4.4): the shield is split across
// several files in src/shield/ but none of them are imported from outside
// this directory. After Vite bundling everything lives in a closure that
// pages can only address via the frozen window.__shield exposed below.
//
// M6 scope:
//   - Layer 1 (whitelist + blacklist MutationObservers)
//   - Layer 3 (verifier heartbeat with server-rotated update nonces)
//   - Layer 4 self-defense:
//       * dual watchdog
//       * function-integrity (toString hashing) — checked from the verifier
//       * DevTools heuristic (soft signal, no quarantine)
//   - reportTamper() POSTs to /api/quarantine/report and navigates the
//     user to /quarantine or /locked depending on the response.

import { checkOrigin } from "../lib/origin.js";
import { bootstrapCheck } from "./bootstrap.js";
import { isValidNonce } from "./nonce.js";
import { reportTamper } from "./report.js";
import { startObservers } from "./observer.js";
import { startVerifier } from "./verifier.js";
import { startWatchdog } from "./watchdog.js";
import { captureIntegrity } from "./integrity.js";
import { startDevtoolsHeuristic } from "./devtools.js";

const NONCE_ATTR = "data-update-nonce";

declare global {
  interface Window {
    __shield?: Readonly<{
      updateProtected: typeof updateProtected;
      reportTamper: typeof reportTamper;
    }>;
  }
}

export interface ShieldOptions {
  page: "overview" | "transaction";
  page_context?: Record<string, unknown>;
}

function updateProtected(el: HTMLElement, newValue: string, nonce: string): void {
  if (!(el instanceof HTMLElement)) {
    reportTamper("update_target_invalid", {});
    return;
  }
  if (!isValidNonce(nonce)) {
    reportTamper("invalid_update_nonce", {
      protected_id: el.dataset.protected ?? el.id ?? null,
    });
    return;
  }

  el.setAttribute(NONCE_ATTR, nonce);

  if (el instanceof HTMLImageElement) {
    el.src = newValue;
  } else {
    el.textContent = newValue;
  }

  // The nonce attribute must persist long enough for the MutationObserver
  // callback (a microtask) to inspect it. setTimeout(0) is a macrotask, so
  // it runs strictly after the current microtask checkpoint flushes, which
  // is exactly when the observer fires.
  setTimeout(() => el.removeAttribute(NONCE_ATTR), 0);
}

export async function startShield(opts: ShieldOptions): Promise<void> {
  if (window.__shield) return;

  // Layer 5 — bail out immediately if the origin is wrong; redirect is
  // already in flight when checkOrigin() returns false. Bootstrap hash
  // check runs async; on failure it also redirects.
  if (!checkOrigin()) return;
  const bootstrapped = await bootstrapCheck();
  if (!bootstrapped) return;

  // Capture the source of the public API methods now so the verifier can
  // detect any later .toString replacement.
  void captureIntegrity({ updateProtected, reportTamper });

  startObservers();
  startVerifier({
    page: opts.page,
    page_context: opts.page_context ?? {},
  });
  startWatchdog((reason, details) => reportTamper(reason, details));
  startDevtoolsHeuristic();

  const api = Object.freeze({ updateProtected, reportTamper });
  Object.defineProperty(window, "__shield", {
    value: api,
    writable: false,
    configurable: false,
    enumerable: false,
  });
}
