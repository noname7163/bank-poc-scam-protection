import "../styles.css";
import "../lib/i18n.js";
import { api, type AdminUserSummary } from "../lib/api.js";
import { requireAdmin, wireAdminHeader } from "../lib/auth.js";
import { formatCurrencyCents, formatDateTime } from "../lib/format.js";
import { t } from "../lib/i18n.js";

const list = document.getElementById("user-list");
const errorEl = document.getElementById("error");
const createBtn = document.getElementById("show-create-btn");
const createHost = document.getElementById("create-form-host");

function showError(msg: string): void {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

function clearError(): void {
  errorEl?.classList.add("hidden");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderUser(u: AdminUserSummary): string {
  const locked = u.user_locked_at !== null;
  const lockBadge = locked
    ? `<span class="rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-200 ring-1 ring-red-700">${escapeHtml(t("dashboard.lockedSince", { date: formatDateTime(u.user_locked_at!) }))}</span>`
    : `<span class="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-700">${escapeHtml(t("dashboard.active"))}</span>`;

  const balance =
    u.balance_cents !== null ? formatCurrencyCents(u.balance_cents) : "—";

  const strikesText = escapeHtml(
    t("dashboard.strikes", { strikes: u.strike_count, max: u.max_strikes }),
  );
  const resetBtn =
    u.strike_count > 0 && !locked
      ? `<button data-action="reset-strikes" data-user="${u.id}" class="rounded-lg border border-slate-500 px-3 py-1.5 text-sm hover:bg-slate-700">${escapeHtml(t("dashboard.resetStrikes"))}</button>`
      : "";
  const unlockBtn = locked
    ? `<button data-action="unlock" data-user="${u.id}" class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">${escapeHtml(t("dashboard.unlock"))}</button>`
    : "";

  return `
    <article class="rounded-2xl bg-slate-800 p-5 shadow-sm ring-1 ring-slate-700">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-lg font-semibold">${escapeHtml(u.display_name)}</p>
          <p class="text-sm text-slate-400">${escapeHtml(u.email)}</p>
          <p class="mt-1 text-xs text-slate-500 font-mono">${escapeHtml(u.iban ?? "—")}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-semibold tabular-nums">${balance}</p>
          <p class="mt-1 text-xs text-slate-400">${strikesText}</p>
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between gap-2">
        ${lockBadge}
        <div class="flex flex-wrap gap-2 justify-end">
          ${resetBtn}
          ${unlockBtn}
          <a href="/admin/account.html?user=${encodeURIComponent(u.id)}" class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-amber-400">
            ${escapeHtml(t("dashboard.manage"))}
          </a>
          <button data-action="delete" data-user="${u.id}" data-name="${escapeHtml(u.email)}" class="rounded-lg border border-red-700 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/40">
            ${escapeHtml(t("dashboard.delete"))}
          </button>
        </div>
      </div>
    </article>
  `;
}

async function loadUsers(): Promise<void> {
  if (!list) return;
  try {
    const { users } = await api.get<{ users: AdminUserSummary[] }>("/api/admin/users");
    if (users.length === 0) {
      list.innerHTML = `<p class="text-sm text-slate-400">${escapeHtml(t("dashboard.empty"))}</p>`;
      return;
    }
    list.innerHTML = users.map(renderUser).join("");
  } catch (err) {
    showError(t("dashboard.loadFailed", { message: (err as Error).message }));
  }
}

function renderCreateForm(): string {
  return `
    <form id="create-form" class="rounded-2xl bg-slate-800 p-5 ring-1 ring-slate-700 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label class="block sm:col-span-2">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("create.email"))}</span>
        <input name="email" type="email" required class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
      </label>
      <label class="block">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("create.displayName"))}</span>
        <input name="display_name" type="text" required class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
      </label>
      <label class="block">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("create.password"))}</span>
        <input name="password" type="text" required value="demo123" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
      </label>
      <label class="block sm:col-span-2">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("create.maxStrikes"))}</span>
        <input name="max_strikes" type="number" min="1" max="50" required value="3" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
        <span class="mt-1 block text-xs text-slate-500">${escapeHtml(t("create.maxStrikesHint"))}</span>
      </label>
      <div class="sm:col-span-2 flex justify-end gap-2">
        <button type="button" data-action="cancel" class="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-700">${escapeHtml(t("create.cancel"))}</button>
        <button type="submit" class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">${escapeHtml(t("create.create"))}</button>
      </div>
    </form>
  `;
}

function openCreateForm(): void {
  if (!createHost) return;
  createHost.innerHTML = renderCreateForm();
  const form = createHost.querySelector("#create-form") as HTMLFormElement | null;
  form?.querySelector("[data-action='cancel']")?.addEventListener("click", () => {
    createHost.innerHTML = "";
  });
  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearError();
    const fd = new FormData(form);
    const body = {
      email: String(fd.get("email") ?? "").trim(),
      display_name: String(fd.get("display_name") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      max_strikes: Number.parseInt(String(fd.get("max_strikes") ?? "3"), 10),
    };
    try {
      await api.post("/api/admin/users", body);
      createHost.innerHTML = "";
      await loadUsers();
    } catch (err) {
      const e = err as { status?: number };
      if (e.status === 409) showError(t("create.emailTaken"));
      else if (e.status === 400) showError(t("create.invalid"));
      else showError(t("create.failed", { message: (err as Error).message }));
    }
  });
}

createBtn?.addEventListener("click", openCreateForm);

list?.addEventListener("click", async (ev) => {
  const target = (ev.target as HTMLElement | null)?.closest<HTMLButtonElement>(
    "button[data-action]",
  );
  if (!target) return;
  const action = target.dataset.action;
  const userId = target.dataset.user;
  if (!userId) return;

  if (action === "unlock") {
    target.disabled = true;
    try {
      await api.post(`/api/admin/users/${encodeURIComponent(userId)}/unlock`);
      await loadUsers();
    } catch (err) {
      showError(t("dashboard.unlockFailed", { message: (err as Error).message }));
      target.disabled = false;
    }
    return;
  }

  if (action === "reset-strikes") {
    target.disabled = true;
    try {
      await api.post(`/api/admin/users/${encodeURIComponent(userId)}/reset-strikes`);
      await loadUsers();
    } catch (err) {
      showError(t("dashboard.resetFailed", { message: (err as Error).message }));
      target.disabled = false;
    }
    return;
  }

  if (action === "delete") {
    const name = target.dataset.name ?? userId;
    if (!confirm(t("dashboard.deleteConfirm", { email: name }))) return;
    target.disabled = true;
    try {
      await api.del(`/api/admin/users/${encodeURIComponent(userId)}`);
      await loadUsers();
    } catch (err) {
      showError(t("dashboard.deleteFailed", { message: (err as Error).message }));
      target.disabled = false;
    }
  }
});

// Reload the user list on locale change so localised strings refresh.
window.addEventListener("localechange", () => {
  void loadUsers();
});

(async () => {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return;
  }
  wireAdminHeader(me);
  await loadUsers();
})();
