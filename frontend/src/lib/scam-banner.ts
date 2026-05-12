// Self-repairing scam warning. Used on /quarantine and /locked — both pages
// run with no other shield infrastructure, so the banner has its own
// dedicated guard:
//
//   1. Snapshot the banner's outerHTML at module-load time.
//   2. MutationObserver on document.body restores the banner the instant
//      anything inside it changes, or the banner itself is removed.
//   3. setInterval as a backup heartbeat in case the observer is killed.
//
// All state (pristine HTML, parent reference) lives inside the IIFE
// closure of this function and is not reachable from the outside JS.

export function protectScamBanner(): void {
  const banner = document.getElementById("scam-banner");
  if (!banner) return;
  const parent = banner.parentElement;
  if (!parent) return;

  const pristineHtml = banner.outerHTML;

  const restore = (): void => {
    const current = document.getElementById("scam-banner");
    if (!current) {
      parent.insertAdjacentHTML("afterbegin", pristineHtml);
      return;
    }
    if (current.outerHTML !== pristineHtml) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = pristineHtml;
      const fresh = wrapper.firstElementChild as HTMLElement | null;
      if (fresh) current.replaceWith(fresh);
    }
  };

  const obs = new MutationObserver(restore);
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  // Heartbeat backup: if the attacker manages to disconnect the observer,
  // this still catches the manipulation within half a second.
  window.setInterval(restore, 500);
}
