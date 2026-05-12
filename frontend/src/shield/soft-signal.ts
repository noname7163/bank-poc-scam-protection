// Soft signals: fire-and-forget reports to the backend that get logged
// structurally but do NOT increment strikes or trigger quarantine. Used
// for noisy heuristics (DevTools detection, etc.) where false positives
// are real and auto-locking would be hostile to the user.

export interface SoftSignalEvent {
  reason: string;
  details: Record<string, unknown>;
  page: string;
  timestamp: number;
}

export function softSignal(reason: string, details: Record<string, unknown> = {}): void {
  const body: SoftSignalEvent = {
    reason,
    details,
    page: window.location.pathname,
    timestamp: Date.now(),
  };
  console.warn("[shield] soft signal:", body);
  fetch("/api/signal", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    // Soft signal — failures are not interesting.
  });
}
