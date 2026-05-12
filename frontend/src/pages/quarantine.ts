import "../styles.css";
import { applyTranslations, t } from "../lib/i18n.js";
import { checkOrigin } from "../lib/origin.js";
import { protectScamBanner } from "../lib/scam-banner.js";

if (!checkOrigin()) {
  throw new Error("origin_redirect");
}

const DEFAULT_MAX = 3;

const params = new URLSearchParams(window.location.search);
const reason = params.get("reason") ?? "";
const strikes = parsePositiveInt(params.get("strikes"));
const max = parsePositiveInt(params.get("max")) ?? DEFAULT_MAX;

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function renderDynamic(): void {
  const reasonEl = document.getElementById("reason");
  const strikeEl = document.getElementById("strike-line");
  const thresholdEl = document.getElementById("threshold-note");

  if (reasonEl) {
    const knownKey = `quarantine.reason.${reason}`;
    const translated = t(knownKey);
    reasonEl.textContent =
      translated === knownKey ? t("quarantine.reason.unknown", { reason: reason || "?" }) : translated;
  }

  if (strikeEl) {
    if (strikes === null) {
      strikeEl.textContent = t("quarantine.dashPlaceholder");
    } else {
      strikeEl.textContent = t("quarantine.strikeLine", { strikes, max });
      if (strikes >= max) {
        window.location.replace("/locked");
      }
    }
  }

  if (thresholdEl) {
    thresholdEl.textContent =
      max === 1 ? t("quarantine.thresholdOne", { max }) : t("quarantine.thresholdMany", { max });
  }
}

function init(): void {
  applyTranslations(); // sync — translates the scam banner before snapshot
  renderDynamic();
  protectScamBanner();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Re-render dynamic strings on locale change (no switcher on this page,
// but a future switcher would benefit).
window.addEventListener("localechange", renderDynamic);
