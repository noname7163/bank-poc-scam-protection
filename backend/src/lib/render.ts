// Server-side PNG rendering of Layer-2-protected values. Uses @napi-rs/canvas
// (cairo-backed) with the DejaVu fonts installed in the Dockerfile.
//
// Every PNG is drawn at 2× the logical pixel size for crisp display on
// HiDPI screens. The img tag in the page sets width/height to the logical
// size; the browser downscales the doubled bitmap.

import { createCanvas } from "@napi-rs/canvas";
import { formatCurrencyCents, formatSignedCents } from "./format.js";

const SCALE = 2;
const SANS = '"DejaVu Sans", sans-serif';
const MONO = '"DejaVu Sans Mono", monospace';

// Colour scheme matches the banking app's Tailwind palette so the rendered
// PNG fits the surrounding UI seamlessly.
const COLOR_TEXT = "#0f172a"; // slate-900
const COLOR_INCOMING = "#059669"; // emerald-600
const COLOR_IBAN = "#475569"; // slate-600

interface CanvasDimensions {
  width: number;
  height: number;
  fontPx: number;
  fontWeight: string;
  fontFamily: string;
  color: string;
  baseline: number;
}

function render(dims: CanvasDimensions, text: string): Buffer {
  const canvas = createCanvas(dims.width * SCALE, dims.height * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.font = `${dims.fontWeight} ${dims.fontPx}px ${dims.fontFamily}`;
  ctx.fillStyle = dims.color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 0, dims.baseline);
  return canvas.toBuffer("image/png");
}

export function renderBalancePng(balanceCents: number): Buffer {
  return render(
    {
      width: 360,
      height: 56,
      fontPx: 40,
      fontWeight: "600",
      fontFamily: SANS,
      color: COLOR_TEXT,
      baseline: 44,
    },
    formatCurrencyCents(balanceCents),
  );
}

export function renderAmountPng(direction: "in" | "out", amountCents: number): Buffer {
  return render(
    {
      width: 220,
      height: 40,
      fontPx: 30,
      fontWeight: "600",
      fontFamily: SANS,
      color: direction === "in" ? COLOR_INCOMING : COLOR_TEXT,
      baseline: 32,
    },
    formatSignedCents(direction, amountCents),
  );
}

export function renderIbanPng(iban: string): Buffer {
  return render(
    {
      width: 320,
      height: 22,
      fontPx: 14,
      fontWeight: "400",
      fontFamily: MONO,
      color: COLOR_IBAN,
      baseline: 17,
    },
    iban,
  );
}
