// Function-integrity check: hashes the .toString() of selected functions at
// shield startup, then re-hashes periodically and on every verifier ack.
// Catches attackers who overwrite the toString of a public method or
// replace the function reference with their own. Does NOT catch
// bytecode-level patches via DevTools — see SPEC §1.2 (out of scope).

import { sha256Hex } from "./fingerprint.js";

type FnMap = Record<string, (...args: never[]) => unknown>;

const baselines = new Map<string, string>();
let watched: FnMap = {};

export async function captureIntegrity(fns: FnMap): Promise<void> {
  watched = fns;
  for (const [name, fn] of Object.entries(fns)) {
    baselines.set(name, await sha256Hex(fn.toString()));
  }
}

/** Returns the name of the first tampered function, or null on success. */
export async function checkIntegrity(): Promise<string | null> {
  for (const [name, expected] of baselines) {
    const fn = watched[name];
    if (!fn) return name;
    const actual = await sha256Hex(fn.toString());
    if (actual !== expected) return name;
  }
  return null;
}
