import { MAX_TOKENS } from "@/lib/transformer";

interface TokenChipsProps {
  tokens: string[];
  ids?: number[];
}

export function TokenChips({ tokens, ids }: TokenChipsProps) {
  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 font-display text-[26px] text-ink">“{tokens.join(" ")}”</p>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B6170" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="m6 13 6 6 6-6" />
      </svg>
      <ol className="m-0 flex list-none flex-wrap gap-3 p-0">
        {tokens.map((t, i) => (
          <li key={i} className="flex flex-col items-center gap-2">
            <span className="rounded-[10px] border border-accent-line bg-accent-soft px-4 py-2.5 font-mono text-base text-ink">
              {t}
            </span>
            {ids && (
              <span className="rounded-md border border-dashed border-[#8E97E6] bg-white px-2 py-1 font-mono text-[13px] text-accent-ink">
                {ids[i]}
              </span>
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
