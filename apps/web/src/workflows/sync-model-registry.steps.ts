import type { RegistrySource } from "@workspace/usage/registry";
import { revalidateTag } from "next/cache";
import { getStepMetadata } from "workflow";
import { ERROR_IDS } from "@/constants/error-ids";
import { logWarning } from "@/lib/logger";
import {
  loadPricing,
  refreshRegistrySource,
  SOURCE_LABELS,
  syncModelRegistry,
} from "@/lib/queries/models";
import { repriceUnpricedTokenUsage } from "@/lib/queries/usage";

/**
 * Steps for {@link import("./sync-model-registry").syncModelRegistryWorkflow}.
 *
 * Deliberately a separate module from the workflow function. A `"use workflow"`
 * function is compiled into a sandboxed VM with no Node.js access, and the
 * sandbox check applies to everything its module imports — `next/cache` reaches
 * it transitively through `@/lib/queries/usage`. Steps have full Node access, so
 * keeping them here leaves the workflow module a pure orchestrator.
 *
 * Every return value is serialised into the run journal, so these stay small:
 * the merged registry is ~6,000 entries and is handed between steps through the
 * Redis cache rather than through the journal.
 */

/** Retries after the first attempt, so a source gets 4 tries in total. */
const MAX_SOURCE_RETRIES = 3;

/**
 * Warm one source's cache, retrying a transient outage before giving up on it.
 *
 * The failure has to reach this step boundary for the retry to happen at all,
 * which is why `refreshRegistrySource` rejects rather than degrading. Only once
 * the attempts are spent does the source degrade to an empty layer, so a source
 * that stays down narrows the merge instead of failing the run — the property
 * the inline sync had, now with retries in front of it.
 *
 * `degraded` rides back in the step result so an outage is visible in the run's
 * return value (`npx workflow inspect runs <id>`) rather than only in a log line
 * nobody reads. Note that a degraded source still lets lower-precedence sources
 * win the merge for models they both carry, and the upsert is unconditional —
 * see the follow-up on not downgrading a row when its source is missing.
 */
export async function refreshSource(source: RegistrySource) {
  "use step";

  try {
    const entries = await refreshRegistrySource(source);
    return { source, entries, degraded: false };
  } catch (error) {
    // `attempt` counts from 1 and the runtime stops retrying once it reaches
    // `maxRetries + 1`, so while it is within that budget a rethrow buys another
    // attempt. On the final one a rethrow would fail the whole run instead.
    const { attempt } = getStepMetadata();
    if (attempt <= MAX_SOURCE_RETRIES) throw error;

    logWarning(`Skipped ${SOURCE_LABELS[source]} after exhausting retries`, {
      errorId: ERROR_IDS.USAGE_INGEST_FAILED,
      error: error instanceof Error ? error.message : String(error),
      attempt,
    });
    return { source, entries: 0, degraded: true };
  }
}
refreshSource.maxRetries = MAX_SOURCE_RETRIES;

export async function mergeAndUpsert() {
  "use step";

  // Re-reads each source from the Redis cache the fetch steps just warmed.
  const { rows } = await syncModelRegistry();
  return { rows };
}

/**
 * Heal `token_usage` rows whose model had no price when they were ingested.
 * Best-effort: the registry is already persisted by this point, so a failure
 * here defers repricing to the next run rather than undoing the sync.
 */
export async function repriceFromRegistry() {
  "use step";

  try {
    const result = await repriceUnpricedTokenUsage(await loadPricing());
    return result.repriced;
  } catch (error) {
    logWarning("Skipped repricing during model registry sync", {
      errorId: ERROR_IDS.USAGE_INGEST_FAILED,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Publish the refreshed registry. `models:providers` carries the model and
 * provider display names with a multi-day life, so without this the page would
 * show refreshed costs beside stale names for the rest of that window.
 */
export async function publishRegistry() {
  "use step";

  revalidateTag("usage", "max");
  revalidateTag("models:providers", "max");
}
