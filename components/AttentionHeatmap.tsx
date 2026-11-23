import { MASKED_STYLE, maxAbs, probStyle, valueStyle } from "@/lib/colors";
import { argmax, type MaskedMatrix, type Matrix } from "@/lib/transformer";
import { cellHandlers, highlightStyle, useHover } from "./hover";

interface AttentionHeatmapProps {
  tokens: string[];
  scores: MaskedMatrix;
  weights: Matrix;
  /** "scores" shows raw Q·Kᵀ/√d, "softmax" shows the attention weights. */
  mode: "scores" | "softmax";
  focus: number;
  onFocus: (i: number) => void;
}

export function AttentionHeatmap({ tokens, scores, weights, mode, focus, onFocus }: AttentionHeatmapProps) {
  const max = maxAbs(scores);
  const hover = useHover();
  const cellKey = mode === "softmax" ? "A" : "S";

  return (
    <div className="overflow-x-auto">
      <div className="flex w-max flex-col gap-1">
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
                  <span
                    key={j}
                    className="relative flex h-11 w-16 cursor-pointer items-center justify-center rounded-md font-mono text-xs text-ink"
                    style={{ ...style, ...highlightStyle(hover, cellKey, i, j) }}
                    {...cellHandlers(hover, { key: cellKey, i, j })}
                  >
                    {text}
                  </span>
                );
              })}

              {mode === "softmax" && (
                <span className="pl-2 font-mono text-xs text-muted">
                  Σ {weights[i].reduce((a, b) => a + b, 0).toFixed(2)}
                </span>
              )}
            </div>
          );
        })}

        <p className="m-0 pt-1.5 text-xs text-muted">
          Rows = Queries (kaun dekh raha hai). Kisi row ke naam par click karo.
        </p>
      </div>
    </div>
  );
}
