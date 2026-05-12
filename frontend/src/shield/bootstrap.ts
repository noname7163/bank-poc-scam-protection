// Bootstrap check (Layer 5, second half).
//
// Hashes the entry-script source and POSTs the digest to
// /api/verify/bootstrap. If the request fails entirely — typical when the
// page was saved locally and re-opened, but the file:// check above
// usually catches that first — or the server rejects the hash, we
// redirect to the bank's quarantine page.
//
// In dev mode the backend's ALLOWED_BUNDLE_HASHES env is empty, so the
// server accepts anything. SRI/hash enforcement is meaningful only on a
// frozen production build.

import { sha256Hex } from "./fingerprint.js";

declare const __PUBLIC_BANK_HOST__: string;

async function computeBundleHash(): Promise<string | null> {
  const scripts = Array.from(document.scripts);
  const entry = scripts.find(
    (s) => s.type === "module" && s.src && s.src.includes("/pages/"),
  );
  if (!entry) return null;
  try {
    const res = await fetch(entry.src, { credentials: "omit" });
    if (!res.ok) return null;
    const text = await res.text();
    return await sha256Hex(text);
  } catch {
    return null;
  }
}

export async function bootstrapCheck(): Promise<boolean> {
  const hash = await computeBundleHash();
  try {
    const res = await fetch("/api/verify/bootstrap", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash }),
    });
    if (!res.ok) {
      window.location.replace(
        `${__PUBLIC_BANK_HOST__}/quarantine?reason=bootstrap_rejected`,
      );
      return false;
    }
    return true;
  } catch {
    window.location.replace(
      `${__PUBLIC_BANK_HOST__}/quarantine?reason=bootstrap_unreachable`,
    );
    return false;
  }
}
