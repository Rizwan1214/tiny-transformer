"use client";

import { motion } from "motion/react";
import { explainCell, type CellRef } from "@/lib/explain";
import type { TransformerTrace } from "@/lib/transformer";
import { useLang } from "./lang";

interface CalcPanelProps {
  trace: TransformerTrace;
  active: CellRef | null;
}

/** Shows the arithmetic behind whichever cell the viewer last pointed at. */
export function CalcPanel({ trace, active }: CalcPanelProps) {
  const { lang, t } = useLang();
  if (!active) {
    return (
      <div className="rounded-[10px] border border-dashed border-line-strong bg-surface px-4 py-3 text-[13px] text-muted">
        {t("calcHint")}
      </div>
    );
  }

  const { title, lines, result } = explainCell(trace, active, lang);

  return (
    <div aria-live="polite" className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent-ink">{t("calcLabel")}</span>
        <span className="font-mono text-sm font-bold text-ink">{title}</span>
      </div>
      <div className="overflow-x-auto">
        {/* Re-keyed per cell so each new calculation writes itself out line by line. */}
        <div key={title} className="flex w-max min-w-full flex-col gap-1 font-mono text-[13px] text-ink-soft">
          {[...lines, `= ${result}`].map((line, k) => (
            <motion.span
              key={k}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: k * 0.06, duration: 0.18 }}
              className={`whitespace-nowrap ${k === lines.length ? "font-bold text-accent-ink" : ""}`}
            >
              {line}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
