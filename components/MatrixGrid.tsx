import { MASKED_STYLE, maxAbs, probStyle, valueStyle } from "@/lib/colors";
import type { CellKey } from "@/lib/explain";
import { argmax, type MaskedMatrix } from "@/lib/transformer";
import { cellHandlers, highlightStyle, useHover } from "./hover";

interface MatrixGridProps {
  label: string;
  matrix: MaskedMatrix;
  rowLabels: string[];
  colLabels?: string[];
  /** "value" = diverging blue/orange, "prob" = attention weights (row max outlined). */
  variant?: "value" | "prob";
  /** Cells that are `null` here are drawn as masked (used for attention weights). */
  maskFrom?: MaskedMatrix;
  /** Makes cells explainable on hover/tap in the Calculation panel. */
  cellKey?: CellKey;
}

export function MatrixGrid({
  label,
  matrix,
  rowLabels,
  colLabels,
  variant = "value",
  maskFrom,
  cellKey,
}: MatrixGridProps) {
  const hover = useHover();
  const cols = colLabels ?? matrix[0].map((_, j) => `d${j}`);
  const max = maxAbs(matrix);

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="flex items-baseline gap-2 font-mono">
        <span className="text-sm font-bold text-ink">{label}</span>
        <span className="text-xs text-muted">
          {matrix.length} × {matrix[0].length}
        </span>
      </figcaption>
      <div className="flex flex-col gap-[3px]">
        <div className="flex gap-[3px] pl-[67px]">
          {cols.map((c, j) => (
            <span key={j} className="w-14 text-center font-mono text-[11px] text-muted">
              {c}
            </span>
          ))}
        </div>
        {matrix.map((row, i) => {
          const rowMax = variant === "prob" ? argmax(row.map((v) => v ?? -Infinity)) : -1;
          return (
            <div key={i} className="flex items-center gap-[3px]">
              <span className="w-[60px] truncate pr-1 text-right font-mono text-xs text-ink-soft">
                {rowLabels[i]}
              </span>
              {row.map((v, j) => {
                const masked = v === null || maskFrom?.[i][j] === null;
                const style = masked
                  ? MASKED_STYLE
                  : variant === "prob"
                    ? probStyle(v as number, j === rowMax)
                    : valueStyle(v as number, max);
                return (
                  <span
                    key={j}
                    className={`relative flex h-[34px] w-14 items-center justify-center rounded-md font-mono text-xs font-medium text-ink ${
                      cellKey ? "cursor-pointer" : ""
                    }`}
                    style={cellKey ? { ...style, ...highlightStyle(hover, cellKey, i, j) } : style}
                    {...(cellKey ? cellHandlers(hover, { key: cellKey, i, j }) : {})}
                  >
                    {v === null ? "−∞" : masked ? "0" : v.toFixed(2)}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export function Operator({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap font-mono text-lg font-medium text-muted">{children}</span>;
}

/** Lays matrices and operators out in a horizontally scrollable row. */
export function MatrixRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex w-max items-center gap-5">{children}</div>
    </div>
  );
}
