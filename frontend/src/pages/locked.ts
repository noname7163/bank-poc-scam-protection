import "../styles.css";
import { applyTranslations } from "../lib/i18n.js";
import { checkOrigin } from "../lib/origin.js";
import { protectScamBanner } from "../lib/scam-banner.js";

if (!checkOrigin()) {
  throw new Error("origin_redirect");
}

function init(): void {
  applyTranslations(); // sync — translates the scam banner before snapshot
  protectScamBanner();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
