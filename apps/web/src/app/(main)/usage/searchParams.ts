import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const USAGE_BREAKDOWN_VIEWS = ["model", "provider", "agent"] as const;

export type UsageBreakdownView = (typeof USAGE_BREAKDOWN_VIEWS)[number];

export const USAGE_SORT_COLUMNS = [
  "key",
  "provider",
  "tokens",
  "cost",
  "costPerMillionTokens",
  "messages",
] as const;

export type UsageSortColumn = (typeof USAGE_SORT_COLUMNS)[number];

/** Shared by the `useQueryState(s)` calls in the usage client components. */
export const usageParsers = {
  /**
   * Calendar year shown in the heatmap. Defaults to the current year so it is
   * kept out of the URL; the heatmap falls back to the newest year with data
   * when the requested one has none.
   */
  year: parseAsString.withDefault(String(new Date().getFullYear())),
  /** Active breakdown dataset. */
  view: parseAsStringLiteral(USAGE_BREAKDOWN_VIEWS).withDefault("model"),
  /** Free-text filter over the breakdown rows. */
  q: parseAsString.withDefault(""),
  /** Provider slug to filter by; "all" disables the filter. */
  provider: parseAsString.withDefault("all"),
  /** Only show free (zero or unpriced) rows. */
  free: parseAsBoolean.withDefault(false),
  /** Breakdown sort column and direction. */
  sort: parseAsStringLiteral(USAGE_SORT_COLUMNS).withDefault("tokens"),
  dir: parseAsStringLiteral(["asc", "desc"]).withDefault("desc"),
};
