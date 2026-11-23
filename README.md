# Tiny Transformer

An interactive, step-by-step visualizer of a tiny transformer (1 layer, 1 head, `d_model = 4`).
Type a sentence and walk through every stage, from tokenization to next-token prediction, with the real numbers on screen.

## The 10 steps

1. Tokenization
2. Token IDs
3. Embedding
4. Positional Encoding
5. Q, K, V
6. Attention Scores (with an optional causal mask)
7. Softmax (attention map, with a per-token focus view)
8. Weighted Sum (`Z = A·V`, with the per-token breakdown)
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
lib/transformer.ts   pure math: tokenize, embed, attention, softmax, layer norm, FFN
lib/steps.ts         title, formula and explanation for each step
lib/colors.ts        cell colors (diverging for values, sequential for probabilities)
components/          Visualizer (state), StepView, MatrixGrid, AttentionHeatmap, ...
```

## Tech

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4.
