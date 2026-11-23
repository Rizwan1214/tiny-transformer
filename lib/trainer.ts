// Trains a tiny transformer in the browser with the scalar autograd engine.
// Same building blocks as the toy model (embeddings + sinusoidal positions,
// multi-head causal attention, W_O, residual + LayerNorm, FFN), but every
// weight is learnable and the output layer predicts the next word.

import {
  Value,
  crossEntropy,
  softmax,
  vadd,
  vaddRow,
  vdata,
  vlayerNorm,
  vmat,
  vmatmul,
  dot,
  type VMatrix,
} from "./autograd";
import { positionalEncoding, randomMatrix } from "./transformer";

export interface Corpus {
  id: string;
  sentences: string[];
  /** A prompt (prefix of a training sentence) to watch while training. */
  probe: string;
}

export const CORPORA: Corpus[] = [
  {
    id: "urdu",
    sentences: [
      "main ghar ja raha hoon .",
      "tum ghar ja rahe ho .",
      "wo ghar ja raha hai .",
      "main school ja raha hoon .",
      "tum school ja rahe ho .",
      "wo school ja raha hai .",
    ],
    probe: "main school ja raha",
  },
  {
    id: "animals",
    sentences: [
      "the cat sat on the mat .",
      "the dog sat on the rug .",
      "a cat ran to the mat .",
      "a dog ran to the rug .",
    ],
    probe: "the dog sat on the",
  },
];

export interface TrainerConfig {
  dModel: number;
  numHeads: number;
  dFF: number;
  learningRate: number;
  seed: number;
}

/** Learning rates offered in the UI; the middle one trains in a few seconds without overshooting. */
export const LEARNING_RATES = [0.003, 0.01, 0.03] as const;

export const DEFAULT_CONFIG: TrainerConfig = { dModel: 8, numHeads: 2, dFF: 16, learningRate: 0.01, seed: 7 };

/** Prompts worth probing: each sentence minus its last word and the full stop. */
export function probePrompts(corpus: Corpus): string[] {
  return [...new Set(corpus.sentences.map((s) => tokenizeWords(s).slice(0, -2).join(" ")))];
}

interface Params {
  E: VMatrix; // vocab × d
  Wq: VMatrix;
  Wk: VMatrix;
  Wv: VMatrix;
  Wo: VMatrix;
  W1: VMatrix;
  b1: Value[];
  W2: VMatrix;
  b2: Value[];
  Wu: VMatrix; // d × vocab, the output ("unembedding") layer
  bu: Value[];
}

export interface Prediction {
  word: string;
  p: number;
}

export interface ProbeResult {
  tokens: string[];
  /** Next-word probabilities after the prompt, best first. */
  next: Prediction[];
  /** Attention weights for the prompt, one n × n matrix per head. */
  attention: number[][][];
}

const scaled = (M: number[][], s: number) => M.map((r) => r.map((v) => v * s));

export function tokenizeWords(text: string): string[] {
  return text.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

export class Trainer {
  readonly vocab: string[];
  readonly config: TrainerConfig;
  readonly corpus: Corpus;
  private readonly index: Map<string, number>;
  private readonly sequences: number[][];
  private readonly params: Params;
  private readonly flat: Value[];
  private readonly m: Float64Array;
  private readonly v: Float64Array;
  step = 0;
  /** Loss after each training step. */
  readonly losses: number[] = [];

  constructor(corpus: Corpus, config: TrainerConfig = DEFAULT_CONFIG) {
    this.corpus = corpus;
    this.config = { ...config }; // own copy, so changing the learning rate never touches the defaults
    this.vocab = [...new Set(corpus.sentences.flatMap(tokenizeWords))];
    this.index = new Map(this.vocab.map((w, i) => [w, i]));
    this.sequences = corpus.sentences.map((s) => tokenizeWords(s).map((w) => this.index.get(w)!));

    const { dModel: d, dFF, seed } = config;
    const V = this.vocab.length;
    const init = (k: number, rows: number, cols: number) => vmat(scaled(randomMatrix(seed * 100 + k, rows, cols), 1 / Math.sqrt(rows)));
    this.params = {
      E: vmat(scaled(randomMatrix(seed * 100 + 1, V, d), 0.5)),
      Wq: init(2, d, d),
      Wk: init(3, d, d),
      Wv: init(4, d, d),
      Wo: init(5, d, d),
      W1: init(6, d, dFF),
      b1: Array.from({ length: dFF }, () => new Value(0)),
      W2: init(7, dFF, d),
      b2: Array.from({ length: d }, () => new Value(0)),
      Wu: init(8, d, V),
      bu: Array.from({ length: V }, () => new Value(0)),
    };
    const p = this.params;
    this.flat = [p.E, p.Wq, p.Wk, p.Wv, p.Wo, p.W1, [p.b1], p.W2, [p.b2], p.Wu, [p.bu]].flatMap((M) => M.flat());
    this.m = new Float64Array(this.flat.length);
    this.v = new Float64Array(this.flat.length);
  }

  setLearningRate(lr: number): void {
    this.config.learningRate = lr;
  }

  get parameterCount(): number {
    return this.flat.length;
  }

  /** Runs the model on token ids; returns per-position logits and per-head attention. */
  private forward(ids: number[]): { logits: Value[][]; attention: number[][][] } {
    const { dModel: d, numHeads } = this.config;
    const p = this.params;
    const n = ids.length;
    const dHead = d / numHeads;
    const pe = positionalEncoding(n, d);

    const X: VMatrix = ids.map((id, pos) => p.E[id].map((e, j) => e.add(pe[pos][j])));
    const Q = vmatmul(X, p.Wq);
    const K = vmatmul(X, p.Wk);
    const V = vmatmul(X, p.Wv);
    const scale = 1 / Math.sqrt(dHead);

    const attention: number[][][] = [];
    const headOutputs: VMatrix[] = [];
    for (let h = 0; h < numHeads; h++) {
      const cols = (M: VMatrix, i: number) => M[i].slice(h * dHead, (h + 1) * dHead);
      const A: number[][] = [];
      const Zh: VMatrix = [];
      for (let i = 0; i < n; i++) {
        // Causal: position i only scores keys 0..i.
        const scores = Array.from({ length: i + 1 }, (_, j) => dot(cols(Q, i), cols(K, j)).mul(scale));
        const w = softmax(scores);
        A.push([...w.map((x) => x.data), ...Array(n - i - 1).fill(0)]);
        Zh.push(
          Array.from({ length: dHead }, (_, c) => {
            const values = w.map((_, j) => V[j][h * dHead + c]);
            return dot(w, values);
          }),
        );
      }
      attention.push(A);
      headOutputs.push(Zh);
    }

    const C: VMatrix = ids.map((_, i) => headOutputs.flatMap((Zh) => Zh[i]));
    const Y = vlayerNorm(vadd(X, vmatmul(C, p.Wo)));
    const hidden = vaddRow(vmatmul(Y, p.W1), p.b1).map((r) => r.map((v) => v.relu()));
    const F = vaddRow(vmatmul(hidden, p.W2), p.b2);
    const H = vlayerNorm(vadd(Y, F));
    const logits = vaddRow(vmatmul(H, p.Wu), p.bu);
    return { logits, attention };
  }

  /** Mean next-word cross-entropy over the whole corpus (one full-batch step). */
  private corpusLoss(): Value {
    const terms: Value[] = [];
    for (const seq of this.sequences) {
      const { logits } = this.forward(seq);
      for (let i = 0; i < seq.length - 1; i++) terms.push(crossEntropy(logits[i], seq[i + 1]));
    }
    let total = terms[0];
    for (let k = 1; k < terms.length; k++) total = total.add(terms[k]);
    return total.div(terms.length);
  }

  /** One step: forward → loss → backward → Adam update. Returns the loss. */
  trainStep(): number {
    for (const w of this.flat) w.grad = 0;
    const loss = this.corpusLoss();
    loss.backward();

    const { learningRate: lr } = this.config;
    const [b1, b2, eps] = [0.9, 0.99, 1e-8];
    this.step += 1;
    const c1 = 1 - b1 ** this.step;
    const c2 = 1 - b2 ** this.step;
    this.flat.forEach((w, k) => {
      this.m[k] = b1 * this.m[k] + (1 - b1) * w.grad;
      this.v[k] = b2 * this.v[k] + (1 - b2) * w.grad * w.grad;
      w.data -= (lr * (this.m[k] / c1)) / (Math.sqrt(this.v[k] / c2) + eps);
    });

    this.losses.push(loss.data);
    return loss.data;
  }

  /** Words of `text` the model knows (unknown words are skipped). */
  knownTokens(text: string): string[] {
    return tokenizeWords(text).filter((w) => this.index.has(w));
  }

  /** What the model currently predicts after `prompt`, plus its attention maps. */
  probe(prompt: string): ProbeResult | null {
    const tokens = this.knownTokens(prompt);
    if (!tokens.length) return null;
    const { logits, attention } = this.forward(tokens.map((w) => this.index.get(w)!));
    const last = softmax(logits[tokens.length - 1]).map((x) => x.data);
    const next = this.vocab.map((word, i) => ({ word, p: last[i] })).sort((a, b) => b.p - a.p);
    return { tokens, next, attention };
  }

  /** The loss a model that knows nothing would have: guessing uniformly over the vocabulary. */
  get chanceLoss(): number {
    return Math.log(this.vocab.length);
  }

  /** Embedding matrix values, for display. */
  embeddings(): number[][] {
    return vdata(this.params.E);
  }
}
