import "../styles.css";
import "../lib/i18n.js";
import { api, type MeResponse } from "../lib/api.js";
import { checkOrigin } from "../lib/origin.js";
import { t } from "../lib/i18n.js";

if (!checkOrigin()) {
  throw new Error("origin_redirect");
}

const form = document.getElementById("login-form") as HTMLFormElement | null;
const status = document.getElementById("status") as HTMLElement | null;
const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
const demoSelect = document.getElementById("demo-user-select") as HTMLSelectElement | null;
const emailInput = form?.elements.namedItem("email") as HTMLInputElement | null;
const passwordInput = form?.elements.namedItem("password") as HTMLInputElement | null;

const DEMO_PASSWORD = "demo123";

demoSelect?.addEventListener("change", () => {
  const email = demoSelect.value;
  if (!email || !emailInput || !passwordInput) return;
  emailInput.value = email;
  passwordInput.value = DEMO_PASSWORD;
  submitBtn?.focus();
});

// Mark locked demo accounts in the dropdown so the demo presenter can see
// at a glance which one needs to be retired before re-use.
(async () => {
  try {
    const res = await api.get<{ locked_emails: string[] }>("/api/auth/demo-status");
    if (!demoSelect) return;
    for (const opt of Array.from(demoSelect.options)) {
      if (!opt.value) continue;
      if (res.locked_emails.includes(opt.value)) {
        opt.disabled = true;
        // Mark the option label in a language-neutral way (suffix from i18n).
        const baseLabel = opt.textContent?.replace(/\s—\s.*$/, "") ?? opt.textContent ?? "";
        opt.textContent = `${baseLabel} ${t("login.demoLockedSuffix")}`;
      }
    }
  } catch {
    // Demo-status fetch is best-effort; the login still works without it.
  }
})();

(async () => {
  try {
    await api.get<MeResponse>("/api/auth/me");
    window.location.replace("/overview");
  } catch {
    // Not logged in — stay on the login page.
  }
})();

form?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!submitBtn || !status) return;
  const formData = new FormData(form);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  submitBtn.disabled = true;
  submitBtn.textContent = t("login.submitting");
  status.textContent = "";
  status.classList.remove("text-red-600");

  try {
    await api.post<MeResponse>("/api/auth/login", { email, password });
    window.location.assign("/overview");
  } catch (err) {
    const e = err as { status?: number };
    status.classList.add("text-red-600");
    if (e.status === 401) {
      status.textContent = t("login.invalidCredentials");
    } else if (e.status === 423) {
      status.textContent = t("login.accountLocked");
    } else {
      status.textContent = t("login.failed", { status: e.status ?? "?" });
    }
    submitBtn.disabled = false;
    submitBtn.textContent = t("login.submit");
  }
});
