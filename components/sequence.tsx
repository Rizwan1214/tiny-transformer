"use client";

import { createContext, useContext } from "react";

/**
 * Seconds to wait before a block starts animating. MatrixRow hands each
 * matrix/operator a later start so an equation like E + PE = X builds
 * left to right; cells inside a matrix then stagger from that start.
 */
export const SequenceDelay = createContext(0);

export function useSequenceDelay() {
  return useContext(SequenceDelay);
}

/** Per-cell stagger (seconds) used by matrices and the heatmap. */
export const CELL_STAGGER = 0.012;
export const ROW_STAGGER = 0.06;
