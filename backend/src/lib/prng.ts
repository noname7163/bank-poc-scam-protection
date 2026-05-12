// SFC32 — a fast, well-distributed 32-bit PRNG. Deterministic for a given
// 4×u32 seed, which we derive from the session's SHA-256 seed.

export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Returns a uniformly chosen element of `arr`. */
  pick<T>(arr: readonly T[]): T;
  /** Returns true with probability `p`. */
  chance(p: number): boolean;
}

export function sfc32(a: number, b: number, c: number, d: number): Rng {
  let sa = a >>> 0;
  let sb = b >>> 0;
  let sc = c >>> 0;
  let sd = d >>> 0;

  const next = (): number => {
    sa |= 0; sb |= 0; sc |= 0; sd |= 0;
    const t = (((sa + sb) | 0) + sd) | 0;
    sd = (sd + 1) | 0;
    sa = sb ^ (sb >>> 9);
    sb = (sc + (sc << 3)) | 0;
    sc = (sc << 21) | (sc >>> 11);
    sc = (sc + t) | 0;
    return (t >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error("pick from empty array");
      return arr[Math.floor(next() * arr.length)]!;
    },
    chance(p) {
      return next() < p;
    },
  };
}

/**
 * Build an SFC32 PRNG from a hex string of at least 32 chars (we take the
 * first 32 hex chars = 4×u32 = 16 bytes of entropy).
 */
export function rngFromHex(hex: string): Rng {
  if (hex.length < 32) {
    throw new Error(`seed hex too short: ${hex.length}`);
  }
  const a = parseInt(hex.slice(0, 8), 16);
  const b = parseInt(hex.slice(8, 16), 16);
  const c = parseInt(hex.slice(16, 24), 16);
  const d = parseInt(hex.slice(24, 32), 16);
  return sfc32(a, b, c, d);
}
