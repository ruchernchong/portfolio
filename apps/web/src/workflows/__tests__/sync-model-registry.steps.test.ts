import { beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` factories are hoisted above module scope, so the spies they close
// over have to be created with `vi.hoisted`.
const { getStepMetadata, refreshRegistrySource } = vi.hoisted(() => ({
  getStepMetadata: vi.fn(),
  refreshRegistrySource: vi.fn(),
}));

vi.mock("workflow", () => ({ getStepMetadata }));

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  logWarning: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock("@/lib/queries/usage", () => ({
  repriceUnpricedTokenUsage: vi.fn(),
}));

vi.mock("@/lib/queries/models", () => ({
  refreshRegistrySource,
  loadPricing: vi.fn(),
  syncModelRegistry: vi.fn(),
  SOURCE_LABELS: {
    gateway: "AI Gateway",
    openrouter: "OpenRouter",
    "models.dev": "models.dev",
  },
}));

import { refreshSource } from "../sync-model-registry.steps";

/** The attempt on which a rethrow would fail the run instead of buying a retry. */
const finalAttempt = (refreshSource.maxRetries ?? 0) + 1;

describe("refreshSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should report the entry count when the source is healthy", async () => {
    getStepMetadata.mockReturnValue({ attempt: 1 });
    refreshRegistrySource.mockResolvedValue(42);

    await expect(refreshSource("gateway")).resolves.toEqual({
      source: "gateway",
      entries: 42,
      degraded: false,
    });
  });

  it("should rethrow while attempts remain, so the step retries", async () => {
    // The whole point of splitting the sources into their own steps. A step
    // only retries when it throws, so absorbing the error on an early attempt
    // would spend the retry budget without ever using it.
    refreshRegistrySource.mockRejectedValue(
      new Error("AI Gateway returned 503"),
    );

    for (let attempt = 1; attempt <= finalAttempt - 1; attempt++) {
      getStepMetadata.mockReturnValue({ attempt });
      await expect(refreshSource("gateway")).rejects.toThrow(
        "AI Gateway returned 503",
      );
    }
  });

  it("should degrade on the final attempt rather than fail the run", async () => {
    // Rethrowing here would reach the orchestrator's `Promise.all` and take the
    // merge, upsert, reprice and publish steps down with it. One dead source
    // has to narrow the merge, not lose the other two.
    getStepMetadata.mockReturnValue({ attempt: finalAttempt });
    refreshRegistrySource.mockRejectedValue(
      new Error("AI Gateway returned 503"),
    );

    await expect(refreshSource("gateway")).resolves.toEqual({
      source: "gateway",
      entries: 0,
      degraded: true,
    });
  });

  it("should keep the retry budget and the degrade boundary in step", () => {
    // These two are only correct relative to each other: degrading a step early
    // wastes retries, degrading it late fails the run. Pinning the property
    // stops one moving without the other.
    expect(refreshSource.maxRetries).toBe(3);
  });
});
