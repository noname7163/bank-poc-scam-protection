// Client-side fingerprint computation. Mirrors backend/src/lib/fingerprints.ts.
//
// For image-protected fields the element contains a `<img>` whose src carries
// a HMAC `?token=...` issued by the server. The fingerprint is that token —
// the server can verify it with the same secret without us shipping any
// session state into the request.
//
// For everything else we hash the element's textContent and the server side
// hashes the canonical formatted value.

const SKIP_IDS = new Set(["tx-list"]); // not fingerprinted; observer is enough

export interface ClientFingerprint {
  protected_id: string;
  fingerprint: string;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function tokenFromImg(el: Element): string | null {
  const img = el.querySelector("img[src]") as HTMLImageElement | null;
  if (!img) return null;
  try {
    const url = new URL(img.src, window.location.origin);
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

export async function collectFingerprints(): Promise<ClientFingerprint[]> {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-protected]"));
  const results = await Promise.all(
    els.map(async (el): Promise<ClientFingerprint | null> => {
      const id = el.dataset.protected;
      if (!id || SKIP_IDS.has(id)) return null;
      const imageToken = tokenFromImg(el);
      const fingerprint = imageToken ?? (await sha256Hex(el.textContent ?? ""));
      return { protected_id: id, fingerprint };
    }),
  );
  return results.filter((r): r is ClientFingerprint => r !== null);
}
