/**
 * UI copy, in two languages.
 *
 * The English string is the key. A `zh` entry is `{"Close": "关闭"}` rather than
 * `{"common.close": "关闭"}` because the source has 638 distinct strings and no
 * second consumer: a semantic key would be 638 names to invent, and a missing
 * entry would render `settings.api.title` at the user. Keyed by the English
 * text, a missing entry falls back to English, which is already the truth.
 *
 * The cost of that choice is real: changing an English string silently orphans
 * its translation. `catalogue.test.ts` walks the source for `t("…")` calls and
 * fails when a zh entry matches no call, so the orphan surfaces as a failing
 * test instead of as English leaking through.
 */
import { useCallback, useSyncExternalStore } from "react";

import { LANGUAGE_KEY } from "@/lib/sessionState";

export type Language = "en" | "zh";

/** Language names written in themselves, so the picker reads in either. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  zh: "中文",
};

/**
 * Chinese copy. Only strings that differ belong here.
 *
 * Conventions this table follows:
 *   - Trading terms in the form a Chinese exchange user reads, not a literal
 *     gloss: Take Profit → 止盈, Stop Loss → 止损, Leverage → 杠杆, Pair → 交易对.
 *   - Proper names stay as-is (Gateway, Hummingbot, DEX, PnL, Telegram).
 *   - Labels carry no trailing period; full sentences keep their punctuation.
 *   - `{name}` placeholders are copied verbatim into the translation.
 */
export const ZH: Record<string, string> = {};

function readStored(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // Storage can be denied (private mode, quota): fall through to the browser.
  }
  // No stored choice: follow the browser. Chinese-script locales win, which
  // also covers zh-TW and zh-HK — they read the same copy here.
  return typeof navigator !== "undefined" && /^zh\b/i.test(navigator.language ?? "")
    ? "zh"
    : "en";
}

// Module state, not React state, so a formatter in `lib/` can translate without
// a hook. Components subscribe through `useT`.
let currentLanguage: Language = readStored();
const listeners = new Set<() => void>();

export function setLanguage(language: Language) {
  currentLanguage = language;
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The session keeps working in the picked language; only persistence is lost.
  }
  applyDocumentLanguage(language);
  listeners.forEach((l) => l());
}

/** Translate one string without subscribing — for plain functions and events. */
export function t(english: string, vars?: Record<string, string | number>): string {
  return translate(currentLanguage, english, vars);
}

/**
 * The same lookup for a caller holding an explicit language. Exported for the
 * catalogue test; the app reaches it through `t` or `useT`.
 */
export function translate(
  language: Language,
  english: string,
  vars?: Record<string, string | number>
): string {
  const template = language === "zh" ? (ZH[english] ?? english) : english;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole
  );
}

export function useLanguage() {
  const language = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentLanguage
  );
  return { language, setLanguage };
}

/** `t` bound to the current language, so a switch re-renders the caller. */
export function useT() {
  const { language } = useLanguage();
  return useCallback(
    (english: string, vars?: Record<string, string | number>) => translate(language, english, vars),
    [language]
  );
}

/**
 * The document language drives line breaking, font fallback and hyphenation.
 *
 * Guarded because this module is also imported by tests running in vitest's
 * default `node` environment, where there is no `document`; translating a string
 * must not require a DOM. Also called once at import time so the first paint is
 * already in the right language.
 */
function applyDocumentLanguage(language: Language) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", language === "zh" ? "zh-CN" : "en");
}

applyDocumentLanguage(currentLanguage);
