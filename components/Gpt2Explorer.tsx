"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { MASKED_STYLE } from "@/lib/colors";
import { loadIndex, loadPreset, showToken, type Gpt2Data, type Gpt2Index } from "@/lib/gpt2";

/** Blue with strength ∝ weight; alpha capped so dark text stays readable. */
function weightStyle(w: number): React.CSSProperties {
  return { background: `rgba(59,75,216,${(0.04 + Math.min(1, w) * 0.58).toFixed(2)})` };
}

type Pair = { q: number; t: number };

export function Gpt2Explorer() {
  const [index, setIndex] = useState<Gpt2Index | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<Gpt2Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState(0);
  const [pair, setPair] = useState<Pair | null>(null);

  useEffect(() => {
    loadIndex()
      .then((ix) => {
        setIndex(ix);
        setSlug((s) => s ?? ix.presets[0]?.slug ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    loadPreset(slug)
      .then((d) => {
        if (cancelled) return;
        // Open on the strongest head for this sentence's highlighted token pair.
        const best = d.highlight.topHeads[0];
        setData(d);
        setLayer(best.layer);
        setHead(best.head);
        setPair({ q: d.highlight.query, t: d.highlight.target });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return <p className="m-0 text-sm text-[#B42318]">GPT-2 data load nahi hua: {error}</p>;
  }
  if (!index || !data || !pair) {
    return <p className="m-0 text-sm text-muted">GPT-2 data load ho raha hai…</p>;
  }

  const tokens = data.tokens.map((t) => showToken(t.text));
  const att = data.attentions[layer][head];
  const pairWeight = (l: number, h: number) => data.attentions[l][h][pair.q][pair.t];
  const label = (l: number, h: number) => `L${l + 1}·H${h + 1}`;
  const top = data.nextTokens[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Model facts */}
      <div className="flex flex-wrap gap-2">
        {[
          `${index.model} small`,
          `${index.params} parameters`,
          `${index.layers} layers × ${index.heads} heads`,
          `d_model = ${index.dModel}`,
        ].map((t) => (
          <span key={t} className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-mono text-xs text-ink-soft">
            {t}
          </span>
        ))}
      </div>
      <p className="m-0 max-w-[760px] text-[15px] text-ink-soft">
        Ye asli, trained GPT-2 hai. Iske numbers pehle se nikale gaye hain (
        <code className="font-mono text-[13px]">scripts/export_gpt2.py</code>), is liye sirf neeche wale sentences chalte
        hain. 768 dimensions screen par nahi aa sakte, is liye yahan tokens, attention aur predictions dikhaye gaye hain.
      </p>

      {/* Sentence picker */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="pr-1 text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">Sentence</span>
        {index.presets.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setSlug(p.slug)}
            aria-pressed={p.slug === slug}
            className={`min-h-9 cursor-pointer rounded-full border px-3 py-1 font-mono text-xs ${
              p.slug === slug ? "border-ink bg-ink text-white" : "border-line bg-canvas text-ink-soft hover:border-line-strong"
            }`}
          >
            {p.text}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={data.slug}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex min-w-0 flex-col gap-6"
        >
          {/* Tokens + what GPT-2 expected after each one */}
          <section className="flex flex-col gap-3">
            <h2 className="m-0 font-display text-xl font-semibold">1. BPE tokens</h2>
            <p className="m-0 text-[13px] text-muted">
              · ka matlab hai token ke shuru mein space hai. Har token ke neeche: uska ID, aur us jagah GPT-2 ne agla token kya
              socha tha.
            </p>
            <ol className="m-0 flex list-none flex-wrap gap-2.5 p-0">
              {data.tokens.map((t, i) => {
                const guess = data.positionTop[i][0];
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="rounded-[10px] border border-accent-line bg-accent-soft px-3 py-2 font-mono text-sm text-ink">
                      {tokens[i]}
                    </span>
                    <span className="font-mono text-[11px] text-accent-ink">{t.id}</span>
                    <span className="font-mono text-[11px] text-muted" title="GPT-2 ka is position par agla guess">
                      → {showToken(guess.text)} {Math.round(guess.p * 100)}%
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </section>

          {/* What to look for */}
          <section className="flex flex-col gap-3 rounded-xl border border-line bg-[#FAFBFC] p-4">
            <h2 className="m-0 font-display text-xl font-semibold">2. Kya dekhna hai</h2>
            <p className="m-0 text-[15px] text-ink">{data.note}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-ink-soft">
                “{tokens[data.highlight.query]}” → “{tokens[data.highlight.target]}” sab se zyada dekhne wale heads:
              </span>
              {data.highlight.topHeads.map((h) => (
                <button
                  key={`${h.layer}-${h.head}`}
                  type="button"
                  onClick={() => {
                    setLayer(h.layer);
                    setHead(h.head);
                    setPair({ q: data.highlight.query, t: data.highlight.target });
                  }}
                  className="min-h-9 cursor-pointer rounded-lg border border-accent-line bg-white px-2.5 font-mono text-xs text-accent-ink hover:bg-accent-soft"
                >
                  {label(h.layer, h.head)} · {h.weight.toFixed(2)}
                </button>
              ))}
            </div>
          </section>

          {/* Head map + selected head's attention */}
          <section className="flex flex-col gap-3">
            <h2 className="m-0 font-display text-xl font-semibold">3. Attention: 144 heads</h2>
            <p className="m-0 max-w-[760px] text-[13px] text-muted">
              Bayen wala grid har layer aur head ke liye batata hai ke “{tokens[pair.q]}” kitna “{tokens[pair.t]}” ko dekh
              raha hai. Kisi head par click karo to dayen uska poora attention map khulega. Map mein kisi cell par click karo
              to woh token pair chun liya jayega.
            </p>
            <div className="flex flex-wrap items-start gap-8">
              <div className="overflow-x-auto">
                <div className="flex w-max flex-col gap-[2px]">
                  <div className="flex gap-[2px] pl-9">
                    {Array.from({ length: data.heads }, (_, h) => (
                      <span key={h} className="w-7 text-center font-mono text-[10px] text-muted">
                        H{h + 1}
                      </span>
                    ))}
                  </div>
                  {Array.from({ length: data.layers }, (_, l) => (
                    <div key={l} className="flex items-center gap-[2px]">
                      <span className="w-8 pr-1 text-right font-mono text-[10px] text-muted">L{l + 1}</span>
                      {Array.from({ length: data.heads }, (_, h) => {
                        const w = pairWeight(l, h);
                        const selected = l === layer && h === head;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              setLayer(l);
                              setHead(h);
                            }}
                            aria-label={`${label(l, h)}: ${w.toFixed(2)}`}
                            aria-pressed={selected}
                            title={`${label(l, h)}: ${w.toFixed(2)}`}
                            className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                            style={{
                              ...weightStyle(w),
                              outline: selected ? "2px solid #14161C" : undefined,
                              outlineOffset: 1,
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-w-0 max-w-full flex-col gap-2">
                <div className="font-mono text-sm">
                  <span className="font-bold text-ink">{label(layer, head)}</span>
                  <span className="text-ink-soft">
                    {" "}
                    · “{tokens[pair.q]}” → “{tokens[pair.t]}” = {att[pair.q][pair.t].toFixed(2)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <motion.div
                    key={`${layer}-${head}`}
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex w-max flex-col gap-[2px]"
                  >
                    <div className="flex gap-[2px] pl-[84px]">
                      {tokens.map((t, j) => (
                        <span
                          key={j}
                          className={`w-10 truncate text-center font-mono text-[10px] ${j === pair.t ? "font-bold text-accent-ink" : "text-muted"}`}
                          title={t}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    {att.map((row, i) => (
                      <div key={i} className="flex items-center gap-[2px]">
                        <span
                          className={`w-20 truncate pr-1 text-right font-mono text-[11px] ${i === pair.q ? "font-bold text-accent-ink" : "text-ink-soft"}`}
                          title={tokens[i]}
                        >
                          {tokens[i]}
                        </span>
                        {row.map((w, j) => {
                          const masked = j > i;
                          const selected = i === pair.q && j === pair.t;
                          return (
                            <button
                              key={j}
                              type="button"
                              disabled={masked}
                              onClick={() => setPair({ q: i, t: j })}
                              aria-label={`${tokens[i]} → ${tokens[j]}: ${w.toFixed(2)}`}
                              className="flex h-8 w-10 items-center justify-center rounded border-0 p-0 font-mono text-[10px] text-ink enabled:cursor-pointer"
                              style={{
                                ...(masked ? MASKED_STYLE : weightStyle(w)),
                                outline: selected ? "2px solid #14161C" : undefined,
                                outlineOffset: 1,
                              }}
                            >
                              {masked ? "" : w >= 0.995 ? "1" : w.toFixed(2).slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </motion.div>
                </div>
                <p className="m-0 text-xs text-muted">Rows = Queries, columns = Keys. Values .xx = 0.xx</p>
              </div>
            </div>
          </section>

          {/* Real next-token prediction */}
          <section className="flex flex-col gap-3">
            <h2 className="m-0 font-display text-xl font-semibold">4. Agla token</h2>
            <p className="m-0 font-display text-2xl text-ink">
              “{data.text}” <span className="text-muted">→</span>{" "}
              <span className="rounded-lg bg-accent px-2.5 py-0.5 text-white">{showToken(top.text)}</span>
            </p>
            <ul className="m-0 flex max-w-[640px] list-none flex-col gap-2 p-0">
              {data.nextTokens.map((p, k) => (
                <li key={`${p.text}-${k}`} className="flex items-center gap-3">
                  <span
                    className={`w-24 truncate text-right font-mono text-sm ${k === 0 ? "font-bold text-accent-ink" : "text-ink-soft"}`}
                  >
                    {showToken(p.text)}
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-[#EEF0F4]">
                    <motion.div
                      className="h-full rounded-md"
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.max(1.5, (p.p / top.p) * 100)}%` }}
                      transition={{ delay: 0.1 + k * 0.05, duration: 0.5, ease: "easeOut" }}
                      style={{ background: k === 0 ? "#3B4BD8" : "#AEB5EF" }}
                    />
                  </div>
                  <span className="w-14 font-mono text-[13px] text-ink-soft">{(p.p * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[13px] text-muted">
              Ye 50,257 words ki vocabulary mein se top 10 hain. Toy model ke ulat, ye weights trained hain, is liye predictions
              matlab rakhti hain.
            </p>
          </section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
