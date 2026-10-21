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
/** Minimal catalogue: enough to prove the switch end to end. */
export const ZH: Record<string, string> = {
  // shell and navigation
  "Settings": "设置",
  "Servers": "服务器",
  "Agents": "智能体",
  "Keys and Wallets": "密钥与钱包",
  "LLM Endpoints": "LLM 端点",
  "Voice & AI": "语音与 AI",
  "Notifications": "通知",
  "Privacy": "隐私",
  "Admin": "管理",
  "Updates": "更新",
  "Account": "账户",
  "Server": "服务器",
  "Server · {name}": "服务器 · {name}",
  "Language": "语言",
  "Logout": "退出登录",
  "Settings section": "设置分区",
  "Settings sections": "设置分区列表",

  // common verbs and labels
  "Save": "保存",
  "Cancel": "取消",
  "Delete": "删除",
  "Edit": "编辑",
  "Add": "添加",
  "Close": "关闭",
  "Close (price)": "收盘",
  "Close (position)": "平仓",
  "Current": "当前",
  "Now": "现在",
  "Open": "开仓",
  "Refresh": "刷新",
  "Retry": "重试",
  "Search": "搜索",
  "Loading": "加载中",
  "Name": "名称",
  "Status": "状态",
  "Type": "类型",
  "Version": "版本",
  "Amount": "数量",
  "Price": "价格",
  "Pair": "交易对",
  "Take Profit": "止盈",
  "Stop Loss": "止损",
  "Leverage": "杠杆",
  "PnL": "盈亏",
  "Total PnL": "总盈亏",
  "Volume": "成交量",
  "Fees": "手续费",
  "Fee": "手续费",
};

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
