import { argmax, type Matrix } from "@/lib/transformer";
import { useLang } from "./lang";

interface FocusPanelProps {
  tokens: string[];
  /** Attention weights, one matrix per head. */
  headWeights: Matrix[];
  focus: number;
  onFocus: (i: number) => void;
  showBreakdown: boolean;
}

const SUB = "₁₂₃₄";

export function FocusPanel({ tokens, headWeights, focus, onFocus, showBreakdown }: FocusPanelProps) {
  const { t } = useLang();
  const multi = headWeights.length > 1;
  const name = (h: number) => (multi ? t("headTitle", { n: h + 1 }) : "");

  const summaries = headWeights.map((weights, h) => {
    const row = weights[focus];
    const top = argmax(row);
    const breakdown =
      `z${multi ? SUB[h] : ""}(${tokens[focus]}) = ` +
      row
        .map((a, j) => (a > 0.0005 ? `${a.toFixed(2)}·v${multi ? SUB[h] : ""}(${tokens[j]})` : null))
        .filter(Boolean)
        .join(" + ");
    return { h, top, weight: row[top], breakdown };
  });

  const disagree = multi && new Set(summaries.map((s) => s.top)).size > 1;

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="pr-1 text-[13px] font-semibold text-ink-soft">{t("pickToken")}</span>
        {tokens.map((tok, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onFocus(i)}
            aria-pressed={i === focus}
            className={`min-h-9 cursor-pointer rounded-full border px-3 py-1 font-mono text-xs ${
              i === focus ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink"
            }`}
          >
            {i + 1}.{tok}
          </button>
        ))}
      </div>

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {summaries.map(({ h, top, weight }) => (
          <li key={h} className="text-[15px] text-ink">
            {multi && <span className="mr-2 font-mono text-xs font-bold text-accent-ink">{name(h)}:</span>}
            {t("focusLine", { q: tokens[focus], t: tokens[top], pos: top + 1, w: weight.toFixed(2) })}
          </li>
        ))}
      </ul>

      {multi && (
        <p className="m-0 text-[13px] text-muted">
          {disagree ? t("headsDisagree") : t("headsAgree")}
        </p>
      )}

      {showBreakdown && (
        <div className="flex flex-col gap-1.5">
          {summaries.map(({ h, breakdown }) => (
            <code
              key={h}
              className="block overflow-x-auto whitespace-nowrap rounded-lg bg-canvas px-3 py-2.5 font-mono text-[13px] text-accent-ink"
            >
              {breakdown}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
