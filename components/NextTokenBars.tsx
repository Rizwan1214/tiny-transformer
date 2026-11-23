"use client";

import { AnimatePresence, motion } from "motion/react";
import { cellHandlers, highlightStyle, useHover } from "./hover";
import { useLang } from "./lang";

interface NextTokenBarsProps {
  tokens: string[];
  vocab: string[];
  probs: number[];
}

const BAR_STAGGER = 0.07;

export function NextTokenBars({ tokens, vocab, probs }: NextTokenBarsProps) {
  const hover = useHover();
  const { t } = useLang();
  const ranked = vocab.map((word, i) => ({ word, p: probs[i], index: i })).sort((a, b) => b.p - a.p);
  const top = ranked[0];
  const barsDone = 0.2 + ranked.length * BAR_STAGGER + 0.4;

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 font-display text-2xl text-ink">
        “{tokens.join(" ")}” <span className="text-muted">→</span>{" "}
        <AnimatePresence mode="popLayout" initial={true}>
          <motion.span
            key={top.word}
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
            transition={{ delay: barsDone, type: "spring", stiffness: 380, damping: 20 }}
            className="inline-block rounded-lg bg-accent px-2.5 py-0.5 text-white"
          >
            {top.word}
          </motion.span>
        </AnimatePresence>
      </p>
      <ul className="m-0 flex max-w-[640px] list-none flex-col gap-2 p-0">
        {ranked.map(({ word, p, index }, k) => (
          // `layout` slides rows to their new rank when the sentence changes.
          <motion.li
            key={word}
            layout
            transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}
            className="flex cursor-pointer items-center gap-3 rounded-md"
            style={highlightStyle(hover, "P", index, 0)}
            {...cellHandlers(hover, { key: "P", i: index, j: 0 })}
          >
            <span
              className={`w-14 text-right font-mono text-sm ${k === 0 ? "font-bold text-accent-ink" : "text-ink-soft"}`}
            >
              {word}
            </span>
            <div className="h-7 flex-1 overflow-hidden rounded-md bg-track">
              <motion.div
                className="h-full rounded-md"
                initial={{ width: "0%" }}
                animate={{
                  width: `${Math.max(2, (p / top.p) * 100)}%`,
                  backgroundColor: k === 0 ? "#3B4BD8" : "#AEB5EF",
                }}
                transition={{ delay: 0.2 + k * BAR_STAGGER, duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="w-14 font-mono text-[13px] text-ink-soft">{(p * 100).toFixed(1)}%</span>
          </motion.li>
        ))}
      </ul>
      <p className="m-0 text-[13px] text-muted">
        {t("randomNote")}
      </p>
    </div>
  );
}
