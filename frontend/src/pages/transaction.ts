import "../styles.css";
import "../lib/i18n.js";
import { api, type Account, type Transaction } from "../lib/api.js";
import { formatCurrencyCents, formatDateTime, formatSignedCents } from "../lib/format.js";
import { t } from "../lib/i18n.js";
import { requireSession, wireSessionHeader } from "../lib/page.js";
import { startShield } from "../shield/index.js";

// On protected pages, switching the locale would leave tx-direction's
// JS-set text stale ("Incoming" while the verifier now sends locale=de
// → server expects sha256("Eingang") → mismatch → false-positive strike).
// Full reload sidesteps this — the new locale is in localStorage and the
// fresh render uses it from the first paint.
window.addEventListener("localechange", () => {
  window.location.reload();
});

const el = {
  card: document.getElementById("tx-card"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  directionBadge: document.getElementById("tx-direction-badge"),
  date: document.getElementById("tx-date"),
  amount: document.getElementById("tx-amount"),
  senderName: document.getElementById("tx-sender-name"),
  senderIban: document.getElementById("tx-sender-iban"),
  recipientName: document.getElementById("tx-recipient-name"),
  recipientIban: document.getElementById("tx-recipient-iban"),
  reference: document.getElementById("tx-reference"),
  txId: document.getElementById("tx-id"),
  type: document.getElementById("tx-type"),
};

function txIdFromLocation(): string | null {
  const m = window.location.pathname.match(/^\/transaction\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]!) : null;
}

function showError(msg: string): void {
  if (el.loading) el.loading.classList.add("hidden");
  if (!el.error) return;
  el.error.textContent = msg;
  el.error.classList.remove("hidden");
}

function setDirectionBadge(direction: "in" | "out"): void {
  if (!el.directionBadge) return;
  el.directionBadge.textContent = direction === "in" ? t("tx.dirIn") : t("tx.dirOut");
  el.directionBadge.className =
    direction === "in"
      ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
      : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200";
}

function render(tx: Transaction, account: Account, holderName: string): void {
  setDirectionBadge(tx.direction);
  if (el.date) el.date.textContent = formatDateTime(tx.booked_at);

  renderAmount(tx);

  const userIban = account.iban;
  const senderIban = tx.direction === "in" ? tx.counterparty_iban : userIban;
  const recipientIban = tx.direction === "in" ? userIban : tx.counterparty_iban;
  const senderName = tx.direction === "in" ? tx.counterparty_name : holderName;
  const recipientName = tx.direction === "in" ? holderName : tx.counterparty_name;

  setText(el.senderName, senderName);
  setText(el.recipientName, recipientName);
  renderIban(el.senderIban, senderIban, tx.render_urls?.tx_sender_iban);
  renderIban(el.recipientIban, recipientIban, tx.render_urls?.tx_recipient_iban);

  setText(el.reference, tx.reference);
  setText(el.txId, tx.id);
  setText(el.type, t(`type.${tx.type}`));

  el.loading?.classList.add("hidden");
  el.card?.classList.remove("hidden");

  document.title = t("tx.docTitle", {
    dir: tx.direction === "in" ? t("tx.dirIn") : t("tx.dirOut"),
    amount: formatCurrencyCents(tx.amount_cents),
  });
}

function renderAmount(tx: Transaction): void {
  if (!el.amount) return;
  const url = tx.render_urls?.tx_amount;
  if (url) {
    el.amount.innerHTML = `<img src="${url}" alt="${escapeHtml(t("tx.imgAltAmount"))}" width="220" height="40" class="block h-10 ml-auto" />`;
    el.amount.className = "text-3xl font-semibold tabular-nums";
  } else {
    el.amount.textContent = formatSignedCents(tx.direction, tx.amount_cents);
    el.amount.className = `text-3xl font-semibold tabular-nums ${
      tx.direction === "in" ? "text-emerald-600" : "text-slate-900"
    }`;
  }
}

function renderIban(node: HTMLElement | null, iban: string, url: string | undefined): void {
  if (!node) return;
  if (url) {
    node.innerHTML = `<img src="${url}" alt="${escapeHtml(t("tx.imgAltIban"))}" width="320" height="22" class="block h-[22px]" />`;
  } else {
    node.textContent = iban;
  }
}

function setText(node: HTMLElement | null, value: string): void {
  if (node) node.textContent = value;
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
  const txId = txIdFromLocation();
  if (!txId) {
    showError(t("tx.urlInvalid"));
    return;
  }

  let me;
  try {
    me = await requireSession();
  } catch {
    return; // redirect already triggered
  }
  wireSessionHeader(me);

  try {
    const [{ account }, { transaction }] = await Promise.all([
      api.get<{ account: Account }>("/api/accounts/me"),
      api.get<{ transaction: Transaction }>(`/api/transactions/${encodeURIComponent(txId)}`),
    ]);
    render(transaction, account, me.user.display_name);
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 404) {
      showError(t("tx.notFound"));
    } else {
      showError(t("tx.loadFailed", { status: e.status ?? "?" }));
    }
    return;
  }

  // Activate the shield only after the initial render is in place so the
  // observers don't fire on legitimate first-paint mutations.
  await startShield({ page: "transaction", page_context: { tx_id: txId } });
}

init();
