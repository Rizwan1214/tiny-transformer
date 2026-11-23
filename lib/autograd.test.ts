import { describe, expect, it } from "vitest";
import { Value, crossEntropy, dot, softmax, sum, vlayerNorm } from "./autograd";

/** Compares backprop's gradient with a finite-difference estimate for every input. */
function gradCheck(inputs: number[], f: (xs: Value[]) => Value) {
  const xs = inputs.map((v) => new Value(v));
  f(xs).backward();
  const h = 1e-6;
  inputs.forEach((_, k) => {
    const plus = inputs.map((v, i) => new Value(i === k ? v + h : v));
    const minus = inputs.map((v, i) => new Value(i === k ? v - h : v));
    const numeric = (f(plus).data - f(minus).data) / (2 * h);
    expect(xs[k].grad).toBeCloseTo(numeric, 5);
  });
}

describe("Value", () => {
  it("add, mul, sub, div", () => gradCheck([1.5, -2, 0.7], ([a, b, c]) => a.mul(b).add(c).sub(a.div(b))));
  it("exp, log, sqrt", () => gradCheck([0.3, 2.2], ([a, b]) => a.exp().mul(b.log()).add(b.sqrt())));
  it("relu passes gradient only for positive inputs", () => {
    const [a, b] = [new Value(2), new Value(-1)];
    a.relu().add(b.relu()).backward();
    expect(a.grad).toBe(1);
    expect(b.grad).toBe(0);
  });
  it("reuses a value correctly (gradients accumulate)", () => gradCheck([1.2], ([a]) => a.mul(a).mul(a)));
});

describe("vector helpers", () => {
  it("sum and dot", () => gradCheck([1, 2, 3, 4], ([a, b, c, d]) => sum([a, b]).mul(dot([a, c], [b, d]))));
  it("softmax sums to 1 and has correct gradients", () => {
    const p = softmax([1, 2, 0.5].map((v) => new Value(v)));
    expect(p.reduce((s, v) => s + v.data, 0)).toBeCloseTo(1, 12);
    gradCheck([1, 2, 0.5], (xs) => softmax(xs)[1].mul(3));
  });
  it("cross-entropy equals −log of the softmax probability", () => {
    const logits = [0.2, 1.4, -0.3].map((v) => new Value(v));
    const p = softmax(logits)[1].data;
    expect(crossEntropy(logits, 1).data).toBeCloseTo(-Math.log(p), 12);
    gradCheck([0.2, 1.4, -0.3], (xs) => crossEntropy(xs, 2));
  });
  it("layer norm", () => gradCheck([0.5, -1, 2, 0.1], (xs) => vlayerNorm([xs])[0][2].mul(vlayerNorm([xs])[0][0])));
});
