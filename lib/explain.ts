// Turns "which cell is the viewer pointing at?" into the exact arithmetic
// that produced it, using the numbers already stored in the trace.

import { D_MODEL, LOGIT_SCALE, WEIGHTS, embed, type Matrix, type TransformerTrace } from "./transformer";

export type CellKey = "E" | "PE" | "X" | "Q" | "K" | "V" | "S" | "A" | "Z" | "Y" | "F" | "H" | "P";

export interface CellRef {
  key: CellKey;
  i: number; // row (token index; vocab index for "P")
  j: number; // column (dimension or key-token index)
}

/** A cell, a whole row (`j` omitted) or a whole column (`i` omitted) that fed the active cell. */
export interface RelatedRef {
  key: CellKey;
  i?: number;
  j?: number;
}

export interface Explanation {
  title: string;
  lines: string[];
  result: string;
}

const f = (v: number) => v.toFixed(2);
/** Wraps negatives in brackets so "a × (−b)" reads clearly. */
const fp = (v: number) => (v < 0 ? `(${v.toFixed(2)})` : v.toFixed(2));
const col = (M: Matrix, j: number) => M.map((r) => r[j]);
const dotTerms = (a: number[], b: number[]) => a.map((v, k) => `${fp(v)}×${fp(b[k])}`).join(" + ");
const dot = (a: number[], b: number[]) => a.reduce((s, v, k) => s + v * b[k], 0);

function layerNormLines(rowName: string, r: number[], j: number): string[] {
  const mean = r.reduce((s, v) => s + v, 0) / r.length;
  const std = Math.sqrt(r.reduce((s, v) => s + (v - mean) ** 2, 0) / r.length + 1e-5);
  return [
    `${rowName} = [${r.map(f).join(", ")}]`,
    `mean = ${f(mean)},  std = ${f(std)}`,
    `(${fp(r[j])} − ${fp(mean)}) / ${f(std)}`,
  ];
}

export function explainCell(t: TransformerTrace, ref: CellRef): Explanation {
  const { i, j } = ref;
  const tok = (k: number) => `${k + 1}.${t.tokens[k]}`;

  switch (ref.key) {
    case "E":
      return {
        title: `E[${tok(i)}, d${j}]`,
        lines: [`id("${t.tokens[i]}") = ${t.ids[i]}`, `E = EmbeddingTable[${t.ids[i]}][${j}]`],
        result: f(t.E[i][j]),
      };

    case "PE": {
      const pair = 2 * Math.floor(j / 2);
      const angle = i / Math.pow(10000, pair / D_MODEL);
      const fn = j % 2 === 0 ? "sin" : "cos";
      return {
        title: `PE[pos ${i}, d${j}]`,
        lines: [
          `${j % 2 === 0 ? "Even" : "Odd"} dimension → ${fn}`,
          `${fn}(${i} / 10000^(${pair}/${D_MODEL})) = ${fn}(${angle.toFixed(3)})`,
        ],
        result: f(t.PE[i][j]),
      };
    }

    case "X":
      return {
        title: `X[${tok(i)}, d${j}]`,
        lines: [`E + PE`, `= ${fp(t.E[i][j])} + ${fp(t.PE[i][j])}`],
        result: f(t.X[i][j]),
      };

    case "Q":
    case "K":
    case "V": {
      const W = { Q: WEIGHTS.Wq, K: WEIGHTS.Wk, V: WEIGHTS.Wv }[ref.key];
      return {
        title: `${ref.key}[${tok(i)}, d${j}]`,
        lines: [`X[${tok(i)}] · W_${ref.key}[:, ${j}]`, `= ${dotTerms(t.X[i], col(W, j))}`],
        result: f(t[ref.key][i][j]),
      };
    }

    case "S": {
      const s = t.S[i][j];
      if (s === null) {
        return {
          title: `S[${tok(i)} → ${tok(j)}]`,
          lines: [`Key position ${j + 1} > query position ${i + 1}`, `Future token, causal mask laga diya`],
          result: "−∞",
        };
      }
      const raw = dot(t.Q[i], t.K[j]);
      return {
        title: `S[${tok(i)} → ${tok(j)}]`,
        lines: [
          `Q[${tok(i)}] · K[${tok(j)}] / √${D_MODEL}`,
          `= (${dotTerms(t.Q[i], t.K[j])}) / ${Math.sqrt(D_MODEL)}`,
          `= ${f(raw)} / ${Math.sqrt(D_MODEL)}`,
        ],
        result: f(s),
      };
    }

    case "A": {
      if (t.S[i][j] === null) {
        return {
          title: `A[${tok(i)} → ${tok(j)}]`,
          lines: [`S = −∞, aur e^(−∞) = 0`],
          result: "0.00",
        };
      }
      const row = t.S[i];
      const finite = row.filter((v): v is number => v !== null);
      const max = Math.max(...finite);
      const exps = row.map((v) => (v === null ? 0 : Math.exp(v - max)));
      const sum = exps.reduce((a, b) => a + b, 0);
      return {
        title: `A[${tok(i)} → ${tok(j)}]`,
        lines: [
          `e^S[${tok(i)}, ${tok(j)}] / Σ e^S[${tok(i)}, k]`,
          `(stable softmax: har score se row ka max ${f(max)} minus kiya)`,
          `= ${exps[j].toFixed(3)} / (${exps.filter((_, k) => row[k] !== null).map((e) => e.toFixed(3)).join(" + ")})`,
          `= ${exps[j].toFixed(3)} / ${sum.toFixed(3)}`,
        ],
        result: f(t.A[i][j]),
      };
    }

    case "Z":
      return {
        title: `Z[${tok(i)}, d${j}]`,
        lines: [`Σ_k A[${tok(i)}, k] × V[k, d${j}]`, `= ${dotTerms(t.A[i], col(t.V, j))}`],
        result: f(t.Z[i][j]),
      };

    case "Y":
      return {
        title: `Y[${tok(i)}, d${j}]`,
        lines: [`LayerNorm(X + Z)`, ...layerNormLines(`X + Z`, t.R1[i], j)],
        result: f(t.Y[i][j]),
      };

    case "F":
      return {
        title: `FFN(Y)[${tok(i)}, d${j}]`,
        lines: [
          `h = ReLU(Y[${tok(i)}] · W1)   (4 → 8, negative values 0 ho jati hain)`,
          `h = [${t.hidden[i].map(f).join(", ")}]`,
          `h · W2[:, ${j}] = ${dotTerms(t.hidden[i], col(WEIGHTS.W2, j))}`,
        ],
        result: f(t.F[i][j]),
      };

    case "H":
      return {
        title: `H[${tok(i)}, d${j}]`,
        lines: [`LayerNorm(Y + FFN(Y))`, ...layerNormLines(`Y + FFN`, t.R2[i], j)],
        result: f(t.H[i][j]),
      };

    case "P": {
      const word = t.vocab[i];
      const max = Math.max(...t.logits);
      const exps = t.logits.map((l) => Math.exp(l - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      const last = t.H[t.tokens.length - 1];
      const e = embed(word);
      return {
        title: `p("${word}")`,
        lines: [
          `logit = ${LOGIT_SCALE} × (h_last · E["${word}"])`,
          `h_last · E = ${dotTerms(last, e)} = ${f(dot(last, e))}`,
          `logit = ${LOGIT_SCALE} × ${fp(dot(last, e))} = ${f(t.logits[i])}`,
          `p = e^(logit − max) / Σ e^(logits − max) = ${exps[i].toFixed(3)} / ${sum.toFixed(3)}`,
        ],
        result: `${(t.probs[i] * 100).toFixed(1)}%`,
      };
    }
  }
}

/** Which cells fed the active one, so the UI can outline them. */
export function relatedCells(ref: CellRef | null): RelatedRef[] {
  if (!ref) return [];
  const { i, j } = ref;
  switch (ref.key) {
    case "X":
      return [{ key: "E", i, j }, { key: "PE", i, j }];
    case "Z":
      return [{ key: "A", i }, { key: "V", j }];
    case "F":
      return [{ key: "Y", i }];
    case "H":
      return [{ key: "Y", i, j }, { key: "F", i, j }];
    default:
      return [];
  }
}

export function isRelated(related: RelatedRef[], key: CellKey, i: number, j: number): boolean {
  return related.some((r) => r.key === key && (r.i === undefined || r.i === i) && (r.j === undefined || r.j === j));
}
