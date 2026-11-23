import { argmax, type Matrix } from "@/lib/transformer";

interface FocusPanelProps {
  tokens: string[];
  weights: Matrix;
  focus: number;
  onFocus: (i: number) => void;
  showBreakdown: boolean;
}

export function FocusPanel({ tokens, weights, focus, onFocus, showBreakdown }: FocusPanelProps) {
  const row = weights[focus];
  const top = argmax(row);
  const breakdown =
    `z(${tokens[focus]}) = ` +
    row
      .map((a, j) => (a > 0.0005 ? `${a.toFixed(2)}·v(${tokens[j]})` : null))
      .filter(Boolean)
      .join(" + ");

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="pr-1 text-[13px] font-semibold text-ink-soft">Token chuno:</span>
        {tokens.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onFocus(i)}
            aria-pressed={i === focus}
            className={`min-h-9 cursor-pointer rounded-full border px-3 py-1 font-mono text-xs ${
              i === focus ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink"
            }`}
          >
            {i + 1}.{t}
          </button>
        ))}
      </div>
      <p className="m-0 text-[15px] text-ink">
        “{tokens[focus]}” sab se zyada “{tokens[top]}” (position {top + 1}) ko dekh raha hai, weight{" "}
        {row[top].toFixed(2)}.
      </p>
      {showBreakdown && (
        <code className="block overflow-x-auto whitespace-nowrap rounded-lg bg-canvas px-3 py-2.5 font-mono text-[13px] text-accent-ink">
          {breakdown}
        </code>
      )}
    </div>
  );
}
