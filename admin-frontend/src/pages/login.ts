import "../styles.css";
import "../lib/i18n.js";
import { api } from "../lib/api.js";
import { t } from "../lib/i18n.js";

const form = document.getElementById("login-form") as HTMLFormElement | null;
const status = document.getElementById("status") as HTMLElement | null;
const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;

(async () => {
  try {
    await api.get("/api/admin/auth/me");
    window.location.replace("/admin/dashboard.html");
  } catch {
    // Not logged in.
  }
})();

form?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!submitBtn || !status) return;
  const fd = new FormData(form);
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");

  submitBtn.disabled = true;
  submitBtn.textContent = t("login.submitting");
  status.textContent = "";
  status.classList.remove("text-red-400");

  try {
    await api.post("/api/admin/auth/login", { username, password });
    window.location.assign("/admin/dashboard.html");
  } catch (err) {
    const e = err as { status?: number };
    status.classList.add("text-red-400");
    status.textContent =
      e.status === 401
        ? t("login.invalid")
        : t("login.failed", { status: e.status ?? "?" });
    submitBtn.disabled = false;
    submitBtn.textContent = t("login.submit");
  }
});
