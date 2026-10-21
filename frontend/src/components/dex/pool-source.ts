import { t } from "@/lib/i18n";

/**
 * Which pool listing to browse. The upstreams take genuinely different arguments
 * — GeckoTerminal ranks a *chain*'s pools and searches by address, Gateway CLMM
 * lists one *connector*'s pools and searches free text, favourites are a local
 * list of addresses — so they are separate tabs rather than one filter row.
 */
export type PoolSource =
  | { kind: "gecko"; view: "trending" | "top" | "new" | "token" }
  | { kind: "gateway"; connector: string }
  | { kind: "favorites" };

export const GECKO_TABS = [
  { view: "trending", label: () => t("Trending") },
  { view: "top", label: () => t("Top") },
  { view: "new", label: () => t("New") },
  { view: "token", label: () => t("Search") },
] as const;

/**
 * The CLMM connectors Gateway can list pools for (and open positions in).
 *
 * Both are Solana venues, so these tabs are hidden on any other chain: a Meteora
 * tab on Base lists nothing and offers no position to open, which is worse than
 * not offering it. GeckoTerminal browsing works on every chain either way.
 */
export const GATEWAY_TABS = [
  { connector: "meteora", label: () => t("Meteora") },
  { connector: "orca", label: () => t("Orca") },
] as const;

export const GATEWAY_TAB_CHAIN = "solana";

export function sameSource(a: PoolSource, b: PoolSource): boolean {
  if (a.kind === "gecko" && b.kind === "gecko") return a.view === b.view;
  if (a.kind === "gateway" && b.kind === "gateway")
    return a.connector === b.connector;
  return a.kind === "favorites" && b.kind === "favorites";
}
