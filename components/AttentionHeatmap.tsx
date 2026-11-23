"use client";

import { motion } from "motion/react";
import { MASKED_STYLE, maxAbs, probStyle, valueStyle } from "@/lib/colors";
import { argmax, type MaskedMatrix, type Matrix } from "@/lib/transformer";
import { cellHandlers, highlightStyle, useHover } from "./hover";

/** Rows sweep in top to bottom, each cell a beat after its left neighbour. */
const HEAT_ROW = 0.09;
const HEAT_CELL = 0.035;

interface AttentionHeatmapProps {
  tokens: string[];
  scores: MaskedMatrix;
  weights: Matrix;
  /** "scores" shows raw Q·Kᵀ/√d, "softmax" shows the attention weights. */
  mode: "scores" | "softmax";
  focus: number;
  onFocus: (i: number) => void;
  /** Which attention head this map belongs to (0-based). */
  head: number;
  /** Shown above the map when there is more than one head. */
  title?: string;
  /** Seconds to wait before the sweep starts, so several heads reveal one after another. */
  startDelay?: number;
}

export function AttentionHeatmap({
  tokens,
  scores,
  weights,
  mode,
  focus,
  onFocus,
  head,
  title,
  startDelay = 0,
}: AttentionHeatmapProps) {
  const max = maxAbs(scores);
  const hover = useHover();
  const cellKey = mode === "softmax" ? "A" : "S";

  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <div className="flex w-max flex-col gap-1">
        {title && <div className="pb-1 font-mono text-sm font-bold text-ink">{title}</div>}
        <div className="pl-[92px] text-xs text-muted">Keys (kis ko dekha ja raha hai) →</div>
        <div className="flex gap-1 pl-[92px]">
          {tokens.map((t, j) => (
            <span key={j} className="w-16 text-center font-mono text-xs text-ink-soft">
              {t}
            </span>
          ))}
        </div>

        {tokens.map((t, i) => {
          const rowMax = argmax(weights[i]);
          const selected = i === focus;
          return (
            <div key={i} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onFocus(i)}
                aria-pressed={selected}
                className={`h-11 w-[88px] cursor-pointer truncate rounded-lg border px-2.5 text-left font-mono text-xs ${
                  selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"
                }`}
              >
                {i + 1}.{t}
              </button>

              {scores[i].map((s, j) => {
                const masked = s === null;
                const style = masked
                  ? MASKED_STYLE
                  : mode === "softmax"
                    ? probStyle(weights[i][j], j === rowMax)
                    : valueStyle(s, max);
                const text = mode === "softmax" ? (masked ? "0" : weights[i][j].toFixed(2)) : masked ? "−∞" : s.toFixed(2);
                return (
                  <motion.span
                    key={j}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: startDelay + i * HEAT_ROW + j * HEAT_CELL,
                      type: "spring",
                      stiffness: 380,
                      damping: 26,
                    }}
                    className="relative flex h-11 w-16 cursor-pointer items-center justify-center rounded-md font-mono text-xs text-ink transition-colors duration-300"
                    style={{ ...style, ...highlightStyle(hover, cellKey, i, j, head) }}
                    {...cellHandlers(hover, { key: cellKey, i, j, head })}
                  >
                    {text}
                  </motion.span>
                );
              })}

              {mode === "softmax" && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: startDelay + i * HEAT_ROW + tokens.length * HEAT_CELL + 0.1 }}
                  className="pl-2 font-mono text-xs text-muted"
                >
                  Σ {weights[i].reduce((a, b) => a + b, 0).toFixed(2)}
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
