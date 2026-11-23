"use client";

import { useEffect, useRef } from "react";
import { STEPS } from "@/lib/steps";

interface StepRailProps {
  current: number;
  onSelect: (i: number) => void;
}

/**
 * The pipeline's steps: a vertical list on wide screens, a horizontally
 * scrolling strip of pills on phones so the step content stays near the top.
 */
export function StepRail({ current, onSelect }: StepRailProps) {
  const currentRef = useRef<HTMLButtonElement>(null);

  // Keep the active pill visible when the strip scrolls sideways on phones.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [current]);

  return (
    <nav
      aria-label="Transformer steps"
      className="-mx-3 flex w-[calc(100%+1.5rem)] gap-1 overflow-x-auto px-3 pb-1 md:mx-0 md:w-auto md:max-w-full md:flex-[1_1_240px] md:flex-col md:overflow-visible md:px-0 md:pb-0"
    >
      <span className="hidden px-3 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted md:block">
        Pipeline
      </span>
      {STEPS.map((s, i) => {
        const isCurrent = i === current;
        const isDone = i < current;
        return (
          <button
            key={s.id}
            ref={isCurrent ? currentRef : undefined}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={isCurrent ? "step" : undefined}
            className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-left text-sm transition-colors md:w-full md:gap-3 md:rounded-[10px] ${
              isCurrent
                ? "bg-accent font-semibold text-white"
                : isDone
                  ? "border border-line bg-white text-ink md:border-0 md:bg-transparent md:hover:bg-white"
                  : "border border-line bg-white text-muted md:border-0 md:bg-transparent md:hover:bg-white"
            }`}
          >
            <span
              className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isCurrent
                  ? "bg-white text-accent"
                  : isDone
                    ? "bg-[#E4E7FB] text-accent-ink"
                    : "text-muted shadow-[inset_0_0_0_1.5px_#C5CAD4]"
              }`}
            >
              {i + 1}
            </span>
            {s.title}
          </button>
        );
      })}
    </nav>
  );
}
