import pg from "pg";

// BIGINT (OID 20) returns as string by default; coerce to JS Number. Safe
// for our domain — cent amounts stay well below 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (val) => Number.parseInt(val, 10));

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({ connectionString: DATABASE_URL });

export async function withRetry<T>(fn: () => Promise<T>, attempts = 20, delayMs = 500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
