// A tiny, fully transparent transformer (1 layer, 1 head, d_model = 4).
// Every function is pure and returns its intermediate results so the UI
// can show each step. Weights are random but seeded, so the same sentence
// always produces the same numbers.

export type Matrix = number[][];
/** Attention scores; `null` means the cell is hidden by the causal mask (−∞). */
export type MaskedMatrix = (number | null)[][];

export const D_MODEL = 4;
export const D_FF = 8;
export const MAX_TOKENS = 6;
export const VOCAB_SIZE = 50_000;
export const CANDIDATE_VOCAB = ["the", "cat", "sat", "on", "mat", "dog", "ran", "."];

// ---------- deterministic randomness ----------

/** FNV-1a string hash → unsigned 32-bit int. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG: returns numbers in [0, 1). */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** rows × cols matrix with values in [-1, 1). */
export function randomMatrix(seed: number, rows: number, cols: number): Matrix {
  const next = rng(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => next() * 2 - 1));
}

// ---------- linear algebra ----------

export function matmul(A: Matrix, B: Matrix): Matrix {
  return A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
}

export function transpose(A: Matrix): Matrix {
  return A[0].map((_, j) => A.map((r) => r[j]));
}

export function add(A: Matrix, B: Matrix): Matrix {
  return A.map((r, i) => r.map((v, j) => v + B[i][j]));
}

export function layerNorm(A: Matrix): Matrix {
  return A.map((r) => {
    const mean = r.reduce((s, v) => s + v, 0) / r.length;
    const variance = r.reduce((s, v) => s + (v - mean) ** 2, 0) / r.length;
    return r.map((v) => (v - mean) / Math.sqrt(variance + 1e-5));
  });
}

export function relu(A: Matrix): Matrix {
  return A.map((r) => r.map((v) => Math.max(0, v)));
}

/** Softmax over one row; `null` entries (masked) get probability 0. */
export function softmax(row: (number | null)[]): number[] {
  const finite = row.filter((v): v is number => v !== null);
  const max = Math.max(...finite);
  const exps = row.map((v) => (v === null ? 0 : Math.exp(v - max)));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

export function argmax(row: number[]): number {
  return row.reduce((best, v, i) => (v > row[best] ? i : best), 0);
}

// ---------- the pipeline ----------

/** Step 1: lowercase word + punctuation split (real models use BPE). */
export function tokenize(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z0-9']+|[.,!?]/g) ?? [];
  return tokens.length ? tokens.slice(0, MAX_TOKENS) : ["hello"];
}

/** Step 2: a fake vocabulary index derived from the token's hash. */
export function tokenId(token: string): number {
  return hash(token) % VOCAB_SIZE;
}

/** Step 3: the embedding table row for a token. */
export function embed(token: string): number[] {
  return randomMatrix(hash(token), 1, D_MODEL)[0];
}

/** Step 4: sinusoidal positional encoding (from "Attention Is All You Need"). */
export function positionalEncoding(n: number, d = D_MODEL): Matrix {
  return Array.from({ length: n }, (_, pos) =>
    Array.from({ length: d }, (_, i) => {
      const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / d);
      return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    }),
  );
}

export const LOGIT_SCALE = 1.5;

export const WEIGHTS = {
  Wq: randomMatrix(11, D_MODEL, D_MODEL),
  Wk: randomMatrix(22, D_MODEL, D_MODEL),
  Wv: randomMatrix(33, D_MODEL, D_MODEL),
  Wo: randomMatrix(66, D_MODEL, D_MODEL),
  W1: randomMatrix(44, D_MODEL, D_FF),
  W2: randomMatrix(55, D_FF, D_MODEL),
};

/** Head counts that divide d_model evenly. */
export const HEAD_OPTIONS = [1, 2] as const;
export type HeadCount = (typeof HEAD_OPTIONS)[number];

/** One attention head works on its own slice of Q, K and V columns. */
export interface HeadTrace {
  Q: Matrix; // n × d_head
  K: Matrix;
  V: Matrix;
  S: MaskedMatrix; // scaled scores Q_h·K_hᵀ/√d_head
  A: Matrix; // attention weights
  Z: Matrix; // A_h·V_h, n × d_head
}

export interface TransformerTrace {
  tokens: string[];
  ids: number[];
  numHeads: HeadCount;
  dHead: number;
  E: Matrix; // embeddings
  PE: Matrix; // positional encoding
  X: Matrix; // E + PE
  Q: Matrix; // full n × d_model projections, before splitting into heads
  K: Matrix;
  V: Matrix;
  heads: HeadTrace[];
  C: Matrix; // Concat(Z_1 … Z_h), n × d_model
  O: Matrix; // C·W_O, the attention block's output
  R1: Matrix; // X + O (residual, before LayerNorm)
  Y: Matrix; // LN(X + O)
  hidden: Matrix; // ReLU(Y·W1), the FFN's 8-wide hidden layer
  F: Matrix; // FFN(Y)
  R2: Matrix; // Y + F (residual, before LayerNorm)
  H: Matrix; // LN(Y + F)
  vocab: string[];
  logits: number[];
  probs: number[]; // next-token probabilities over `vocab`
}

/** Columns [start, start + width) of M. */
export function sliceCols(M: Matrix, start: number, width: number): Matrix {
  return M.map((r) => r.slice(start, start + width));
}

export function runTransformer(text: string, causalMask = true, numHeads: HeadCount = 1): TransformerTrace {
  const tokens = tokenize(text);
  const n = tokens.length;
  const ids = tokens.map(tokenId);

  const E = tokens.map(embed);
  const PE = positionalEncoding(n);
  const X = add(E, PE);

  const Q = matmul(X, WEIGHTS.Wq);
  const K = matmul(X, WEIGHTS.Wk);
  const V = matmul(X, WEIGHTS.Wv);

  // Each head attends using its own d_head-wide slice of Q, K and V.
  const dHead = D_MODEL / numHeads;
  const scale = Math.sqrt(dHead);
  const heads: HeadTrace[] = Array.from({ length: numHeads }, (_, h) => {
    const Qh = sliceCols(Q, h * dHead, dHead);
    const Kh = sliceCols(K, h * dHead, dHead);
    const Vh = sliceCols(V, h * dHead, dHead);
    const S: MaskedMatrix = matmul(Qh, transpose(Kh)).map((row, i) =>
      row.map((v, j) => (causalMask && j > i ? null : v / scale)),
    );
    const A = S.map(softmax);
    return { Q: Qh, K: Kh, V: Vh, S, A, Z: matmul(A, Vh) };
  });

  // Concatenate the heads' outputs side by side, then mix them with W_O.
  const C = tokens.map((_, i) => heads.flatMap((hd) => hd.Z[i]));
  const O = matmul(C, WEIGHTS.Wo);

  const R1 = add(X, O);
  const Y = layerNorm(R1);
  const hidden = relu(matmul(Y, WEIGHTS.W1));
  const F = matmul(hidden, WEIGHTS.W2);
  const R2 = add(Y, F);
  const H = layerNorm(R2);

  // Weight tying: compare the last hidden state with each word's embedding.
  const last = H[n - 1];
  const vocab = CANDIDATE_VOCAB;
  const logits = vocab.map((w) => LOGIT_SCALE * embed(w).reduce((s, v, k) => s + v * last[k], 0));
  const probs = softmax(logits);

  return {
    tokens, ids, numHeads, dHead, E, PE, X, Q, K, V, heads, C, O,
    R1, Y, hidden, F, R2, H, vocab, logits, probs,
  };
}
