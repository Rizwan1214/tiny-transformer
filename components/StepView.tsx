import { WEIGHTS, type TransformerTrace } from "@/lib/transformer";
import { AttentionHeatmap } from "./AttentionHeatmap";
import { FocusPanel } from "./FocusPanel";
import { MatrixGrid, MatrixRow, Operator } from "./MatrixGrid";
import { NextTokenBars } from "./NextTokenBars";
import { TokenChips } from "./TokenChips";

interface StepViewProps {
  step: number;
  trace: TransformerTrace;
  focus: number;
  onFocus: (i: number) => void;
}

const SUB = "₁₂₃₄";
/** Seconds between one head's reveal and the next. */
const HEAD_GAP = 0.6;

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft">
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded bg-[rgba(59,75,216,0.6)]" /> positive
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded bg-[rgba(217,72,15,0.6)]" /> negative
      </span>
      <span className="text-muted">Rang jitna gehra, number utna bara</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-xs text-muted">{children}</p>;
}

/** Renders the visualization for one pipeline step. */
export function StepView({ step, trace, focus, onFocus }: StepViewProps) {
  const { tokens, heads, dHead } = trace;
  const multi = heads.length > 1;
  const rows = tokens.map((t, i) => `${i + 1}.${t}`);
  const dims = Array.from({ length: 4 }, (_, j) => `d${j}`);
  const sub = (name: string, h: number) => (multi ? `${name}${SUB[h]}` : name);
  /** Column labels of a head's slice, e.g. d2, d3 for head 2 of 2. */
  const headDims = (h: number) => Array.from({ length: dHead }, (_, k) => `d${h * dHead + k}`);
  const headRange = (h: number) => `d${h * dHead}–d${(h + 1) * dHead - 1}`;
  const headWeights = heads.map((hd) => hd.A);

  switch (step) {
    case 0:
      return <TokenChips tokens={tokens} />;
    case 1:
      return <TokenChips tokens={tokens} ids={trace.ids} />;
    case 2:
      return (
        <>
          <Legend />
          <MatrixRow>
            <MatrixGrid cellKey="E" label="E" matrix={trace.E} rowLabels={rows} />
          </MatrixRow>
        </>
      );
    case 3:
      return (
        <>
          <Legend />
          <MatrixRow>
            <MatrixGrid cellKey="E" label="E" matrix={trace.E} rowLabels={rows} />
            <Operator>+</Operator>
            <MatrixGrid cellKey="PE" label="PE" matrix={trace.PE} rowLabels={rows} />
            <Operator>=</Operator>
            <MatrixGrid cellKey="X" label="X" matrix={trace.X} rowLabels={rows} />
          </MatrixRow>
        </>
      );
    case 4: {
      const cols = multi ? dims.map((d, j) => `h${Math.floor(j / dHead) + 1}·${d}`) : dims;
      return (
        <>
          <Legend />
          <MatrixRow>
            <MatrixGrid cellKey="Q" label="Q = X·W_Q" matrix={trace.Q} rowLabels={rows} colLabels={cols} />
            <MatrixGrid cellKey="K" label="K = X·W_K" matrix={trace.K} rowLabels={rows} colLabels={cols} />
            <MatrixGrid cellKey="V" label="V = X·W_V" matrix={trace.V} rowLabels={rows} colLabels={cols} />
          </MatrixRow>
          {multi && (
            <Note>
              {heads.length} heads: har head ko {dHead} columns milte hain ({heads.map((_, h) => `head ${h + 1} = ${headRange(h)}`).join(", ")}).
              Har head apne hisse se alag attention nikalta hai.
            </Note>
          )}
        </>
      );
    }
    case 5:
    case 6:
      return (
        <>
          {step === 5 && <Legend />}
          <div className="flex flex-wrap gap-x-8 gap-y-6">
            {heads.map((hd, h) => (
              <AttentionHeatmap
                key={h}
                head={h}
                title={multi ? `Head ${h + 1}  (${headRange(h)}, √${dHead})` : undefined}
                startDelay={h * HEAD_GAP}
                tokens={tokens}
                scores={hd.S}
                weights={hd.A}
                mode={step === 5 ? "scores" : "softmax"}
                focus={focus}
                onFocus={onFocus}
              />
            ))}
          </div>
          <Note>Rows = Queries (kaun dekh raha hai). Kisi row ke naam par click karo.</Note>
          {step === 6 && (
            <FocusPanel tokens={tokens} headWeights={headWeights} focus={focus} onFocus={onFocus} showBreakdown={false} />
          )}
        </>
      );
    case 7:
      return (
        <>
          <Legend />
          {heads.map((hd, h) => (
            <MatrixRow key={h} delay={h * HEAD_GAP}>
              <MatrixGrid
                cellKey="A"
                head={h}
                label={sub("A", h)}
                matrix={hd.A}
                rowLabels={rows}
                colLabels={tokens}
                variant="prob"
                maskFrom={hd.S}
              />
              <Operator>×</Operator>
              <MatrixGrid cellKey="V" head={h} label={sub("V", h)} matrix={hd.V} rowLabels={rows} colLabels={headDims(h)} />
              <Operator>=</Operator>
              <MatrixGrid cellKey="Z" head={h} label={sub("Z", h)} matrix={hd.Z} rowLabels={rows} colLabels={headDims(h)} />
            </MatrixRow>
          ))}
          <MatrixRow delay={heads.length * HEAD_GAP}>
            <MatrixGrid
              cellKey="C"
              label={multi ? `Concat(${heads.map((_, h) => `Z${SUB[h]}`).join(", ")})` : "Z"}
              matrix={trace.C}
              rowLabels={rows}
            />
            <Operator>×</Operator>
            <MatrixGrid label="W_O" matrix={WEIGHTS.Wo} rowLabels={dims} />
            <Operator>=</Operator>
            <MatrixGrid cellKey="O" label="O" matrix={trace.O} rowLabels={rows} />
          </MatrixRow>
          <FocusPanel tokens={tokens} headWeights={headWeights} focus={focus} onFocus={onFocus} showBreakdown />
        </>
      );
    case 8:
      return (
        <>
          <Legend />
          <MatrixRow>
            <MatrixGrid cellKey="Y" label="Y = LN(X + O)" matrix={trace.Y} rowLabels={rows} />
            <Operator>→ FFN →</Operator>
            <MatrixGrid cellKey="F" label="FFN(Y)" matrix={trace.F} rowLabels={rows} />
            <Operator>→ add, LN →</Operator>
            <MatrixGrid cellKey="H" label="H" matrix={trace.H} rowLabels={rows} />
          </MatrixRow>
        </>
      );
    default:
      return <NextTokenBars tokens={tokens} vocab={trace.vocab} probs={trace.probs} />;
  }
}
