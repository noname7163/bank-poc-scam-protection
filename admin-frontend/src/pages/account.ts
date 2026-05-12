import "../styles.css";
import "../lib/i18n.js";
import { api, type AdminAccount, type AdminTransaction, type AdminUser } from "../lib/api.js";
import { requireAdmin, wireAdminHeader } from "../lib/auth.js";
import { formatCurrencyCents, formatDateTime, parseCurrencyInput } from "../lib/format.js";
import { t } from "../lib/i18n.js";

const TX_TYPES = [
  "salary",
  "rent",
  "groceries",
  "transfer",
  "subscription",
  "refund",
  "purchase",
  "other",
] as const;

const params = new URLSearchParams(window.location.search);
const userId = params.get("user");

const el = {
  statusLine: document.getElementById("status-line"),
  statusHint: document.getElementById("status-hint"),
  resetBtn: document.getElementById("reset-strikes-btn") as HTMLButtonElement | null,
  unlockBtn: document.getElementById("unlock-btn") as HTMLButtonElement | null,
  userForm: document.getElementById("user-form") as HTMLFormElement | null,
  userStatus: document.getElementById("user-status"),
  userEmail: document.getElementById("user-email"),
  accountForm: document.getElementById("account-form") as HTMLFormElement | null,
  accountStatus: document.getElementById("account-status"),
  protectionForm: document.getElementById("protection-form") as HTMLFormElement | null,
  protectionStatus: document.getElementById("protection-status"),
  txList: document.getElementById("tx-list"),
  txFormHost: document.getElementById("tx-form-host"),
  addBtn: document.getElementById("add-tx-btn") as HTMLButtonElement | null,
  error: document.getElementById("error"),
};

function showError(msg: string): void {
  if (!el.error) return;
  el.error.textContent = msg;
  el.error.classList.remove("hidden");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadAccount(): Promise<{ account: AdminAccount; user: AdminUser } | null> {
  if (!userId) return null;
  try {
    return await api.get<{ account: AdminAccount; user: AdminUser }>(
      `/api/admin/accounts/${encodeURIComponent(userId)}`,
    );
  } catch (err) {
    showError(t("error.accountLoadFailed", { message: (err as Error).message }));
    return null;
  }
}

function populateAccountForm(a: AdminAccount): void {
  if (!el.accountForm) return;
  const f = el.accountForm;
  (f.elements.namedItem("balance") as HTMLInputElement).value = (a.balance_cents / 100)
    .toFixed(2)
    .replace(".", ",");
  (f.elements.namedItem("iban") as HTMLInputElement).value = a.iban;
  (f.elements.namedItem("holder_name") as HTMLInputElement).value = a.holder_name;
}

function populateProtectionForm(a: AdminAccount): void {
  if (!el.protectionForm) return;
  const f = el.protectionForm;
  const prot = a.image_protection ?? {};
  (f.elements.namedItem("balance") as HTMLInputElement).checked = prot.balance === true;
  (f.elements.namedItem("tx_amount") as HTMLInputElement).checked = prot.tx_amount === true;
  (f.elements.namedItem("tx_iban") as HTMLInputElement).checked = prot.tx_iban === true;
}

el.protectionForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!userId || !el.protectionForm || !el.protectionStatus) return;
  const f = el.protectionForm;
  const image_protection = {
    balance: (f.elements.namedItem("balance") as HTMLInputElement).checked,
    tx_amount: (f.elements.namedItem("tx_amount") as HTMLInputElement).checked,
    tx_iban: (f.elements.namedItem("tx_iban") as HTMLInputElement).checked,
  };
  el.protectionStatus.classList.remove("text-red-400");
  el.protectionStatus.textContent = t("protection.saving");
  try {
    await api.put(`/api/admin/accounts/${encodeURIComponent(userId)}`, { image_protection });
    el.protectionStatus.textContent = t("protection.saved");
  } catch (err) {
    el.protectionStatus.classList.add("text-red-400");
    el.protectionStatus.textContent = t("protection.error", { message: (err as Error).message });
  }
});

function populateUserForm(u: AdminUser): void {
  if (!el.userForm) return;
  const f = el.userForm;
  (f.elements.namedItem("display_name") as HTMLInputElement).value = u.display_name;
  (f.elements.namedItem("max_strikes") as HTMLInputElement).value = String(u.max_strikes);
  (f.elements.namedItem("password") as HTMLInputElement).value = "";
  if (el.userEmail) el.userEmail.textContent = u.email;
}

function renderSecurityStatus(u: AdminUser): void {
  const locked = u.locked_at !== null;
  if (el.statusLine) {
    if (locked) {
      el.statusLine.innerHTML = `<span class="rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-200 ring-1 ring-red-700">${escapeHtml(t("security.lockedSince", { date: formatDateTime(u.locked_at!) }))}</span>`;
    } else {
      el.statusLine.innerHTML =
        `<span class="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-700">${escapeHtml(t("security.active"))}</span>` +
        ` <span class="ml-2 text-slate-300">${escapeHtml(t("security.warnings", { strikes: u.strike_count, max: u.max_strikes }))}</span>`;
    }
  }
  if (el.statusHint) {
    el.statusHint.textContent = locked ? t("security.hintLocked") : t("security.hintActive");
  }
  if (el.unlockBtn) el.unlockBtn.classList.toggle("hidden", !locked);
  if (el.resetBtn) el.resetBtn.classList.toggle("hidden", locked || u.strike_count === 0);
}

el.unlockBtn?.addEventListener("click", async () => {
  if (!userId || !el.unlockBtn) return;
  el.unlockBtn.disabled = true;
  try {
    await api.post(`/api/admin/users/${encodeURIComponent(userId)}/unlock`);
    await refreshAfterStatusChange();
  } catch (err) {
    showError(t("security.unlockFailed", { message: (err as Error).message }));
  } finally {
    if (el.unlockBtn) el.unlockBtn.disabled = false;
  }
});

el.resetBtn?.addEventListener("click", async () => {
  if (!userId || !el.resetBtn) return;
  el.resetBtn.disabled = true;
  try {
    await api.post(`/api/admin/users/${encodeURIComponent(userId)}/reset-strikes`);
    await refreshAfterStatusChange();
  } catch (err) {
    showError(t("security.resetFailed", { message: (err as Error).message }));
  } finally {
    if (el.resetBtn) el.resetBtn.disabled = false;
  }
});

async function refreshAfterStatusChange(): Promise<void> {
  const loaded = await loadAccount();
  if (loaded) renderSecurityStatus(loaded.user);
}

el.userForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!userId || !el.userForm || !el.userStatus) return;
  const f = el.userForm;
  const display_name = (f.elements.namedItem("display_name") as HTMLInputElement).value.trim();
  const max_strikes = Number.parseInt(
    (f.elements.namedItem("max_strikes") as HTMLInputElement).value,
    10,
  );
  const password = (f.elements.namedItem("password") as HTMLInputElement).value;

  const body: Record<string, unknown> = { display_name, max_strikes };
  if (password.length > 0) body.password = password;

  el.userStatus.classList.remove("text-red-400");
  el.userStatus.textContent = t("userSettings.saving");
  try {
    await api.put(`/api/admin/users/${encodeURIComponent(userId)}`, body);
    el.userStatus.textContent = password ? t("userSettings.savedWithPassword") : t("userSettings.saved");
    (f.elements.namedItem("password") as HTMLInputElement).value = "";
  } catch (err) {
    const e = err as { status?: number };
    el.userStatus.classList.add("text-red-400");
    el.userStatus.textContent =
      e.status === 400
        ? t("userSettings.invalid")
        : t("userSettings.error", { message: (err as Error).message });
  }
});

el.accountForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!userId || !el.accountForm || !el.accountStatus) return;
  const f = el.accountForm;
  const balanceRaw = (f.elements.namedItem("balance") as HTMLInputElement).value;
  const iban = (f.elements.namedItem("iban") as HTMLInputElement).value.trim();
  const holder_name = (f.elements.namedItem("holder_name") as HTMLInputElement).value.trim();
  const balance_cents = parseCurrencyInput(balanceRaw);

  if (balance_cents === null) {
    el.accountStatus.textContent = t("accountData.invalidBalance");
    el.accountStatus.classList.add("text-red-400");
    return;
  }

  el.accountStatus.classList.remove("text-red-400");
  el.accountStatus.textContent = t("accountData.saving");
  try {
    await api.put(`/api/admin/accounts/${encodeURIComponent(userId)}`, {
      balance_cents,
      iban,
      holder_name,
    });
    el.accountStatus.textContent = t("accountData.saved");
  } catch (err) {
    el.accountStatus.classList.add("text-red-400");
    el.accountStatus.textContent = t("accountData.error", { message: (err as Error).message });
  }
});

function renderTxRow(tx: AdminTransaction): string {
  const sign = tx.direction === "in" ? "+" : "−";
  const color = tx.direction === "in" ? "text-emerald-300" : "text-slate-100";
  return `
    <li class="py-3" data-tx-row="${tx.id}">
      <div class="flex items-center gap-4">
        <span class="inline-block h-2 w-2 rounded-full ${tx.direction === "in" ? "bg-emerald-400" : "bg-slate-500"}"></span>
        <div class="flex-1 min-w-0">
          <p class="truncate font-medium">${escapeHtml(tx.counterparty_name)}</p>
          <p class="truncate text-xs text-slate-400">${escapeHtml(tx.reference)} · ${escapeHtml(t(`type.${tx.type}`))} · ${formatDateTime(tx.booked_at)}</p>
          <p class="truncate text-xs font-mono text-slate-500">${escapeHtml(tx.counterparty_iban)}</p>
        </div>
        <span class="tabular-nums font-medium ${color}">${sign} ${formatCurrencyCents(tx.amount_cents)}</span>
        <div class="flex gap-1">
          <button data-action="edit" data-tx="${tx.id}" class="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-700">${escapeHtml(t("tx.edit"))}</button>
          <button data-action="delete" data-tx="${tx.id}" class="rounded border border-red-700 px-2 py-1 text-xs text-red-200 hover:bg-red-900/40">${escapeHtml(t("tx.delete"))}</button>
        </div>
      </div>
    </li>
  `;
}

async function loadTransactions(): Promise<AdminTransaction[]> {
  if (!userId || !el.txList) return [];
  try {
    const { transactions } = await api.get<{ transactions: AdminTransaction[] }>(
      `/api/admin/accounts/${encodeURIComponent(userId)}/transactions`,
    );
    if (transactions.length === 0) {
      el.txList.innerHTML = `<li class="py-3 text-sm text-slate-400">${escapeHtml(t("tx.empty"))}</li>`;
    } else {
      el.txList.innerHTML = transactions.map(renderTxRow).join("");
    }
    return transactions;
  } catch (err) {
    showError(t("tx.loadFailed", { message: (err as Error).message }));
    return [];
  }
}

let txCache: AdminTransaction[] = [];

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string {
  return new Date(local).toISOString();
}

function renderTxForm(existing: AdminTransaction | null): string {
  const tx = existing;
  return `
    <form id="tx-form" class="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-700 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label class="block">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("tx.direction"))}</span>
        <select name="direction" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">
          <option value="in" ${tx?.direction === "in" ? "selected" : ""}>${escapeHtml(t("tx.directionIn"))}</option>
          <option value="out" ${!tx || tx.direction === "out" ? "selected" : ""}>${escapeHtml(t("tx.directionOut"))}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("tx.category"))}</span>
        <select name="type" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">
          ${TX_TYPES.map((tp) => `<option value="${tp}" ${tx?.type === tp ? "selected" : ""}>${escapeHtml(t(`type.${tp}`))}</option>`).join("")}
        </select>
      </label>
      <label class="block">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("tx.amount"))}</span>
        <input name="amount" type="text" inputmode="decimal" required value="${tx ? (tx.amount_cents / 100).toFixed(2).replace(".", ",") : ""}" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-mono" />
      </label>
      <label class="block">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("tx.date"))}</span>
        <input name="booked_at" type="datetime-local" required value="${tx ? escapeHtml(isoToDatetimeLocal(tx.booked_at)) : isoToDatetimeLocal(new Date().toISOString())}" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
      </label>
      <label class="block sm:col-span-2">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("tx.counterpartyName"))}</span>
        <input name="counterparty_name" type="text" required value="${tx ? escapeHtml(tx.counterparty_name) : ""}" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
      </label>
      <label class="block sm:col-span-2">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("tx.counterpartyIban"))}</span>
        <input name="counterparty_iban" type="text" required value="${tx ? escapeHtml(tx.counterparty_iban) : ""}" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-mono" />
      </label>
      <label class="block sm:col-span-2">
        <span class="text-xs uppercase tracking-wide text-slate-400">${escapeHtml(t("tx.reference"))}</span>
        <input name="reference" type="text" required value="${tx ? escapeHtml(tx.reference) : ""}" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
      </label>
      <div class="sm:col-span-2 flex items-center justify-end gap-2">
        <button type="button" data-action="cancel" class="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-700">${escapeHtml(t("tx.cancel"))}</button>
        <button type="submit" class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">${escapeHtml(tx ? t("tx.update") : t("tx.create"))}</button>
      </div>
    </form>
  `;
}

function openTxForm(existing: AdminTransaction | null): void {
  if (!el.txFormHost) return;
  el.txFormHost.innerHTML = renderTxForm(existing);
  const form = el.txFormHost.querySelector("#tx-form") as HTMLFormElement | null;
  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!userId) return;
    const fd = new FormData(form);
    const amountRaw = String(fd.get("amount") ?? "");
    const amount_cents = parseCurrencyInput(amountRaw);
    if (amount_cents === null) {
      showError(t("tx.invalidAmount"));
      return;
    }
    const body = {
      direction: String(fd.get("direction") ?? ""),
      type: String(fd.get("type") ?? ""),
      amount_cents,
      counterparty_name: String(fd.get("counterparty_name") ?? "").trim(),
      counterparty_iban: String(fd.get("counterparty_iban") ?? "").trim(),
      reference: String(fd.get("reference") ?? "").trim(),
      booked_at: datetimeLocalToIso(String(fd.get("booked_at") ?? "")),
    };
    try {
      if (existing) {
        await api.put(`/api/admin/transactions/${encodeURIComponent(existing.id)}`, body);
      } else {
        await api.post(`/api/admin/accounts/${encodeURIComponent(userId)}/transactions`, body);
      }
      closeTxForm();
      txCache = await loadTransactions();
    } catch (err) {
      showError(t("tx.saveFailed", { message: (err as Error).message }));
    }
  });
  form?.querySelector("[data-action='cancel']")?.addEventListener("click", () => closeTxForm());
}

function closeTxForm(): void {
  if (el.txFormHost) el.txFormHost.innerHTML = "";
}

el.addBtn?.addEventListener("click", () => openTxForm(null));

el.txList?.addEventListener("click", async (ev) => {
  const btn = (ev.target as HTMLElement | null)?.closest<HTMLButtonElement>(
    "button[data-action]",
  );
  if (!btn) return;
  const action = btn.dataset.action;
  const txId = btn.dataset.tx;
  if (!txId) return;

  if (action === "edit") {
    const tx = txCache.find((t) => t.id === txId);
    if (tx) openTxForm(tx);
    return;
  }
  if (action === "delete") {
    if (!confirm(t("tx.deleteConfirm"))) return;
    try {
      await api.del(`/api/admin/transactions/${encodeURIComponent(txId)}`);
      txCache = await loadTransactions();
    } catch (err) {
      showError(t("tx.deleteFailed", { message: (err as Error).message }));
    }
  }
});

// Re-render translated content on locale change.
window.addEventListener("localechange", async () => {
  const loaded = await loadAccount();
  if (loaded) renderSecurityStatus(loaded.user);
  txCache = await loadTransactions();
});

(async () => {
  if (!userId) {
    showError(t("error.noUser"));
    return;
  }
  let me;
  try {
    me = await requireAdmin();
  } catch {
    return;
  }
  wireAdminHeader(me);

  const loaded = await loadAccount();
  if (loaded) {
    renderSecurityStatus(loaded.user);
    populateAccountForm(loaded.account);
    populateUserForm(loaded.user);
    populateProtectionForm(loaded.account);
  }
  txCache = await loadTransactions();
})();
