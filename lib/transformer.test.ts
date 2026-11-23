import { describe, expect, it } from "vitest";
import {
  HEAD_OPTIONS,
  MAX_TOKENS,
  WEIGHTS,
  add,
  layerNorm,
  matmul,
  positionalEncoding,
  runTransformer,
  softmax,
  tokenize,
  transpose,
} from "./transformer";

const SENTENCES = ["the cat sat on the mat", "i love cats", "x", "main ghar ja raha hoon"];

describe("building blocks", () => {
  it("matmul multiplies a 2×2 by hand", () => {
    expect(matmul([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([[19, 22], [43, 50]]);
  });

  it("transpose swaps rows and columns", () => {
    expect(transpose([[1, 2, 3]])).toEqual([[1], [2], [3]]);
  });

  it("softmax sums to 1 and gives masked entries 0", () => {
    const p = softmax([1, null, 3]);
    expect(p[1]).toBe(0);
    expect(p[0] + p[2]).toBeCloseTo(1, 12);
    expect(p[2]).toBeGreaterThan(p[0]);
  });

  it("layerNorm gives each row mean 0 and variance ~1", () => {
    for (const row of layerNorm([[1, 2, 3, 4], [-5, 0, 2, 9]])) {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
      expect(mean).toBeCloseTo(0, 10);
      expect(variance).toBeCloseTo(1, 4);
    }
  });

  it("positional encoding uses sin on even and cos on odd dimensions", () => {
    const pe = positionalEncoding(3);
    expect(pe[0]).toEqual([0, 1, 0, 1]);
    expect(pe[2][0]).toBeCloseTo(Math.sin(2), 12);
    expect(pe[2][1]).toBeCloseTo(Math.cos(2), 12);
    expect(pe[2][2]).toBeCloseTo(Math.sin(2 / 100), 12);
  });
});

describe("tokenize", () => {
  it("splits words and punctuation and lowercases", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", ",", "world", "!"]);
  });

  it(`keeps at most ${MAX_TOKENS} tokens and never returns an empty list`, () => {
    expect(tokenize("a b c d e f g h")).toHaveLength(MAX_TOKENS);
    expect(tokenize("")).toEqual(["hello"]);
  });
});

describe.each(HEAD_OPTIONS)("runTransformer with %i head(s)", (numHeads) => {
  for (const text of SENTENCES) {
    for (const mask of [true, false]) {
      it(`"${text}" mask=${mask}: shapes, softmax, mask and concat hold`, () => {
        const t = runTransformer(text, mask, numHeads);
        const n = t.tokens.length;

        expect(t.dHead * numHeads).toBe(4);
        expect(t.heads).toHaveLength(numHeads);
        expect(t.X).toEqual(add(t.E, t.PE));

        for (const hd of t.heads) {
          expect(hd.A).toHaveLength(n);
          hd.A.forEach((row, i) => {
            expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
            row.forEach((p, j) => {
              if (mask && j > i) {
                expect(p).toBe(0);
                expect(hd.S[i][j]).toBeNull();
              }
            });
          });
          expect(hd.Z).toEqual(matmul(hd.A, hd.V));
        }

        // Concat lays the heads side by side; W_O then mixes them.
        t.C.forEach((row, i) =>
          row.forEach((v, j) => expect(v).toBe(t.heads[Math.floor(j / t.dHead)].Z[i][j % t.dHead])),
        );
        expect(t.O).toEqual(matmul(t.C, WEIGHTS.Wo));
        expect(t.Y).toEqual(layerNorm(add(t.X, t.O)));
        expect(t.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      });
    }
  }

  it("is deterministic for the same sentence", () => {
    expect(runTransformer("i love cats", true, numHeads)).toEqual(runTransformer("i love cats", true, numHeads));
  });
});

it("the first token can only attend to itself under the causal mask", () => {
  const t = runTransformer("the cat sat", true, 1);
  expect(t.heads[0].A[0]).toEqual([1, 0, 0]);
});
