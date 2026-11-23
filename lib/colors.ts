import type { CSSProperties } from "react";

// Alphas are capped at ~0.62 so dark text stays readable (≥ 4.5:1) on every cell.
const POSITIVE = "59,75,216"; // accent blue
const NEGATIVE = "217,72,15"; // orange

export const MASKED_STYLE: CSSProperties = {
  background:
    "repeating-linear-gradient(45deg, #ECEEF2, #ECEEF2 6px, #F7F8FA 6px, #F7F8FA 12px)",
  color: "#5B6170",
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
    boxShadow: isRowMax ? "inset 0 0 0 2px #14161C" : undefined,
  };
}

export function maxAbs(values: (number | null)[][]): number {
  const flat = values.flat().filter((v): v is number => v !== null);
  return Math.max(0.01, ...flat.map(Math.abs));
}
