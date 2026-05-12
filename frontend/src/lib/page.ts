// Shared helpers for protected pages: session gate + header wiring.

import { api, type MeResponse } from "./api.js";

/**
 * Calls /api/auth/me. On 401 redirects to login, on 423 redirects to /locked.
 * Resolves with the response when the session is valid; rejects otherwise so
 * the caller can stop further work without rendering anything.
 */
export async function requireSession(): Promise<MeResponse> {
  try {
    return await api.get<MeResponse>("/api/auth/me");
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 401) {
      window.location.replace("/");
    } else if (e.status === 423) {
      window.location.replace("/locked");
    }
    throw err;
  }
}

/**
 * Fills `#user-name` and wires `#logout-btn`. Both elements are expected to
 * exist in the page layout.
 */
export function wireSessionHeader(me: MeResponse): void {
  const nameEl = document.getElementById("user-name");
  if (nameEl) nameEl.textContent = me.user.display_name;

  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn?.addEventListener("click", async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      window.location.replace("/");
    }
  });
}
