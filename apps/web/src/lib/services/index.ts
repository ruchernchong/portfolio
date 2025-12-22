/**
 * Service Container - Singleton instances of all cache-related services.
 *
 * These services are initialized once and reused throughout the application
 * to maintain consistent state and avoid redundant Redis connections.
 *
 * Services:
 * - CacheService: Low-level Redis operations with error handling
 * - PostStatsService: Post statistics (views, likes)
 * - PopularPostsService: Popular posts sorted set management
 * - RelatedPostsCalculator: Tag-based similarity calculation
 * - CacheInvalidationService: Cache invalidation operations
 *
 * @example
 * ```typescript
 * import { postStatsService, popularPostsService } from '@web/lib/services';
 *
 * const stats = await postStatsService.getStats('my-post-slug');
 * const popular = await popularPostsService.getPopularPosts(5);
 * ```
 */

import redis from "@web/config/redis";
import { CacheService } from "@web/lib/services/cache.service";
import { CacheInvalidationService } from "@web/lib/services/cache-invalidation.service";
import { MediaService } from "@web/lib/services/media.service";
import { PopularPostsService } from "@web/lib/services/popular-posts.service";
import { PostStatsService } from "@web/lib/services/post-stats.service";
import { R2Service } from "@web/lib/services/r2.service";
import { RelatedPostsCalculator } from "@web/lib/services/related-posts.service";

// Initialize base cache service
export const cacheService = new CacheService(redis);

// Initialize domain services
export const postStatsService = new PostStatsService(cacheService);
export const popularPostsService = new PopularPostsService(cacheService);
export const relatedPostsCalculator = new RelatedPostsCalculator(cacheService);

// Initialize cache invalidation service (depends on popular posts service)
export const cacheInvalidationService = new CacheInvalidationService(
  cacheService,
  popularPostsService,
);

// Initialize R2 and media services
export const r2Service = new R2Service();
export const mediaService = new MediaService(r2Service);

// Re-export service classes for testing purposes
export { CacheService } from "@web/lib/services/cache.service";
export { CacheInvalidationService } from "@web/lib/services/cache-invalidation.service";
export { MediaService } from "@web/lib/services/media.service";
export { PopularPostsService } from "@web/lib/services/popular-posts.service";
export { PostStatsService } from "@web/lib/services/post-stats.service";
export { R2Service } from "@web/lib/services/r2.service";
export { RelatedPostsCalculator } from "@web/lib/services/related-posts.service";
