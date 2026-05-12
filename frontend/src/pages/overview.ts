import "../styles.css";
import "../lib/i18n.js";
import { api, type Account, type Transaction } from "../lib/api.js";
import { formatCurrencyCents, formatDate, formatSignedCents } from "../lib/format.js";
import { t } from "../lib/i18n.js";
import { requireSession, wireSessionHeader } from "../lib/page.js";
import { startShield } from "../shield/index.js";

// On protected pages, switching the locale would either leave JS-set
// localised text (e.g. tx-direction on the transaction page) stale OR
// re-render it without a valid nonce, both of which trip the shield.
// Full reload sidesteps the problem cleanly — the new locale is in
// localStorage and the fresh render uses it from the first paint.
window.addEventListener("localechange", () => {
  window.location.reload();
});

const el = {
  balance: document.getElementById("balance"),
  iban: document.getElementById("iban"),
  txList: document.getElementById("tx-list"),
  error: document.getElementById("error"),
};

function showError(msg: string): void {
  if (!el.error) return;
  el.error.textContent = msg;
  el.error.classList.remove("hidden");
}

function renderBalance(account: Account): void {
  if (!el.balance) return;
  const url = account.render_urls?.balance;
  if (url) {
    el.balance.innerHTML = `<img src="${url}" alt="${escapeHtml(t("tx.imgAltBalance"))}" width="360" height="56" class="block h-14" />`;
  } else {
    el.balance.textContent = formatCurrencyCents(account.balance_cents);
  }
}

function renderTransactions(txs: Transaction[]): void {
  if (!el.txList) return;
  if (txs.length === 0) {
    el.txList.innerHTML = `<li class="px-6 py-4 text-sm text-slate-500">${escapeHtml(t("overview.noTx"))}</li>`;
    return;
  }
  el.txList.innerHTML = txs.map(renderTxRow).join("");
}

function renderTxRow(tx: Transaction): string {
  const amountClass = tx.direction === "in" ? "text-emerald-600" : "text-slate-900";
  const dotColor = tx.direction === "in" ? "bg-emerald-500" : "bg-slate-400";
  return `
    <li>
      <a href="/transaction/${encodeURIComponent(tx.id)}"
         class="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition">
        <span class="inline-block h-2 w-2 rounded-full ${dotColor}"></span>
        <div class="flex-1 min-w-0">
          <p class="truncate font-medium">${escapeHtml(tx.counterparty_name)}</p>
          <p class="truncate text-xs text-slate-500">${escapeHtml(tx.reference)} · ${formatDate(tx.booked_at)}</p>
        </div>
        <span class="tabular-nums font-medium ${amountClass}">${formatSignedCents(tx.direction, tx.amount_cents)}</span>
      </a>
    </li>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function init(): Promise<void> {
  let me;
  try {
    me = await requireSession();
  } catch {
    return;
  }
  wireSessionHeader(me);

  try {
    const [{ account }, { transactions }] = await Promise.all([
      api.get<{ account: Account }>("/api/accounts/me"),
      api.get<{ transactions: Transaction[] }>("/api/transactions"),
    ]);
    renderBalance(account);
    if (el.iban) el.iban.textContent = account.iban;
    renderTransactions(transactions);
  } catch (err) {
    showError(t("overview.dataError", { message: (err as Error).message }));
    return;
  }

  // Activate the shield only after the initial render is in place so the
  // observers don't fire on legitimate first-paint mutations.
  await startShield({ page: "overview" });
}

init();
