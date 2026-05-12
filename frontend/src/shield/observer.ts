// Layer 1 — structural monitoring via MutationObserver.
//
//   Whitelist:  one observer per element marked with [data-protected],
//               watching attribute / characterData / childList changes
//               (subtree). Anything not covered by a current valid nonce
//               is a tamper event.
//
//   Blacklist:  a single observer on document.body that watches for
//               newly inserted nodes. Heuristic checks:
//                  - currency-looking text content
//                  - position: fixed / absolute with elevated z-index
//                  - bounding-box ~match with an existing protected element
//
// The two observers can fire on the same DOM operation (e.g. a textContent
// replacement). The blacklist defers to the whitelist's nonce by checking
// `isUnderActiveNonce` on every added node.

import { isValidNonce } from "./nonce.js";
import { reportTamper } from "./report.js";

const PROTECTED_SELECTOR = "[data-protected]";
const NONCE_ATTR = "data-update-nonce";

// "9.999,00 €", "12 €", "1234€" — at least one leading digit, then
// digits/dots/commas/spaces, then the euro sign. Strict enough to avoid
// firing on stray "€" tokens with no number.
const CURRENCY_RE = /\d[\d.,\s]*€/;

// Z-index above which we treat an injected positioned element as a
// suspected overlay. The legitimate UI does not set z-index, so any
// positive value from an inserted node is already suspicious.
const SUSPECT_Z_INDEX = 1;

// Tolerance (in CSS pixels) for the "same bounding rect" heuristic.
// Two rects within this on every side are treated as overlapping.
const RECT_TOLERANCE = 6;

let whitelistObservers: MutationObserver[] = [];
let blacklistObserver: MutationObserver | null = null;

export function startObservers(): void {
  installWhitelistObservers();
  installBlacklistObserver();
}

export function stopObservers(): void {
  for (const o of whitelistObservers) o.disconnect();
  whitelistObservers = [];
  blacklistObserver?.disconnect();
  blacklistObserver = null;
}

function installWhitelistObservers(): void {
  const protectedEls = document.querySelectorAll<HTMLElement>(PROTECTED_SELECTOR);
  protectedEls.forEach((el) => {
    const obs = new MutationObserver((records) => handleWhitelistRecords(el, records));
    obs.observe(el, {
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
      childList: true,
      subtree: true,
    });
    whitelistObservers.push(obs);
  });
}

function handleWhitelistRecords(host: HTMLElement, records: MutationRecord[]): void {
  for (const r of records) {
    // The nonce attribute is internal book-keeping; never report on it.
    if (isInternalNonceMutation(r)) continue;

    // If the mutation occurred inside an element whose data-update-nonce is
    // currently a valid nonce, it's a legitimate update.
    if (isUnderActiveNonce(r.target)) continue;

    reportTamper("whitelist_mutation", {
      protected_id: host.dataset.protected ?? host.id ?? null,
      mutation_type: r.type,
      attribute: r.attributeName ?? null,
      added: r.addedNodes.length,
      removed: r.removedNodes.length,
    });
  }
}

function isInternalNonceMutation(r: MutationRecord): boolean {
  return r.type === "attributes" && r.attributeName === NONCE_ATTR;
}

/**
 * Walks up the DOM from `node`, returning true if any ancestor (inclusive)
 * carries a data-update-nonce attribute whose value matches the current
 * valid nonce. Used by both observers to distinguish legitimate updates.
 */
export function isUnderActiveNonce(node: Node | null): boolean {
  let n: Node | null = node;
  while (n && n !== document) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const nonce = (n as Element).getAttribute(NONCE_ATTR);
      if (nonce && isValidNonce(nonce)) return true;
    }
    n = n.parentNode;
  }
  return false;
}

function installBlacklistObserver(): void {
  blacklistObserver = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type !== "childList") continue;
      r.addedNodes.forEach((node) => analyzeAddedNode(node));
    }
  });
  blacklistObserver.observe(document.body, { childList: true, subtree: true });
}

function analyzeAddedNode(node: Node): void {
  // Skip nodes added as part of a legitimate updateProtected() call.
  if (isUnderActiveNonce(node)) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const data = (node as Text).data ?? "";
    if (CURRENCY_RE.test(data)) {
      reportTamper("blacklist_currency_text_node", { text: data.slice(0, 80) });
    }
    return;
  }

  if (!(node instanceof HTMLElement)) return;

  const text = node.textContent ?? "";
  if (CURRENCY_RE.test(text)) {
    reportTamper("blacklist_currency_text", {
      tag: node.tagName,
      text: text.slice(0, 80),
    });
    return;
  }

  const style = window.getComputedStyle(node);
  if (style.position === "fixed" || style.position === "absolute") {
    const z = Number.parseInt(style.zIndex, 10);
    if (Number.isFinite(z) && z >= SUSPECT_Z_INDEX) {
      reportTamper("blacklist_overlay_position", {
        tag: node.tagName,
        position: style.position,
        zIndex: z,
      });
      return;
    }
  }

  const overlap = findRectOverlap(node);
  if (overlap) {
    reportTamper("blacklist_overlay_rect", {
      tag: node.tagName,
      overlaps: overlap.dataset.protected ?? overlap.id ?? null,
    });
  }
}

function findRectOverlap(el: HTMLElement): HTMLElement | null {
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return null;
  const protectedEls = document.querySelectorAll<HTMLElement>(PROTECTED_SELECTOR);
  for (const pEl of protectedEls) {
    const pr = pEl.getBoundingClientRect();
    if (rectsApproxEqual(rect, pr, RECT_TOLERANCE)) return pEl;
  }
  return null;
}

function rectsApproxEqual(a: DOMRect, b: DOMRect, tol: number): boolean {
  return (
    Math.abs(a.left - b.left) <= tol &&
    Math.abs(a.top - b.top) <= tol &&
    Math.abs(a.width - b.width) <= tol &&
    Math.abs(a.height - b.height) <= tol
  );
}
