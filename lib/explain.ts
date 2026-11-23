// Turns "which cell is the viewer pointing at?" into the exact arithmetic
// that produced it, using the numbers already stored in the trace.

import { tr, type Lang } from "./i18n";
import { D_MODEL, LOGIT_SCALE, WEIGHTS, embed, type Matrix, type TransformerTrace } from "./transformer";

// Per-head cells carry `head` (0-based); titles show it as a subscript (S₁, S₂).

export type CellKey =
  | "E" | "PE" | "X" | "Q" | "K" | "V" | "S" | "A" | "Z" | "C" | "O" | "Y" | "F" | "H" | "P";

export interface CellRef {
  key: CellKey;
  i: number; // row (token index; vocab index for "P")
  j: number; // column (dimension or key-token index)
  /**
   * Attention head, for per-head cells: S, A and Z always; V when it is the
   * head's own d_head-wide slice rather than the full matrix.
   */
  head?: number;
}

/** A cell, a whole row (`j` omitted) or a whole column (`i` omitted) that fed the active cell. */
export interface RelatedRef {
  key: CellKey;
  i?: number;
  j?: number;
  head?: number;
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

export function explainCell(t: TransformerTrace, ref: CellRef, lang: Lang = "ur"): Explanation {
  const { i, j } = ref;
  const L = (key: Parameters<typeof tr>[1], vars?: Record<string, string | number>) => tr(lang, key, vars);
  const tok = (k: number) => `${k + 1}.${t.tokens[k]}`;
  const h = ref.head ?? 0;
  const hd = t.heads[h];
  const multi = t.numHeads > 1;
  /** "S" for one head, "S₁"/"S₂" for several, so titles say which head. */
  const sub = (name: string) => (multi ? `${name}${"₁₂₃₄"[h]}` : name);
  const rootD = Math.sqrt(t.dHead);
  const rootDText = Number.isInteger(rootD) ? String(rootD) : rootD.toFixed(3);

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
      // A head's V slice: column j of V_h is column (h·d_head + j) of the full V.
      const fullJ = ref.head === undefined ? j : h * t.dHead + j;
      const headOf = Math.floor(fullJ / t.dHead) + 1;
      return {
        title:
          ref.head === undefined
            ? `${ref.key}[${tok(i)}, d${j}]`
            : `${sub(ref.key)}[${tok(i)}, ${j}]  (= ${ref.key}[${tok(i)}, d${fullJ}])`,
        lines: [
          `X[${tok(i)}] · W_${ref.key}[:, ${fullJ}]`,
          `= ${dotTerms(t.X[i], col(W, fullJ))}`,
          ...(multi ? [L("columnOfHead", { c: fullJ, h: headOf })] : []),
        ],
        result: f(t[ref.key][i][fullJ]),
      };
    }

    case "S": {
      const s = hd.S[i][j];
      if (s === null) {
        return {
          title: `${sub("S")}[${tok(i)} → ${tok(j)}]`,
          lines: [L("keyAfterQuery", { k: j + 1, q: i + 1 }), L("maskedFuture")],
          result: "−∞",
        };
      }
      const raw = dot(hd.Q[i], hd.K[j]);
      return {
        title: `${sub("S")}[${tok(i)} → ${tok(j)}]`,
        lines: [
          `${sub("Q")}[${tok(i)}] · ${sub("K")}[${tok(j)}] / √${t.dHead}`,
          `= (${dotTerms(hd.Q[i], hd.K[j])}) / ${rootDText}`,
          `= ${f(raw)} / ${rootDText}`,
        ],
        result: f(s),
      };
    }

    case "A": {
      if (hd.S[i][j] === null) {
        return {
          title: `${sub("A")}[${tok(i)} → ${tok(j)}]`,
          lines: [L("expZero")],
          result: "0.00",
        };
      }
      const row = hd.S[i];
      const finite = row.filter((v): v is number => v !== null);
      const max = Math.max(...finite);
      const exps = row.map((v) => (v === null ? 0 : Math.exp(v - max)));
      const sum = exps.reduce((a, b) => a + b, 0);
      return {
        title: `${sub("A")}[${tok(i)} → ${tok(j)}]`,
        lines: [
          `e^S[${tok(i)}, ${tok(j)}] / Σ e^S[${tok(i)}, k]`,
          L("stableSoftmax", { m: f(max) }),
          `= ${exps[j].toFixed(3)} / (${exps.filter((_, k) => row[k] !== null).map((e) => e.toFixed(3)).join(" + ")})`,
          `= ${exps[j].toFixed(3)} / ${sum.toFixed(3)}`,
        ],
        result: f(hd.A[i][j]),
      };
    }

    case "Z":
      return {
        title: `${sub("Z")}[${tok(i)}, ${j}]`,
        lines: [
          `Σ_k ${sub("A")}[${tok(i)}, k] × ${sub("V")}[k, ${j}]`,
          `= ${dotTerms(hd.A[i], col(hd.V, j))}`,
        ],
        result: f(hd.Z[i][j]),
      };

    case "C": {
      const fromHead = Math.floor(j / t.dHead);
      const inHead = j % t.dHead;
      return {
        title: `Concat[${tok(i)}, d${j}]`,
        lines: multi
          ? [
              `Concat = [${t.heads.map((_, k) => `Z${"₁₂₃₄"[k]}`).join(" | ")}]`,
              L("concatColumn", { j, h: fromHead + 1, c: inHead }),
              `= Z${"₁₂₃₄"[fromHead]}[${tok(i)}, ${inHead}]`,
            ]
          : [L("concatSingle"), `= Z[${tok(i)}, ${j}]`],
        result: f(t.C[i][j]),
      };
    }

    case "O":
      return {
        title: `O[${tok(i)}, d${j}]`,
        lines: [
          `Concat[${tok(i)}] · W_O[:, ${j}]`,
          `= ${dotTerms(t.C[i], col(WEIGHTS.Wo, j))}`,
          ...(multi ? [L("woMix")] : []),
        ],
        result: f(t.O[i][j]),
      };

    case "Y":
      return {
        title: `Y[${tok(i)}, d${j}]`,
        lines: [`LayerNorm(X + O)`, ...layerNormLines(`X + O`, t.R1[i], j)],
        result: f(t.Y[i][j]),
      };

    case "F":
      return {
        title: `FFN(Y)[${tok(i)}, d${j}]`,
        lines: [
          L("ffnHidden", { tok: tok(i) }),
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
export function relatedCells(ref: CellRef | null, dHead: number): RelatedRef[] {
  if (!ref) return [];
  const { i, j, head } = ref;
  switch (ref.key) {
    case "X":
      return [{ key: "E", i, j }, { key: "PE", i, j }];
    case "Z":
      return [{ key: "A", i, head }, { key: "V", j, head }];
    case "C":
      return [{ key: "Z", i, j: j % dHead, head: Math.floor(j / dHead) }];
    case "O":
      return [{ key: "C", i }];
    case "F":
      return [{ key: "Y", i }];
    case "H":
      return [{ key: "Y", i, j }, { key: "F", i, j }];
    default:
      return [];
  }
}

export function isRelated(related: RelatedRef[], key: CellKey, i: number, j: number, head?: number): boolean {
  return related.some(
    (r) =>
      r.key === key &&
      r.head === head &&
      (r.i === undefined || r.i === i) &&
      (r.j === undefined || r.j === j),
  );
}
