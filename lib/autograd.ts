// A tiny scalar autograd engine (in the spirit of micrograd).
// Every number in the forward pass is a Value that remembers how it was made,
// so backward() can walk the graph in reverse and fill in each gradient.

export class Value {
  data: number;
  grad = 0;
  /** The Values this one was computed from. */
  readonly prev: Value[];
  /** Pushes this Value's grad into its inputs' grads (chain rule). */
  backwardStep: () => void = () => {};

  constructor(data: number, prev: Value[] = []) {
    this.data = data;
    this.prev = prev;
  }

  add(other: Value | number): Value {
    const o = toValue(other);
    const out = new Value(this.data + o.data, [this, o]);
    out.backwardStep = () => {
      this.grad += out.grad;
      o.grad += out.grad;
    };
    return out;
  }

  mul(other: Value | number): Value {
    const o = toValue(other);
    const out = new Value(this.data * o.data, [this, o]);
    out.backwardStep = () => {
      this.grad += o.data * out.grad;
      o.grad += this.data * out.grad;
    };
    return out;
  }

  sub(other: Value | number): Value {
    const o = toValue(other);
    const out = new Value(this.data - o.data, [this, o]);
    out.backwardStep = () => {
      this.grad += out.grad;
      o.grad -= out.grad;
    };
    return out;
  }

  div(other: Value | number): Value {
    const o = toValue(other);
    const out = new Value(this.data / o.data, [this, o]);
    out.backwardStep = () => {
      this.grad += out.grad / o.data;
      o.grad -= (this.data * out.grad) / (o.data * o.data);
    };
    return out;
  }

  exp(): Value {
    const e = Math.exp(this.data);
    const out = new Value(e, [this]);
    out.backwardStep = () => {
      this.grad += e * out.grad;
    };
    return out;
  }

  log(): Value {
    const out = new Value(Math.log(this.data), [this]);
    out.backwardStep = () => {
      this.grad += out.grad / this.data;
    };
    return out;
  }

  relu(): Value {
    const out = new Value(this.data > 0 ? this.data : 0, [this]);
    out.backwardStep = () => {
      if (this.data > 0) this.grad += out.grad;
    };
    return out;
  }

  sqrt(): Value {
    const s = Math.sqrt(this.data);
    const out = new Value(s, [this]);
    out.backwardStep = () => {
      this.grad += out.grad / (2 * s);
    };
    return out;
  }

  /** Fills .grad on every Value that led to this one (this one gets grad 1). */
  backward(): void {
    const order: Value[] = [];
    const seen = new Set<Value>();
    // Iterative post-order DFS: graphs here are tens of thousands of nodes deep in places.
    const stack: [Value, boolean][] = [[this, false]];
    while (stack.length) {
      const [v, expanded] = stack.pop()!;
      if (expanded) {
        order.push(v);
        continue;
      }
      if (seen.has(v)) continue;
      seen.add(v);
      stack.push([v, true]);
      for (const p of v.prev) if (!seen.has(p)) stack.push([p, false]);
    }
    this.grad = 1;
    for (let k = order.length - 1; k >= 0; k--) order[k].backwardStep();
  }
}

export function toValue(x: Value | number): Value {
  return x instanceof Value ? x : new Value(x);
}

/** Sum of many Values as one node, so the graph stays shallow. */
export function sum(values: Value[]): Value {
  let total = 0;
  for (const v of values) total += v.data;
  const out = new Value(total, values);
  out.backwardStep = () => {
    for (const v of values) v.grad += out.grad;
  };
  return out;
}

/** Dot product of two equal-length vectors as one node. */
export function dot(a: Value[], b: Value[]): Value {
  let total = 0;
  for (let k = 0; k < a.length; k++) total += a[k].data * b[k].data;
  const out = new Value(total, [...a, ...b]);
  out.backwardStep = () => {
    for (let k = 0; k < a.length; k++) {
      a[k].grad += b[k].data * out.grad;
      b[k].grad += a[k].data * out.grad;
    }
  };
  return out;
}

/** Numerically stable softmax over a vector. */
export function softmax(xs: Value[]): Value[] {
  const max = Math.max(...xs.map((x) => x.data));
  const exps = xs.map((x) => x.sub(max).exp());
  const total = sum(exps);
  return exps.map((e) => e.div(total));
}

/** −log softmax(logits)[target]: cross-entropy for one position. */
export function crossEntropy(logits: Value[], target: number): Value {
  const max = Math.max(...logits.map((x) => x.data));
  const shifted = logits.map((x) => x.sub(max));
  const logSumExp = sum(shifted.map((x) => x.exp())).log();
  return logSumExp.sub(shifted[target]);
}

export type VMatrix = Value[][];

export const vmat = (M: number[][]): VMatrix => M.map((r) => r.map((v) => new Value(v)));
export const vcol = (M: VMatrix, j: number): Value[] => M.map((r) => r[j]);
export const vdata = (M: VMatrix): number[][] => M.map((r) => r.map((v) => v.data));

/** A (n×k) · B (k×m) using one dot node per output cell. */
export function vmatmul(A: VMatrix, B: VMatrix): VMatrix {
  const cols = B[0].map((_, j) => vcol(B, j));
  return A.map((row) => cols.map((c) => dot(row, c)));
}

export function vadd(A: VMatrix, B: VMatrix): VMatrix {
  return A.map((r, i) => r.map((v, j) => v.add(B[i][j])));
}

/** Adds a bias row to every row. */
export function vaddRow(A: VMatrix, b: Value[]): VMatrix {
  return A.map((r) => r.map((v, j) => v.add(b[j])));
}

/** LayerNorm without learnable gain/bias, per row. */
export function vlayerNorm(A: VMatrix): VMatrix {
  return A.map((r) => {
    const mean = sum(r).div(r.length);
    const centered = r.map((v) => v.sub(mean));
    const variance = sum(centered.map((c) => c.mul(c))).div(r.length);
    const std = variance.add(1e-5).sqrt();
    return centered.map((c) => c.div(std));
  });
}
