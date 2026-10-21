/**
 * What the translation layer must guarantee, and what it must not pretend to.
 *
 * The English string is the key, so two failure modes are structural rather than
 * accidental: a zh entry that no longer matches any `t()` call (English changed,
 * translation orphaned) and a `t()` call whose placeholders do not survive into
 * the translation (the sentence loses the number it was reporting). Both are
 * silent at runtime — one leaks English, the other drops a value — so both are
 * pinned here.
 */
import { describe, expect, it } from "vitest";

import { translate, ZH } from "@/lib/i18n";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/**
 * Every `t("…")` call in the source. A source scan, for the reason
 * sessionState.keys.test.ts gives: the failure it catches is an entry nobody
 * reads, which no amount of exercising the runtime can see.
 */
const SOURCES: Record<string, string> = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

function calledStrings(): Set<string> {
  const found = new Set<string>();
  // `t("…")` and `t('…')`, one line, no nesting. A component that receives the
  // translator as a prop calls it `tr(...)`, which counts too — the catalogue
  // does not care what the binding is named.
  const call = /\b(?:t|tr)\(\s*["']((?:[^"'\\\n]|\\.)+)["']/g;
  for (const [path, source] of Object.entries(SOURCES)) {
    if (path.includes(".test.") || path === "lib/i18n.tsx") continue;
    for (const m of source.matchAll(call)) found.add(m[1]);
  }
  return found;
}

describe("translate", () => {
  it("returns the English string unchanged when there is no translation", () => {
    expect(translate("zh", "A string nobody translated")).toBe("A string nobody translated");
  });

  it("returns English for the en language even when a translation exists", () => {
    expect(translate("en", "Close", {})).toBe("Close");
  });

  it("fills named placeholders", () => {
    expect(translate("en", "{count} open positions", { count: 3 })).toBe("3 open positions");
  });

  it("leaves an unfilled placeholder visible instead of printing undefined", () => {
    // A missing var is a bug in the caller. Printing `undefined` would hide it
    // behind plausible-looking output.
    expect(translate("en", "{count} open positions", {})).toBe("{count} open positions");
  });
});

describe("the zh catalogue", () => {
  it("never translates a string the source does not call", () => {
    const called = calledStrings();
    const orphaned = Object.keys(ZH).filter((english) => !called.has(english));
    expect(orphaned).toEqual([]);
  });

  it("keeps every placeholder of the English original", () => {
    const mismatched = Object.entries(ZH)
      .filter(([english, chinese]) => placeholders(english).join() !== placeholders(chinese).join())
      .map(([english]) => english);
    expect(mismatched).toEqual([]);
  });

  it("translates something, rather than silently covering nothing", () => {
    // Guards the two scans above from passing because the table is empty.
    expect(Object.keys(ZH).length).toBeGreaterThan(0);
  });

  it("has no entry that is identical to its English key", () => {
    // Those are not translations; the fallback already produces them.
    const redundant = Object.entries(ZH)
      .filter(([english, chinese]) => english === chinese)
      .map(([english]) => english);
    expect(redundant).toEqual([]);
  });
});
