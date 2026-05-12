import { api } from "./api.js";

export interface AdminMe {
  admin: { id: string; username: string };
}

export async function requireAdmin(): Promise<AdminMe> {
  try {
    return await api.get<AdminMe>("/api/admin/auth/me");
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 401) {
      window.location.replace("/admin/");
    }
    throw err;
  }
}

export function wireAdminHeader(me: AdminMe): void {
  const name = document.getElementById("admin-name");
  if (name) name.textContent = me.admin.username;
  const logout = document.getElementById("logout-btn");
  logout?.addEventListener("click", async () => {
    try {
      await api.post("/api/admin/auth/logout");
    } finally {
      window.location.replace("/admin/");
    }
  });
}
