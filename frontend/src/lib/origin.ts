// Layer 5 — origin guard. Runs as the very first thing on every page.
//
//   - file:// (the page was saved locally and re-opened) → redirect to the
//     real bank.
//   - non-https on a non-localhost hostname (someone copied the page onto
//     a plain-http impersonator) → redirect to the real bank.
//   - hostname not matching the configured PUBLIC_BANK_HOST → redirect.
//
// The bank host is injected at build time via the Vite `define` plugin —
// it's a literal string substitution, not a runtime lookup, so an attacker
// can't change it via JS after page load.

declare const __PUBLIC_BANK_HOST__: string;

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isLocalhost(hostname: string): boolean {
  return LOCALHOST_HOSTS.has(hostname);
}

function redirectToBank(reason: string): void {
  const target = `${__PUBLIC_BANK_HOST__}/quarantine?reason=${encodeURIComponent(reason)}`;
  window.location.replace(target);
}

/**
 * Returns true if the origin is acceptable. On failure, a redirect is
 * already in flight — the caller should bail out early.
 */
export function checkOrigin(): boolean {
  const proto = window.location.protocol;
  const host = window.location.hostname;

  if (proto === "file:") {
    redirectToBank("saved_offline");
    return false;
  }

  let expectedHost: string;
  try {
    expectedHost = new URL(__PUBLIC_BANK_HOST__).hostname;
  } catch {
    return true; // misconfigured env, skip
  }

  if (proto !== "https:" && !isLocalhost(host)) {
    redirectToBank("insecure_protocol");
    return false;
  }

  const hostsMatch =
    host === expectedHost ||
    (isLocalhost(host) && isLocalhost(expectedHost));

  if (!hostsMatch) {
    redirectToBank("hostname_mismatch");
    return false;
  }

  return true;
}
