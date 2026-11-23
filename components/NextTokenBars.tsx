import { cellHandlers, highlightStyle, useHover } from "./hover";

interface NextTokenBarsProps {
  tokens: string[];
  vocab: string[];
  probs: number[];
}

export function NextTokenBars({ tokens, vocab, probs }: NextTokenBarsProps) {
  const hover = useHover();
  const ranked = vocab.map((word, i) => ({ word, p: probs[i], index: i })).sort((a, b) => b.p - a.p);
  const top = ranked[0];

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 font-display text-2xl text-ink">
        “{tokens.join(" ")}” <span className="text-muted">→</span>{" "}
        <span className="rounded-lg bg-accent px-2.5 py-0.5 text-white">{top.word}</span>
      </p>
      <ul className="m-0 flex max-w-[640px] list-none flex-col gap-2 p-0">
        {ranked.map(({ word, p, index }, k) => (
          <li
            key={word}
            className="flex cursor-pointer items-center gap-3 rounded-md"
            style={highlightStyle(hover, "P", index, 0)}
            {...cellHandlers(hover, { key: "P", i: index, j: 0 })}
          >
            <span
              className={`w-14 text-right font-mono text-sm ${k === 0 ? "font-bold text-accent-ink" : "text-ink-soft"}`}
            >
              {word}
            </span>
            <div className="h-7 flex-1 overflow-hidden rounded-md bg-[#EEF0F4]">
              <div
                className="h-full rounded-md transition-[width] duration-500"
                style={{
                  width: `${Math.max(2, (p / top.p) * 100)}%`,
                  background: k === 0 ? "#3B4BD8" : "#AEB5EF",
                }}
              />
            </div>
            <span className="w-14 font-mono text-[13px] text-ink-soft">{(p * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[13px] text-muted">
        Weights random hain, is liye prediction bhi random hai. Training ke baad yahi bars sahi word ko upar le aate hain.
      </p>
    </div>
  );
}
