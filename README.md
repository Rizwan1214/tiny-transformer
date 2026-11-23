# Tiny Transformer

An interactive, step-by-step visualizer of a tiny transformer (1 layer, 1 or 2 attention heads, `d_model = 4`).
Type a sentence and walk through every stage, from tokenization to next-token prediction, with the real numbers on screen.

- **Hover or tap any number** to see the exact arithmetic that produced it, with the cells that fed it outlined.
- **Switch between 1 and 2 heads** to compare attention maps side by side and see how the heads are concatenated and mixed by `W_O`.
- Every step animates in, so equations like `E + PE = X` build left to right.

## The 10 steps

1. Tokenization
2. Token IDs
3. Embedding
4. Positional Encoding
5. Q, K, V (split into heads)
6. Attention Scores, per head (with an optional causal mask)
7. Softmax, per head (attention maps, with a per-token focus view)
8. Weighted Sum (`Z_h = A_h·V_h`, then `O = Concat(Z_h)·W_O`)
9. Add & Norm + Feed-Forward
10. Next Token (probability bars)

Weights are random but seeded, so the same sentence always gives the same numbers.
The goal is to show *how* the computation flows, not to make good predictions.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Project structure

```
lib/transformer.ts   pure math: tokenize, embed, multi-head attention, softmax, layer norm, FFN
lib/explain.ts       the arithmetic behind any cell, for the Calculation panel
lib/steps.ts         title, formula and explanation for each step
lib/colors.ts        cell colors (diverging for values, sequential for probabilities)
components/          Visualizer (state), StepView, MatrixGrid, AttentionHeatmap, CalcPanel, ...
```

## Tech

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Motion.
