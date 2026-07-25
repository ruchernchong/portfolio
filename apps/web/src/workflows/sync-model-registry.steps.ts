import type { RegistrySource } from "@workspace/usage/registry";
import { revalidateTag } from "next/cache";
import { ERROR_IDS } from "@/constants/error-ids";
import { logWarning } from "@/lib/logger";
import {
  loadPricing,
  refreshRegistrySource,
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

export async function refreshSource(source: RegistrySource) {
  "use step";

  const entries = await refreshRegistrySource(source);
  return { source, entries };
}

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
