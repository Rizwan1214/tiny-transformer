"use client";

import { createContext, useContext } from "react";
import { tr, type Lang, type StringKey } from "@/lib/i18n";

export const LangContext = createContext<Lang>("ur");

/** Current language plus a bound translate function. */
export function useLang() {
  const lang = useContext(LangContext);
  return {
    lang,
    t: (key: StringKey, vars?: Record<string, string | number>) => tr(lang, key, vars),
  };
}
