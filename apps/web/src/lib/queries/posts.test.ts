import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { where, orderBy } = vi.hoisted(() => ({
  where: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/schema", async () => {
  const actual =
    await vi.importActual<typeof import("@/schema/schema")>("@/schema/schema");
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({ where }),
      }),
    },
  };
});

import { getFeaturedPosts } from "./posts";

describe("getFeaturedPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    where.mockReturnValue({ orderBy });
    orderBy.mockResolvedValue([]);
  });

  it("should only query featured posts that are published and visible", async () => {
    await getFeaturedPosts();

    const predicate = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(predicate.params).toEqual([true, "published"]);
    expect(predicate.sql).toContain('"posts"."featured" =');
    expect(predicate.sql).toContain('"posts"."status" =');
    expect(predicate.sql).toContain('"posts"."published_at" is not null');
    expect(predicate.sql).toContain('"posts"."deleted_at" is null');
  });
});
