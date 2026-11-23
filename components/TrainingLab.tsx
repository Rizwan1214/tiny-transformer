"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CORPORA, DEFAULT_CONFIG, LEARNING_RATES, Trainer, probePrompts } from "@/lib/trainer";
import { useLang } from "./lang";

type Speed = "slow" | "normal" | "fast";
/** Steps per animation frame, and the minimum gap between frames that train. */
const SPEEDS: Record<Speed, { steps: number; everyMs: number }> = {
  slow: { steps: 1, everyMs: 150 },
  normal: { steps: 1, everyMs: 0 },
  fast: { steps: 6, everyMs: 0 },
};
/** Training pauses itself after this many steps per press of Train, to spare the CPU on a plateau. */
const RUN_LENGTH = 400;

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; name: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">{label}</span>
      <div role="group" aria-label={label} className="flex items-center gap-1 rounded-[10px] border border-line bg-canvas p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`h-9 cursor-pointer rounded-lg px-2.5 text-xs font-semibold ${
              value === o.value ? "bg-ink text-on-ink" : "text-ink hover:bg-surface"
            }`}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LossChart({ losses, chance, label, chanceLabel }: { losses: number[]; chance: number; label: string; chanceLabel: string }) {
  const W = 600;
  const H = 200;
  const pad = { l: 36, r: 8, t: 10, b: 22 };
  const maxStep = Math.max(200, losses.length);
  const top = Math.max(chance, ...losses) * 1.05;
  const x = (s: number) => pad.l + (s / maxStep) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const points = losses.map((v, k) => `${x(k + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, Math.round(maxStep / 2), maxStep];

  return (
    <figure className="m-0 flex flex-col gap-1">
      <figcaption className="text-sm font-semibold text-ink">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: ${losses.at(-1)?.toFixed(3) ?? "–"}`}>
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="var(--color-line-strong)" />
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={y(0)} stroke="var(--color-line-strong)" />
        <line x1={pad.l} x2={W - pad.r} y1={y(chance)} y2={y(chance)} stroke="var(--color-muted)" strokeDasharray="4 4" />
        <text x={W - pad.r} y={y(chance) - 5} textAnchor="end" fontSize="11" fill="var(--color-muted)">
          {chanceLabel} = {chance.toFixed(2)}
        </text>
        {[0, chance / 2, chance].map((v) => (
          <text key={v} x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
            {v.toFixed(1)}
          </text>
        ))}
        {ticks.map((s) => (
          <text key={s} x={x(s)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
            {s}
          </text>
        ))}
        {losses.length > 1 && (
          <polyline points={points} fill="none" stroke="var(--color-accent-ink)" strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {losses.length > 0 && (
          <circle cx={x(losses.length)} cy={y(losses.at(-1)!)} r="4" fill="var(--color-accent-ink)" />
        )}
      </svg>
    </figure>
  );
}

export function TrainingLab() {
  const { t } = useLang();
  const [corpusId, setCorpusId] = useState(CORPORA[0].id);
  const [learningRate, setLearningRate] = useState<number>(DEFAULT_CONFIG.learningRate);
  const [trainer, setTrainer] = useState(() => new Trainer(CORPORA[0], DEFAULT_CONFIG));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [prompt, setPrompt] = useState(CORPORA[0].probe);
  const [autoPaused, setAutoPaused] = useState(false);
  // Bumped after training so React re-renders; the trainer itself is mutated in place.
  const [, setTick] = useState(0);
  const pauseAt = useRef(RUN_LENGTH);

  const corpus = trainer.corpus;

  const rebuild = (id: string, lr: number) => {
    const c = CORPORA.find((x) => x.id === id) ?? CORPORA[0];
    setRunning(false);
    setAutoPaused(false);
    setTrainer(new Trainer(c, { ...DEFAULT_CONFIG, learningRate: lr }));
    setPrompt(c.probe);
  };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      const { steps, everyMs } = SPEEDS[speed];
      if (now - last >= everyMs) {
        last = now;
        for (let k = 0; k < steps; k++) trainer.trainStep();
        setTick((n) => n + 1);
        if (trainer.step >= pauseAt.current) {
          setRunning(false);
          setAutoPaused(true);
          return;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, trainer]);

  const play = () => {
    pauseAt.current = trainer.step + RUN_LENGTH;
    setAutoPaused(false);
    setRunning(true);
  };

  const stepOnce = () => {
    setRunning(false);
    trainer.trainStep();
    setTick((n) => n + 1);
  };

  const changeLr = (lr: number) => {
    setLearningRate(lr);
    trainer.setLearningRate(lr);
  };

  const probe = trainer.probe(prompt);
  const loss = trainer.losses.at(-1);
  const { dModel, numHeads, dFF } = trainer.config;

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-[760px] text-[15px] text-ink-soft">{t("trainIntro")}</p>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Segmented
          label={t("corpus")}
          value={corpusId}
          onChange={(id) => {
            setCorpusId(id);
            rebuild(id, learningRate);
          }}
          options={[
            { value: "urdu", name: t("corpusUrdu") },
            { value: "animals", name: t("corpusAnimals") },
          ]}
        />
        <Segmented
          label={t("learningRate")}
          value={learningRate}
          onChange={changeLr}
          options={LEARNING_RATES.map((lr) => ({ value: lr, name: String(lr) }))}
        />
        <Segmented
          label={t("speed")}
          value={speed}
          onChange={setSpeed}
          options={[
            { value: "slow", name: t("speedSlow") },
            { value: "normal", name: t("speedNormal") },
            { value: "fast", name: t("speedFast") },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={running ? () => setRunning(false) : play}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-ink"
        >
          {running ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 5v14l12-7z" />
            </svg>
          )}
          {running ? t("pause") : t("play")}
        </button>
        <button
          type="button"
          onClick={stepOnce}
          className="min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-semibold text-ink"
        >
          {t("stepOnce")}
        </button>
        <button
          type="button"
          onClick={() => rebuild(corpusId, learningRate)}
          className="min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-semibold text-ink"
        >
          {t("reset")}
        </button>
        <span className="font-mono text-xs text-muted">
          {t("modelShape", { d: dModel, h: numHeads, ff: dFF, v: trainer.vocab.length })}
        </span>
      </div>

      {autoPaused && <p className="m-0 text-[13px] text-muted">{t("trainAutoPaused", { n: RUN_LENGTH })}</p>}

      <div className="flex flex-wrap items-start gap-6">
        {/* Left: numbers, chart, the loop */}
        <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-4">
          <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [t("statStep"), String(trainer.step)],
              [t("statLoss"), loss === undefined ? "–" : loss.toFixed(3)],
              [t("statChance"), trainer.chanceLoss.toFixed(3)],
              [t("statParams"), String(trainer.parameterCount)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[10px] border border-line bg-panel px-3 py-2">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="m-0 font-mono text-lg font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <LossChart losses={trainer.losses} chance={trainer.chanceLoss} label={t("lossChartTitle")} chanceLabel={t("lossChartChance")} />
          <p className="m-0 text-xs text-muted">{t("lossChartFloor")}</p>

          <section className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
            <h2 className="m-0 font-display text-lg font-semibold">{t("trainLoopTitle")}</h2>
            <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[14px] text-ink-soft">
              <li>{t("trainLoop1")}</li>
              <li>{t("trainLoop2")}</li>
              <li>{t("trainLoop3")}</li>
              <li>{t("trainLoop4")}</li>
            </ol>
          </section>
        </div>

        {/* Right: data and live predictions */}
        <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-sm font-semibold text-ink">{t("corpus")}</h2>
            <ul className="m-0 flex list-none flex-col gap-1 rounded-xl border border-line bg-panel p-3 font-mono text-[13px] text-ink-soft">
              {corpus.sentences.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="m-0 text-sm font-semibold text-ink">{t("probeTitle")}</h2>
            <p className="m-0 text-xs text-muted">{t("probeHelp")}</p>
            <div className="flex flex-wrap gap-1.5">
              {probePrompts(corpus).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrompt(p)}
                  aria-pressed={p === prompt}
                  className={`min-h-9 cursor-pointer rounded-full border px-3 py-1 font-mono text-xs ${
                    p === prompt ? "border-ink bg-ink text-on-ink" : "border-line bg-canvas text-ink-soft hover:border-line-strong"
                  }`}
                >
                  {p} …
                </button>
              ))}
            </div>

            {probe && (
              <>
                <p className="m-0 font-mono text-base text-ink">
                  {probe.tokens.join(" ")} <span className="text-muted">→</span>{" "}
                  <span className="rounded-md bg-accent px-2 py-0.5 text-white">{probe.next[0].word}</span>
                </p>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {probe.next.slice(0, 5).map((p, k) => (
                    <li key={p.word} className="flex items-center gap-2">
                      <span className={`w-16 truncate text-right font-mono text-sm ${k === 0 ? "font-bold text-accent-ink" : "text-ink-soft"}`}>
                        {p.word}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-track">
                        <motion.div
                          className="h-full rounded"
                          animate={{ width: `${Math.max(1, p.p * 100)}%` }}
                          transition={{ duration: 0.15 }}
                          style={{ background: k === 0 ? "#3B4BD8" : "#AEB5EF" }}
                        />
                      </div>
                      <span className="w-12 font-mono text-xs text-ink-soft">{(p.p * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted">{t("probeAttention")}</span>
                  {probe.attention.map((A, h) => {
                    const row = A[probe.tokens.length - 1];
                    return (
                      <div key={h} className="flex flex-wrap items-center gap-1">
                        <span className="w-14 font-mono text-[11px] font-bold text-accent-ink">{t("headTitle", { n: h + 1 })}</span>
                        {probe.tokens.map((tok, j) => (
                          <span
                            key={j}
                            className="flex flex-col items-center rounded-md px-2 py-1 font-mono text-[11px] text-ink transition-colors duration-150"
                            style={{ background: `rgba(59,75,216,${(0.05 + row[j] * 0.57).toFixed(2)})` }}
                          >
                            <span>{tok}</span>
                            <span className="text-[10px]">{row[j].toFixed(2)}</span>
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
