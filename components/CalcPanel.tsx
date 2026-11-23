import { explainCell, type CellRef } from "@/lib/explain";
import type { TransformerTrace } from "@/lib/transformer";

interface CalcPanelProps {
  trace: TransformerTrace;
  active: CellRef | null;
}

/** Shows the arithmetic behind whichever cell the viewer last pointed at. */
export function CalcPanel({ trace, active }: CalcPanelProps) {
  if (!active) {
    return (
      <div className="rounded-[10px] border border-dashed border-line-strong bg-white px-4 py-3 text-[13px] text-muted">
        Kisi bhi number par hover karo (phone par tap) aur yahan uska poora hisaab dikhega.
      </div>
    );
  }

  const { title, lines, result } = explainCell(trace, active);

  return (
    <div aria-live="polite" className="flex flex-col gap-2 rounded-[10px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">Calculation</span>
        <span className="font-mono text-sm font-bold text-ink">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex w-max min-w-full flex-col gap-1 font-mono text-[13px] text-ink-soft">
          {lines.map((line, k) => (
            <span key={k} className="whitespace-nowrap">
              {line}
            </span>
          ))}
          <span className="whitespace-nowrap font-bold text-accent-ink">= {result}</span>
        </div>
      </div>
    </div>
  );
}
