"use client";

import { useMemo, useState } from "react";
import { STEPS } from "@/lib/steps";
import { runTransformer } from "@/lib/transformer";
import { StepRail } from "./StepRail";
import { StepView } from "./StepView";

const PRESETS = ["the cat sat on the mat", "i love cats", "main ghar ja raha hoon"];

export function Visualizer() {
  const [text, setText] = useState(PRESETS[0]);
  const [step, setStep] = useState(0);
  const [causalMask, setCausalMask] = useState(true);
  const [focusChoice, setFocusChoice] = useState<number | null>(null);

  const trace = useMemo(() => runTransformer(text, causalMask), [text, causalMask]);
  const n = trace.tokens.length;
  const focus = focusChoice !== null && focusChoice < n ? focusChoice : n - 1;
  const meta = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const changeText = (value: string) => {
    setText(value);
    setFocusChoice(null);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-7 gap-y-4 px-6 py-4">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path d="M14 17.5h7" />
                <path d="M17.5 14v7" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold leading-tight">Tiny Transformer</span>
              <span className="text-xs text-muted">Har step screen par, live math ke saath</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <label htmlFor="sentence" className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">
                Sentence
              </label>
              <input
                id="sentence"
                type="text"
                value={text}
                onChange={(e) => changeText(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-[10px] border border-line-strong bg-white px-3.5 font-mono text-[15px] text-ink"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Try:</span>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => changeText(p)}
                  className="min-h-8 cursor-pointer rounded-full border border-line bg-canvas px-2.5 py-1 font-mono text-xs text-ink-soft hover:border-line-strong"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-mono text-xs text-ink-soft">d_model = 4</span>
            <span className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-mono text-xs text-ink-soft">1 head · 1 layer</span>
            <button
              type="button"
              onClick={() => setCausalMask((m) => !m)}
              aria-pressed={causalMask}
              className={`min-h-11 cursor-pointer rounded-[10px] border px-3.5 text-[13px] font-semibold ${
                causalMask ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink"
              }`}
            >
              Causal mask: {causalMask ? "On" : "Off"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1360px] flex-wrap items-start gap-6 p-6">
        <StepRail current={step} onSelect={setStep} />

        <section className="flex min-w-0 flex-[999_1_640px] flex-col gap-5 rounded-2xl border border-line bg-white p-8">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
              Step {step + 1} / {STEPS.length}
            </span>
            <h1 className="m-0 font-display text-[34px] font-semibold leading-tight">{meta.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-accent-soft px-3 py-1.5 font-mono text-sm text-accent-ink">{meta.formula}</code>
              <span className="font-mono text-xs text-muted">{meta.shape}</span>
            </div>
            <p className="m-0 max-w-[720px] text-base text-ink-soft">{meta.explain}</p>
          </div>

          <div className="flex min-h-[340px] min-w-0 flex-col gap-5 rounded-xl border border-line bg-[#FAFBFC] p-6">
            <StepView step={step} trace={trace} focus={focus} onFocus={setFocusChoice} />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong bg-white px-4.5 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m11 6-6 6 6 6" />
              </svg>
              Back
            </button>
            <div className="flex flex-[1_1_160px] flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted">
                Step {step + 1} / {STEPS.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep((s) => (isLast ? 0 : s + 1))}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-accent px-4.5 text-sm font-semibold text-white hover:bg-accent-ink"
            >
              {isLast ? "Shuru se dobara" : `Next: ${STEPS[step + 1].title}`}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
