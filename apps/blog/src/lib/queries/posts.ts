import {
  and,
  arrayOverlaps,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
} from "drizzle-orm";
import { cache } from "react";
import { db, posts } from "@/schema";

export const getPostBySlug = cache(async (slug: string) => {
  const [post] = await db
    .select({ tags: posts.tags })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  return post;
});

export const getPublishedPosts = cache(async () => {
  return db
    .select()
    .from(posts)
    .where(and(eq(posts.status, "published"), isNull(posts.deletedAt)))
    .orderBy(desc(posts.publishedAt));
});

export const getPublishedPostBySlug = cache(async (slug: string) => {
  return db.query.posts.findFirst({
    with: {
      author: true,
    },
    where: and(
      eq(posts.slug, slug),
      eq(posts.status, "published"),
      isNull(posts.deletedAt),
    ),
  });
});

export const getPublishedPostSlugs = cache(async () => {
  return db
    .select({ slug: posts.slug })
    .from(posts)
    .where(and(eq(posts.status, "published"), isNull(posts.deletedAt)));
});

export const getPublishedPostsBySlugs = cache(async (slugs: string[]) => {
  return db
    .select()
    .from(posts)
    .where(
      and(
        inArray(posts.slug, slugs),
        eq(posts.status, "published"),
        isNotNull(posts.publishedAt),
        isNull(posts.deletedAt),
      ),
    );
});

export const getPostsWithOverlappingTags = cache(
  async (tags: string[], excludeSlug: string) => {
    return db
      .select()
      .from(posts)
      .where(
        and(
          arrayOverlaps(posts.tags, tags),
          ne(posts.slug, excludeSlug),
          eq(posts.status, "published"),
          isNull(posts.deletedAt),
        ),
      );
  },
);
