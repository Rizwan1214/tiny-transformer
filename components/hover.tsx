"use client";

import { createContext, useContext, type CSSProperties } from "react";
import { isRelated, type CellKey, type CellRef, type RelatedRef } from "@/lib/explain";

interface HoverApi {
  active: CellRef | null;
  related: RelatedRef[];
  select: (ref: CellRef) => void;
}

export const HoverContext = createContext<HoverApi>({ active: null, related: [], select: () => {} });

export function useHover() {
  return useContext(HoverContext);
}

/** Outline for the cell being explained (solid) and the cells that fed it (dashed). */
export function highlightStyle(h: HoverApi, key: CellKey, i: number, j: number, head?: number): CSSProperties {
  const a = h.active;
  if (a && a.key === key && a.i === i && a.j === j && a.head === head) {
    return { outline: "2px solid #14161C", outlineOffset: 1, zIndex: 1 };
  }
  if (isRelated(h.related, key, i, j, head)) {
    return { outline: "2px dashed #3B4BD8", outlineOffset: 1 };
  }
  return {};
}

/** Pointer handlers: hover on desktop, tap on touch screens. */
export function cellHandlers(h: HoverApi, ref: CellRef) {
  return {
    onMouseEnter: () => h.select(ref),
    onClick: () => h.select(ref),
  };
}
