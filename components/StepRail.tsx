import { STEPS } from "@/lib/steps";

interface StepRailProps {
  current: number;
  onSelect: (i: number) => void;
}

export function StepRail({ current, onSelect }: StepRailProps) {
  return (
    <nav aria-label="Transformer steps" className="flex max-w-full flex-[1_1_240px] flex-col gap-1">
      <span className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Pipeline</span>
      {STEPS.map((s, i) => {
        const isCurrent = i === current;
        const isDone = i < current;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={isCurrent ? "step" : undefined}
            className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition-colors ${
              isCurrent
                ? "bg-accent font-semibold text-white"
                : isDone
                  ? "text-ink hover:bg-white"
                  : "text-muted hover:bg-white"
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
