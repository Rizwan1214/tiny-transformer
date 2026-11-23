import { describe, expect, it } from "vitest";
import { CORPORA, DEFAULT_CONFIG, Trainer, probePrompts } from "./trainer";

const urdu = CORPORA.find((c) => c.id === "urdu")!;

describe("Trainer", () => {
  it("starts near chance loss and drops well below it", () => {
    const t = new Trainer(urdu);
    const first = t.trainStep();
    expect(first).toBeGreaterThan(t.chanceLoss * 0.8);
    for (let s = 0; s < 200; s++) t.trainStep();
    expect(t.losses.at(-1)!).toBeLessThan(first * 0.25);
  });

  it("learns subject–verb agreement (main → hoon, tum → ho, wo → hai)", () => {
    const t = new Trainer(urdu);
    for (let s = 0; s < 300; s++) t.trainStep();
    expect(t.probe("main school ja raha")!.next[0].word).toBe("hoon");
    expect(t.probe("tum ghar ja rahe")!.next[0].word).toBe("ho");
    expect(t.probe("wo ghar ja raha")!.next[0].word).toBe("hai");
  });

  it("is deterministic for the same seed", () => {
    const a = new Trainer(urdu);
    const b = new Trainer(urdu);
    for (let s = 0; s < 5; s++) expect(a.trainStep()).toBe(b.trainStep());
  });

  it("does not change the shared default config when the learning rate changes", () => {
    const t = new Trainer(urdu);
    t.setLearningRate(0.03);
    expect(DEFAULT_CONFIG.learningRate).toBe(0.01);
  });

  it("returns attention rows that sum to 1 for each head", () => {
    const r = new Trainer(urdu).probe("main ghar ja raha")!;
    expect(r.attention).toHaveLength(DEFAULT_CONFIG.numHeads);
    for (const A of r.attention) for (const row of A) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it("offers each sentence minus its last word as a probe prompt", () => {
    expect(probePrompts(urdu)).toContain("main ghar ja raha");
    expect(probePrompts(urdu)).toHaveLength(urdu.sentences.length);
  });
});
