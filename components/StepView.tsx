import type { TransformerTrace } from "@/lib/transformer";
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

/** Renders the visualization for one pipeline step. */
export function StepView({ step, trace, focus, onFocus }: StepViewProps) {
  const { tokens } = trace;
  const rows = tokens.map((t, i) => `${i + 1}.${t}`);

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
    case 4:
      return (
        <>
          <Legend />
          <MatrixRow>
            <MatrixGrid cellKey="Q" label="Q = X·W_Q" matrix={trace.Q} rowLabels={rows} />
            <MatrixGrid cellKey="K" label="K = X·W_K" matrix={trace.K} rowLabels={rows} />
            <MatrixGrid cellKey="V" label="V = X·W_V" matrix={trace.V} rowLabels={rows} />
          </MatrixRow>
        </>
      );
    case 5:
    case 6:
      return (
        <>
          {step === 5 && <Legend />}
          <AttentionHeatmap
            tokens={tokens}
            scores={trace.S}
            weights={trace.A}
            mode={step === 5 ? "scores" : "softmax"}
            focus={focus}
            onFocus={onFocus}
          />
          {step === 6 && (
            <FocusPanel tokens={tokens} weights={trace.A} focus={focus} onFocus={onFocus} showBreakdown={false} />
          )}
        </>
      );
    case 7:
      return (
        <>
          <Legend />
          <MatrixRow>
            <MatrixGrid cellKey="A" label="A" matrix={trace.A} rowLabels={rows} colLabels={tokens} variant="prob" maskFrom={trace.S} />
            <Operator>×</Operator>
            <MatrixGrid cellKey="V" label="V" matrix={trace.V} rowLabels={rows} />
            <Operator>=</Operator>
            <MatrixGrid cellKey="Z" label="Z" matrix={trace.Z} rowLabels={rows} />
          </MatrixRow>
          <FocusPanel tokens={tokens} weights={trace.A} focus={focus} onFocus={onFocus} showBreakdown />
        </>
      );
    case 8:
      return (
        <>
          <Legend />
          <MatrixRow>
            <MatrixGrid cellKey="Y" label="Y = LN(X + Z)" matrix={trace.Y} rowLabels={rows} />
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
