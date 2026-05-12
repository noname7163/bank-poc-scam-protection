// Thin wrapper around fetch — always sends cookies, parses JSON, throws on
// non-2xx with the parsed error body attached.

export interface ApiError extends Error {
  status: number;
  body: unknown;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: { Accept: "application/json" },
  };
  if (body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  const text = await res.text();
  const parsed = text.length > 0 ? safeJson(text) : null;
  if (!res.ok) {
    const err = new Error(`api ${method} ${path} -> ${res.status}`) as ApiError;
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T,>(path: string) => call<T>("GET", path),
  post: <T,>(path: string, body?: unknown) => call<T>("POST", path, body),
};

export interface MeResponse {
  user: { id: string; email: string; display_name: string };
  session: { id: string; strike_count: number; locked: boolean };
}

export interface ImageProtection {
  balance?: boolean;
  tx_amount?: boolean;
  tx_iban?: boolean;
}

export interface Account {
  id: string;
  iban: string;
  holder_name: string;
  balance_cents: number;
  image_protection?: ImageProtection;
  render_urls?: { balance?: string };
}

export interface Transaction {
  id: string;
  direction: "in" | "out";
  type: string;
  amount_cents: number;
  counterparty_name: string;
  counterparty_iban: string;
  reference: string;
  booked_at: string;
  render_urls?: {
    tx_amount?: string;
    tx_sender_iban?: string;
    tx_recipient_iban?: string;
  };
}
