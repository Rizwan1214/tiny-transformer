"use client";

import { motion } from "motion/react";
import { Children } from "react";
import { MASKED_STYLE, maxAbs, probStyle, valueStyle } from "@/lib/colors";
import type { CellKey } from "@/lib/explain";
import { argmax, type MaskedMatrix } from "@/lib/transformer";
import { cellHandlers, highlightStyle, useHover } from "./hover";
import { CELL_STAGGER, ROW_STAGGER, SequenceDelay, useSequenceDelay } from "./sequence";

interface MatrixGridProps {
  label: string;
  matrix: MaskedMatrix;
  rowLabels: string[];
  colLabels?: string[];
  /** "value" = diverging blue/orange, "prob" = attention weights (row max outlined). */
  variant?: "value" | "prob";
  /** Cells that are `null` here are drawn as masked (used for attention weights). */
  maskFrom?: MaskedMatrix;
  /** Makes cells explainable on hover/tap in the Calculation panel. */
  cellKey?: CellKey;
  /** Attention head this matrix belongs to (per-head A, V slice, Z). */
  head?: number;
}

export function MatrixGrid({
  label,
  matrix,
  rowLabels,
  colLabels,
  variant = "value",
  maskFrom,
  cellKey,
  head,
}: MatrixGridProps) {
  const hover = useHover();
  const start = useSequenceDelay();
  const cols = colLabels ?? matrix[0].map((_, j) => `d${j}`);
  const max = maxAbs(matrix);

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="flex items-baseline gap-2 font-mono">
        <span className="text-sm font-bold text-ink">{label}</span>
        <span className="text-xs text-muted">
          {matrix.length} × {matrix[0].length}
        </span>
      </figcaption>
      <div className="flex flex-col gap-[3px]">
        <div className="flex gap-[3px] pl-[67px]">
          {cols.map((c, j) => (
            <span key={j} className="w-14 text-center font-mono text-[11px] text-muted">
              {c}
            </span>
          ))}
        </div>
        {matrix.map((row, i) => {
          const rowMax = variant === "prob" ? argmax(row.map((v) => v ?? -Infinity)) : -1;
          return (
            <div key={i} className="flex items-center gap-[3px]">
              <span className="w-[60px] truncate pr-1 text-right font-mono text-xs text-ink-soft">
                {rowLabels[i]}
              </span>
              {row.map((v, j) => {
                const masked = v === null || maskFrom?.[i][j] === null;
                const style = masked
                  ? MASKED_STYLE
                  : variant === "prob"
                    ? probStyle(v as number, j === rowMax)
                    : valueStyle(v as number, max);
                return (
                  <motion.span
                    key={j}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: start + i * ROW_STAGGER + j * CELL_STAGGER,
                      type: "spring",
                      stiffness: 420,
                      damping: 28,
                    }}
                    className={`relative flex h-[34px] w-14 items-center justify-center rounded-md font-mono text-xs font-medium text-ink transition-colors duration-300 ${
                      cellKey ? "cursor-pointer" : ""
                    }`}
                    style={cellKey ? { ...style, ...highlightStyle(hover, cellKey, i, j, head) } : style}
                    {...(cellKey ? cellHandlers(hover, { key: cellKey, i, j, head }) : {})}
                  >
                    {v === null ? "−∞" : masked ? "0" : v.toFixed(2)}
                  </motion.span>
                );
              })}
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export function Operator({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap font-mono text-lg font-medium text-muted">{children}</span>;
}

/** Seconds between one block of an equation and the next. */
const BLOCK_GAP = 0.35;

/**
 * Lays matrices and operators out in a horizontally scrollable row and
 * reveals them left to right, so "E + PE = X" reads like it is being written.
 */
export function MatrixRow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex w-max items-center gap-5">
        {Children.toArray(children).map((child, k) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + k * BLOCK_GAP, duration: 0.25, ease: "easeOut" }}
          >
            <SequenceDelay.Provider value={delay + k * BLOCK_GAP}>{child}</SequenceDelay.Provider>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
