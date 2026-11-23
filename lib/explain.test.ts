import { describe, expect, it } from "vitest";
import { explainCell, isRelated, relatedCells, type CellKey, type CellRef } from "./explain";
import { HEAD_OPTIONS, runTransformer } from "./transformer";

/** Every cell the UI can ask about, for a given trace. */
function allRefs(t: ReturnType<typeof runTransformer>): CellRef[] {
  const n = t.tokens.length;
  const refs: CellRef[] = [];
  const grid = (key: CellKey, rows: number, cols: number, head?: number) => {
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) refs.push({ key, i, j, head });
  };
  for (const key of ["E", "PE", "X", "Q", "K", "V", "C", "O", "Y", "F", "H"] as CellKey[]) grid(key, n, 4);
  t.heads.forEach((_, h) => {
    grid("S", n, n, h);
    grid("A", n, n, h);
    grid("Z", n, t.dHead, h);
    grid("V", n, t.dHead, h);
  });
  grid("P", t.vocab.length, 1);
  return refs;
}

describe.each(HEAD_OPTIONS)("explainCell with %i head(s)", (numHeads) => {
  const t = runTransformer("the cat sat on the mat", true, numHeads);

  it("explains every cell without NaN or undefined", () => {
    for (const ref of allRefs(t)) {
      const e = explainCell(t, ref);
      const text = [e.title, ...e.lines, e.result].join(" ");
      expect(text, JSON.stringify(ref)).not.toMatch(/NaN|undefined/);
    }
  });

  it("reports the same value the trace holds", () => {
    expect(explainCell(t, { key: "X", i: 1, j: 2 }).result).toBe(t.X[1][2].toFixed(2));
    expect(explainCell(t, { key: "O", i: 2, j: 0 }).result).toBe(t.O[2][0].toFixed(2));
    const h = numHeads - 1;
    expect(explainCell(t, { key: "A", i: 3, j: 1, head: h }).result).toBe(t.heads[h].A[3][1].toFixed(2));
  });

  it("says masked scores are −∞", () => {
    expect(explainCell(t, { key: "S", i: 0, j: 2, head: 0 }).result).toBe("−∞");
  });
});

describe("relatedCells", () => {
  it("links a Concat column back to the right head's Z column", () => {
    const related = relatedCells({ key: "C", i: 1, j: 3 }, 2);
    expect(isRelated(related, "Z", 1, 1, 1)).toBe(true);
    expect(isRelated(related, "Z", 1, 1, 0)).toBe(false);
  });

  it("links Z to its head's A row and V column", () => {
    const related = relatedCells({ key: "Z", i: 2, j: 0, head: 1 }, 2);
    expect(isRelated(related, "A", 2, 0, 1)).toBe(true);
    expect(isRelated(related, "A", 2, 5, 1)).toBe(true); // any column of the row
    expect(isRelated(related, "V", 4, 0, 1)).toBe(true); // any row of the column
    expect(isRelated(related, "A", 2, 0, 0)).toBe(false); // other head
  });
});
