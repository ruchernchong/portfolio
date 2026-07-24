import type { ModelRate } from "./pricing";

/**
 * Pure, network-free model-registry layer.
 *
 * Each pricing/metadata source (LiteLLM, models.dev, or a curated DB override)
 * is normalised into a common {@link ModelEntry}, then merged by precedence
 * into the rows that back the `model` table and, in turn, pricing.
 *
 * Precedence, applied field-by-field:
 *   - rates:                override > LiteLLM > models.dev
 *   - names / release date / context limit: override > models.dev
 *
 * LiteLLM has the broadest, freshest pricing but no display names, so it leads
 * on rates; models.dev supplies the names/release dates LiteLLM lacks and fills
 * any model LiteLLM misses. A curated override always wins. All of this is
 * pure so it can be unit-tested with fixtures — fetching + DB I/O live in
 * `apps/web/src/lib/queries`.
 */

export type ModelSource = "models.dev" | "litellm" | "openrouter" | "override";

/**
 * Bootstrap override rows, replacing the former hardcoded `MODEL_RATE_OVERRIDES`
 * / `MODEL_ALIASES`. `syncModelRegistry` merges these as a low-priority override
 * layer only where the DB has no curated override for the key, so local + prod
 * self-seed on first ingest and each row becomes MCP-editable data afterward.
 *
 * These are all OpenAI Codex-internal slugs (or `claude-sonnet-5` before
 * models.dev listed it) that appear in no public pricing source, so they can
 * only ever be overrides. Rates are USD per 1,000,000 tokens.
 */
export const SEED_OVERRIDES: ModelEntry[] = [
  {
    provider: "anthropic",
    id: "claude-sonnet-5",
    source: "override",
    isOverride: true,
    rate: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  },
  {
    provider: "openai",
    id: "gpt-5.5-fast",
    source: "override",
    isOverride: true,
    rate: { input: 12.5, output: 75, cacheRead: 1.25, cacheWrite: 0 },
  },
  {
    provider: "openai",
    id: "gpt-5.6",
    source: "override",
    isOverride: true,
    rate: { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    provider: "openai",
    id: "gpt-5.6-sol",
    source: "override",
    isOverride: true,
    rate: { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    provider: "openai",
    id: "gpt-5.6-terra",
    source: "override",
    isOverride: true,
    rate: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 3.125 },
  },
  {
    provider: "openai",
    id: "gpt-5.6-luna",
    source: "override",
    isOverride: true,
    rate: { input: 1, output: 6, cacheRead: 0.1, cacheWrite: 1.25 },
  },
  {
    provider: "openai",
    id: "codex-auto-review",
    source: "override",
    isOverride: true,
    aliasTarget: "gpt-5-codex",
  },
];

/** One model's pricing + metadata from a single source (before merging). */
export interface ModelEntry {
  provider: string;
  id: string;
  displayName?: string;
  /** USD per 1,000,000 tokens. Partial: a source may know only some buckets. */
  rate?: Partial<ModelRate>;
  contextLimit?: number;
  /** YYYY-MM-DD. */
  releaseDate?: string;
  source: ModelSource;
  isOverride?: boolean;
  /** When set, price/label resolve from `(provider, aliasTarget)` instead. */
  aliasTarget?: string;
}

// --- models.dev ------------------------------------------------------------

interface ModelsDevCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
}
interface ModelsDevLimit {
  context?: number;
  output?: number;
}
interface ModelsDevModel {
  id?: string;
  name?: string;
  release_date?: string;
  limit?: ModelsDevLimit;
  cost?: ModelsDevCost;
}
interface ModelsDevProvider {
  models?: Record<string, ModelsDevModel>;
}
/** models.dev `api.json`: cost is already USD per 1,000,000 tokens. */
export type ModelsDevApi = Record<string, ModelsDevProvider>;

export function normaliseModelsDev(api: ModelsDevApi): ModelEntry[] {
  const entries: ModelEntry[] = [];
  for (const [provider, providerData] of Object.entries(api)) {
    const models = providerData?.models ?? {};
    for (const [modelId, model] of Object.entries(models)) {
      const cost = model.cost;
      entries.push({
        provider,
        id: modelId,
        displayName: model.name,
        rate:
          cost && cost.input != null && cost.output != null
            ? {
                input: cost.input,
                output: cost.output,
                cacheRead: cost.cache_read ?? 0,
                cacheWrite: cost.cache_write ?? 0,
              }
            : undefined,
        contextLimit: model.limit?.context,
        releaseDate: model.release_date,
        source: "models.dev",
      });
    }
  }
  return entries;
}

// --- LiteLLM ---------------------------------------------------------------

interface LiteLLMModel {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  cache_read_input_token_cost?: number;
  cache_creation_input_token_cost?: number;
  max_input_tokens?: number;
  litellm_provider?: string;
  mode?: string;
}
export type LiteLLMTable = Record<string, LiteLLMModel | unknown>;

/** Routing/hosting prefixes to strip, and vendor `<name>.` prefixes to unwrap. */
const KNOWN_VENDOR_PREFIXES = new Set([
  "anthropic",
  "openai",
  "azure",
  "azure_ai",
  "gemini",
  "google",
  "vertex_ai",
  "bedrock",
  "bedrock_converse",
  "fireworks_ai",
  "cohere",
  "mistral",
  "meta",
  "xai",
]);

const LITELLM_PROVIDER_MAP: Record<string, string> = {
  anthropic: "anthropic",
  openai: "openai",
  "text-completion-openai": "openai",
  azure: "openai",
  azure_ai: "openai",
  gemini: "google",
  google: "google",
  vertex_ai: "google",
  "vertex_ai-language-models": "google",
  fireworks_ai: "fireworks-ai",
  "fireworks-ai": "fireworks-ai",
  xai: "xai",
};

/**
 * Reduce a (possibly provider-prefixed / hosting-routed) LiteLLM key to the
 * bare model slug our logs use. Strips a leading `route/` segment, then a
 * leading vendor `<name>.` prefix — but only when `<name>` is a known vendor,
 * so a model whose slug legitimately contains a dot (e.g. `gpt-5.6`,
 * `claude-3.5-sonnet`) is left intact.
 */
export function bareSlug(key: string): string {
  let slug = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
  const dot = slug.indexOf(".");
  if (dot > 0 && KNOWN_VENDOR_PREFIXES.has(slug.slice(0, dot).toLowerCase())) {
    slug = slug.slice(dot + 1);
  }
  return slug;
}

/** Infer the billing vendor from the slug itself for the models we track. */
function vendorFromSlug(slug: string): string | undefined {
  const s = slug.toLowerCase();
  if (s.startsWith("claude")) return "anthropic";
  if (
    s.startsWith("gpt") ||
    s.startsWith("codex") ||
    s.startsWith("chatgpt") ||
    /^o[134]\b/.test(s)
  ) {
    return "openai";
  }
  if (s.startsWith("gemini")) return "google";
  return undefined;
}

function resolveLiteLLMProvider(model: LiteLLMModel, slug: string): string {
  return (
    vendorFromSlug(slug) ??
    LITELLM_PROVIDER_MAP[model.litellm_provider ?? ""] ??
    model.litellm_provider ??
    "unknown"
  );
}

function isLiteLLMModel(value: unknown): value is LiteLLMModel {
  return typeof value === "object" && value !== null;
}

const perToken = (v?: number): number | undefined =>
  v == null ? undefined : v * 1_000_000;

export function normaliseLiteLLM(table: LiteLLMTable): ModelEntry[] {
  // Dedupe (provider, id) across bedrock/vertex duplicates: first priced wins.
  const seen = new Map<string, ModelEntry>();
  for (const [key, value] of Object.entries(table)) {
    if (key === "sample_spec" || !isLiteLLMModel(value)) continue;
    const input = perToken(value.input_cost_per_token);
    const output = perToken(value.output_cost_per_token);
    if (input == null || output == null) continue;

    const slug = bareSlug(key);
    const provider = resolveLiteLLMProvider(value, slug);
    const mapKey = `${provider}\0${slug}`;
    if (seen.has(mapKey)) continue;

    seen.set(mapKey, {
      provider,
      id: slug,
      rate: {
        input,
        output,
        cacheRead: perToken(value.cache_read_input_token_cost) ?? 0,
        cacheWrite: perToken(value.cache_creation_input_token_cost) ?? 0,
      },
      contextLimit: value.max_input_tokens,
      source: "litellm",
    });
  }
  return [...seen.values()];
}

// --- Merge -----------------------------------------------------------------

const keyOf = (e: { provider: string; id: string }) => `${e.provider}\0${e.id}`;

function indexBy(entries: ModelEntry[]): Map<string, ModelEntry> {
  const map = new Map<string, ModelEntry>();
  for (const entry of entries) {
    if (!map.has(keyOf(entry))) map.set(keyOf(entry), entry);
  }
  return map;
}

function hasFullRate(entry?: ModelEntry): boolean {
  return entry?.rate?.input != null && entry?.rate?.output != null;
}

function pick<T>(...values: (T | undefined)[]): T | undefined {
  return values.find((v) => v != null);
}

/**
 * Merge the source layers into one entry per (provider, id). Rates are taken as
 * a unit from the highest-precedence layer that defines input+output (never
 * mixing input from one source with output from another); names/metadata fill
 * independently from the highest layer that has each.
 */
export function mergeRegistry(sources: {
  overrides: ModelEntry[];
  litellm: ModelEntry[];
  modelsDev: ModelEntry[];
}): ModelEntry[] {
  const override = indexBy(sources.overrides);
  const litellm = indexBy(sources.litellm);
  const modelsDev = indexBy(sources.modelsDev);

  const keys = new Set([
    ...override.keys(),
    ...litellm.keys(),
    ...modelsDev.keys(),
  ]);

  return [...keys].map((key) => {
    const o = override.get(key);
    const l = litellm.get(key);
    const m = modelsDev.get(key);
    const base = (o ?? l ?? m) as ModelEntry;

    // Rates: override > LiteLLM > models.dev, taken whole from the first layer
    // that fully defines them.
    const rateLayer = hasFullRate(o)
      ? o
      : hasFullRate(l)
        ? l
        : hasFullRate(m)
          ? m
          : undefined;

    return {
      provider: base.provider,
      id: base.id,
      // Names/metadata: override > models.dev > LiteLLM(none)/OpenRouter.
      displayName: pick(o?.displayName, m?.displayName, l?.displayName),
      rate: rateLayer?.rate,
      contextLimit: pick(o?.contextLimit, m?.contextLimit, l?.contextLimit),
      releaseDate: pick(o?.releaseDate, m?.releaseDate, l?.releaseDate),
      aliasTarget: pick(o?.aliasTarget, l?.aliasTarget, m?.aliasTarget),
      source: rateLayer?.source ?? o?.source ?? m?.source ?? base.source,
      isOverride: o != null,
    } satisfies ModelEntry;
  });
}
