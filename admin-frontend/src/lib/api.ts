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
  if (res.status === 204) return undefined as T;
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
  put: <T,>(path: string, body?: unknown) => call<T>("PUT", path, body),
  del: <T,>(path: string) => call<T>("DELETE", path),
};

export interface AdminUserSummary {
  id: string;
  email: string;
  display_name: string;
  user_locked_at: string | null;
  max_strikes: number;
  account_id: string | null;
  iban: string | null;
  holder_name: string | null;
  balance_cents: number | null;
  strike_count: number;
}

export interface ImageProtection {
  balance?: boolean;
  tx_amount?: boolean;
  tx_iban?: boolean;
}

export interface AdminAccount {
  id: string;
  user_id: string;
  iban: string;
  holder_name: string;
  balance_cents: number;
  image_protection: ImageProtection;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  max_strikes: number;
  locked_at: string | null;
  strike_count: number;
}

export interface AdminTransaction {
  id: string;
  direction: "in" | "out";
  type: string;
  amount_cents: number;
  counterparty_name: string;
  counterparty_iban: string;
  reference: string;
  booked_at: string;
}
