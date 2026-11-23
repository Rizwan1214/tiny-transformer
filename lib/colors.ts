import type { CSSProperties } from "react";

// Alphas are capped at ~0.62 so text stays readable (≥ 4.5:1) on every cell, over the
// light surface with dark text and over the dark surface with light text alike.
const POSITIVE = "59,75,216"; // accent blue
const NEGATIVE = "217,72,15"; // orange

export const MASKED_STYLE: CSSProperties = {
  background:
    "repeating-linear-gradient(45deg, var(--color-hatch-a), var(--color-hatch-a) 6px, var(--color-hatch-b) 6px, var(--color-hatch-b) 12px)",
  color: "var(--color-muted)",
};

/** Diverging color: blue for positive, orange for negative, darker = bigger |v|. */
export function valueStyle(v: number, maxAbs: number): CSSProperties {
  const strength = Math.min(1, Math.abs(v) / maxAbs);
  const rgb = v >= 0 ? POSITIVE : NEGATIVE;
  return { background: `rgba(${rgb},${(0.06 + strength * 0.56).toFixed(2)})` };
}

/** Sequential blue for probabilities in [0, 1]. */
export function probStyle(p: number, isRowMax: boolean): CSSProperties {
  return {
    background: `rgba(${POSITIVE},${(0.05 + p * 0.57).toFixed(2)})`,
    fontWeight: isRowMax ? 700 : 500,
    boxShadow: isRowMax ? "inset 0 0 0 2px var(--color-ink)" : undefined,
  };
}

export function maxAbs(values: (number | null)[][]): number {
  const flat = values.flat().filter((v): v is number => v !== null);
  return Math.max(0.01, ...flat.map(Math.abs));
}
