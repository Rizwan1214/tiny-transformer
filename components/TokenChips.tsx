"use client";

import { motion } from "motion/react";
import { MAX_TOKENS } from "@/lib/transformer";

interface TokenChipsProps {
  tokens: string[];
  ids?: number[];
}

const CHIP_STAGGER = 0.09;

export function TokenChips({ tokens, ids }: TokenChipsProps) {
  const chipsDone = 0.35 + tokens.length * CHIP_STAGGER;

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 font-display text-[26px] text-ink">“{tokens.join(" ")}”</p>
      <motion.svg
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.25 }}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5B6170"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="m6 13 6 6 6-6" />
      </motion.svg>
      <ol className="m-0 flex list-none flex-wrap gap-3 p-0">
        {tokens.map((t, i) => (
          // Keyed by text too, so a token that changes while typing pops in again.
          <li key={`${i}-${t}`} className="flex flex-col items-center gap-2">
            <motion.span
              initial={{ opacity: 0, y: -18, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 + i * CHIP_STAGGER, type: "spring", stiffness: 420, damping: 22 }}
              className="rounded-[10px] border border-accent-line bg-accent-soft px-4 py-2.5 font-mono text-base text-ink"
            >
              {t}
            </motion.span>
            {ids && (
              <motion.span
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: chipsDone + i * CHIP_STAGGER, duration: 0.25 }}
                className="rounded-md border border-dashed border-[#8E97E6] bg-white px-2 py-1 font-mono text-[13px] text-accent-ink"
              >
                {ids[i]}
              </motion.span>
            )}
          </li>
        ))}
      </ol>
      <p className="m-0 text-[13px] text-muted">
        {ids
          ? "IDs ek 50,000 words wali vocabulary ke index hain (yahan hash se bane hain)."
          : `${tokens.length} tokens (is demo mein max ${MAX_TOKENS})`}
      </p>
    </div>
  );
}
