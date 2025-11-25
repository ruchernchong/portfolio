# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root-level Commands (run from project root)

#### Development

- `pnpm dev` - Start development server with hot reload and Drizzle Studio (uses Turbo)
- `pnpm build` - Build all apps for production (uses Turbo)
- `pnpm start` - Start production server (uses Turbo)
- `pnpm test` - Run tests across all apps (uses Turbo)
- `pnpm test:coverage` - Generate coverage reports (uses Turbo)
- `pnpm lint` - Run linting across all apps with Biome (uses Turbo)
- `pnpm lint:blog` - Run linting for blog app with Biome
- `pnpm format` - Format code with Biome (uses Turbo)

#### Database Management

- `pnpm db:drop` - Drop database (interactive, requires confirmation)
- `pnpm db:generate` - Generate database migrations from schema
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:pull` - Pull schema from database
- `pnpm db:check` - Check migration files for issues
- `pnpm db:up` - Apply pending migrations
- `pnpm db:studio` - Open Drizzle Studio for database management
- `pnpm db:seed` - Seed database with test data

#### Quality & Release

- `pnpm release` - Create semantic release (runs semantic-release with conventional commits)
- `pnpm release:blog` - Release blog app specifically

### App-specific Commands (run from `/apps/blog/`)

#### Development

- `pnpm dev` - Start blog dev server (next dev)
- `pnpm build` - Build blog app for production
- `pnpm start` - Start production server
- `pnpm test` - Run Vitest tests
- `pnpm test:watch` - Run Vitest tests in watch mode
- `pnpm test:coverage` - Generate coverage report
- `pnpm test -- utils/__tests__/truncate.test.ts` - Run single test file
- `pnpm format` - Format code with Biome

#### Database (App-level)

- `pnpm drop` - Drop database tables
- `pnpm generate` - Generate migrations from schema
- `pnpm migrate` - Run database migrations
- `pnpm push` - Push schema changes directly
- `pnpm pull` - Pull schema from database
- `pnpm check` - Check migration files
- `pnpm up` - Apply migrations
- `pnpm studio` - Open Drizzle Studio
- `pnpm seed` - Seed database with development data

## Architecture Overview

This is a Turborepo monorepo containing a Next.js 16 portfolio website with an integrated blog system.

### Monorepo Structure

- **Root**: Turborepo configuration with shared tooling (Biome, commitlint, semantic-release, Husky)
- **apps/blog**: Main Next.js application with blog functionality and integrated CMS at `/studio`
- **packages/**: Currently empty but structured for shared packages (future use)

### Tech Stack

- **Framework**: Next.js 16.0.0 with App Router and React 19.2.0
- **Content**: Database-backed MDX with next-mdx-remote 5.0.0 for compilation
- **Database**: Neon PostgreSQL (@neondatabase/serverless 0.10.4) with Drizzle ORM 0.38.3 and drizzle-kit 0.30.1
- **Authentication**: Better Auth 1.3.28 with OAuth providers (GitHub, Google)
- **Cache**: Upstash Redis 1.34.3 for analytics and caching
- **API Layer**: tRPC 11.4.2 for type-safe API routes with @tanstack/react-query 5.81.2
- **Data Fetching**: Apollo Client 3.12.2 for GraphQL queries (@octokit/rest 22.0.0 for GitHub API)
- **Styling**: Tailwind CSS v4.0.14 (@tailwindcss/postcss 4.0.14) with Tailwind Typography 0.5.8
- **UI Components**: Radix UI primitives, Lucide React 0.471.1 icons, Framer Motion 12.23.6, shadcn 3.4.2
- **Testing**: Vitest 4.0.3 with React Testing Library 16.3.0 and @vitest/coverage-v8 4.0.3
- **Code Quality**: Biome 2.2.6 for linting/formatting, TypeScript 5.2.2 strict mode, Husky 9.1.6 for git hooks, lint-staged 15.5.2
- **Build Tool**: Turbo 2.6.1 for monorepo orchestration, Vite 7.1.12 for test bundling
- **Deployment**: Vercel with automated migrations (@vercel/analytics 1.5.0, @vercel/speed-insights 1.2.0, @vercel/og 0.0.27)
- **React Features**: React Compiler (babel-plugin-react-compiler 1.0.0)

### Key Features

- **Custom Analytics**: Privacy-focused visitor tracking with IP hashing
- **Blog System**: Database-backed MDX blog posts with automatic metadata generation (reading time, SEO metadata)
- **Popular Posts**: Real-time tracking via Redis sorted sets, displaying top posts by view count
- **Related Posts**: Tag-based recommendations using Jaccard similarity algorithm with Redis caching
- **Content Studio**: Built-in CMS at `/studio` for managing blog posts directly in the database
- **LLM SEO**: Dynamic `/llms.txt` endpoint for LLM crawlers (following llmstxt.org standard)
- **RSS Feed**: Dynamic `/feed.xml` endpoint with latest published posts
- **Performance**: Optimized images, caching, and core web vitals tracking
- **SEO**: Structured data, sitemaps, OpenGraph image generation

### Database Architecture

- **Schema Location**: `apps/blog/src/schema/` using Drizzle ORM 0.38.3
    - `posts.ts`: Blog posts with MDX content, metadata, tags, and publish status
    - `sessions.ts`: Session tracking for analytics (visits, geolocation, device info)
    - `auth.ts`: Better Auth authentication tables (users, accounts, sessions, verification)
    - `index.ts`: Database client export (Neon serverless connection with WebSocket support)
- **Configuration**: `apps/blog/drizzle.config.ts` (uses DATABASE_URL from env)
- **Migrations**: `apps/blog/migrations/` managed by drizzle-kit 0.30.1
- **Seeding**: `apps/blog/src/scripts/seed.ts` using drizzle-seed 0.3.1 (run with NODE_ENV=development)

### Analytics System

- Real-time visitor statistics (browsers, countries, devices, OS, pages, referrers)
- Data visualization with Recharts components in `/analytics` dashboard
- Privacy protection through IP address hashing

### Layered Architecture

The codebase follows a clean 3-layer architecture pattern for maintainability and testability:

#### 1. Database Layer (`lib/queries/`)
**Pure database access with Drizzle ORM**
- Contains only database queries with no business logic
- Type-safe queries using Drizzle's query builder
- Examples: `getPostBySlug()`, `getPublishedPostsBySlugs()`, `getPostsWithOverlappingTags()`
- No Redis, no calculations, no external dependencies
- Easy to test and maintain

#### 2. Service Layer (`lib/services/`)
**Business logic and data orchestration with class-based architecture**

The service layer uses classes for better testability, dependency injection, and error handling:

**Core Services:**
- `CacheService` - Redis wrapper with error handling and graceful degradation
  - Wraps all Redis operations (get, set, del, zadd, zrange, zrem)
  - Returns null/defaults on failures instead of crashing
  - Logs errors with ERROR_IDS for monitoring
  - Health check method for Redis availability

- `PostStatsService` - Post statistics management (views, likes)
  - Tracks view counts and like counts per user
  - Updates both cache and popular posts sorted set
  - Uses React cache() for request-level deduplication
  - Aggregates likes across all users

- `PopularPostsService` - Popular posts tracking via Redis sorted set
  - Fetches top N posts by view count from sorted set
  - Merges Redis scores with database post data
  - Falls back to recent published posts if Redis unavailable
  - Maintains sorted set operations (add, remove, update)

- `RelatedPostsCalculator` - Tag-based post recommendations
  - Implements Jaccard similarity algorithm for tag matching
  - Caches results for 24 hours to reduce computation
  - Filters posts below minimum similarity threshold (0.1)
  - Returns posts sorted by similarity score

- `CacheInvalidationService` - Cache management on mutations
  - Invalidates post caches on updates/deletes
  - Clears related post caches when tags change
  - Removes posts from popular sorted set on deletion
  - Invalidates all posts with overlapping tags

**Service Container** (`lib/services/index.ts`):
- Exports singleton instances of all services
- Provides dependency injection for testing
- Centralizes service initialization

**Configuration** (`lib/config/cache.config.ts`):
- Centralized cache configuration (TTLs, limits, Redis keys)
- Popular posts limit: 5, fallback: 10
- Related posts limit: 4, TTL: 24 hours
- Min similarity threshold: 0.1

**Benefits:**
- Error resilience: Redis failures don't crash the app
- Testability: Dependency injection enables easy mocking
- Maintainability: Clear class boundaries and responsibilities
- Type safety: Full TypeScript support with proper types
- Observability: Structured error logging for monitoring

#### 3. Action Layer (`app/(blog)/_actions/`)
**Server actions for mutations only**
- Contains only write operations (no reads)
- Examples: `incrementViews()`, `incrementLikes()`
- Uses React Server Actions for client-side mutations
- Never used for data fetching (use services directly in components)

**Architecture Benefits**:
- Clear separation of concerns
- Easy to unit test each layer independently
- Reusable queries across multiple services
- Business logic isolated from data access
- Follows Next.js 16 best practices (server actions for writes only)

### Caching Strategy

The application uses a simplified two-layer caching approach optimised for low-traffic personal blogs:

#### Layer 1: React cache() [Request-Level Deduplication]
```typescript
import { cache } from 'react';

export const getPublishedPostBySlug = cache(async (slug: string) => {
  return db.query.posts.findFirst(...);
});
```

**Purpose**: Prevents duplicate database queries within a single HTTP request

**Scope**: Per-request only (cache cleared after request completes)

**Use Cases**:
- `generateMetadata()` and page component both call same query
- Multiple components render same data
- Automatic deduplication with zero configuration

**Performance Impact**: 5-15ms savings per duplicate query eliminated

**All Query Functions Use React cache()**:
- `getPostBySlug(slug)` - Single post tag lookup
- `getPublishedPosts()` - All published posts
- `getPublishedPostBySlug(slug)` - Single published post with author
- `getPublishedPostSlugs()` - All published post slugs
- `getPublishedPostsBySlugs(slugs[])` - Multiple posts by slug array
- `getPostsWithOverlappingTags(tags[], excludeSlug)` - Related posts candidates

#### Layer 2: Redis [Long-Lived Cross-Request Cache]
```typescript
// Example: Popular posts tracking
await redis.zadd('posts:popular', viewCount, postSlug);
const topPosts = await redis.zrange('posts:popular', 0, 4, { rev: true });
```

**Purpose**: Analytics tracking and expensive computations

**Scope**: Cross-request (all users), persists until TTL expiration or manual invalidation

**Use Cases**:
- **Post Statistics** (1 hour TTL): View counts, like counts per post
- **Popular Posts** (Persistent): Redis sorted set ranked by view count
- **Related Posts** (24 hour TTL): Jaccard similarity calculations

**Services**:
- `CacheService` - Redis wrapper with graceful error handling
- `PostStatsService` - View/like tracking with React cache() deduplication
- `PopularPostsService` - Top posts by view count
- `RelatedPostsCalculator` - Tag similarity with 24hr cache
- `CacheInvalidationService` - Invalidates caches on post updates

**Configuration**: `lib/config/cache.config.ts`
- Popular posts: 5 items, fallback to 10 recent posts
- Related posts: 4 items, 24hr TTL, 0.1 minimum similarity
- Post stats: 1hr TTL

#### Cache Strategy Rationale

**Why This Approach**:
- Optimised for low traffic (<100 views/day)
- Simple to maintain (no complex invalidation logic)
- Eliminates duplicate queries (React cache())
- Handles analytics efficiently (Redis)
- No cross-request component caching needed

**What We Don't Use**:
- ❌ Cache Components (`"use cache"` directive) - Disabled for simplicity
  - Caused CPU overhead on Vercel
  - Required manual cache invalidation
  - Overkill for personal blog scale
- ❌ `unstable_cache()` - Not needed for low traffic
- ❌ ISR (Incremental Static Regeneration) - Blog routes are dynamic for analytics

**Mental Model**:
- React cache() = "Don't repeat work within same request"
- Redis = "Track analytics and expensive calculations across requests"

**Performance Characteristics**:
- Database queries: 5-15ms (fast with Neon serverless)
- MDX compilation: 50-200ms per request (acceptable for low traffic)
- Redis operations: 5-20ms with Upstash edge network
- Total page load: ~60-250ms for blog post pages

## Environment Variables

Required environment variables (see `apps/blog/.env.example`):

### Core Configuration

- `NEXT_PUBLIC_BASE_URL` - Base URL for the application (e.g., http://localhost:3000, https://ruchern.dev)

### Database

- `DATABASE_URL` - Neon PostgreSQL connection string (format: postgresql://user:password@host/database?sslmode=require)

### GitHub Integration

- `GH_ACCESS_TOKEN` - GitHub personal access token for API access (used by @octokit/rest)

### Redis (Upstash)

- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST API URL (e.g., https://xxx.upstash.io)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST API token

### Analytics

- `IP_SALT` - Random salt string for IP address hashing (privacy protection, generate with: openssl rand -hex 32)

### Authentication (Better Auth)

- `BETTER_AUTH_SECRET` - Secret key for Better Auth (generate with: openssl rand -hex 32)
- `BETTER_AUTH_URL` - Base URL for auth callbacks (http://localhost:3000 for dev, https://your-domain.com for production)

### OAuth Providers

- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID (create at: https://github.com/settings/developers)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- `GOOGLE_CLIENT_ID` - Google OAuth app client ID (create at: https://console.cloud.google.com)
- `GOOGLE_CLIENT_SECRET` - Google OAuth app client secret

## Documentation & Learning Resources

### Using Context7 for Library Documentation

When working with libraries in this project, use the Context7 MCP server to retrieve up-to-date documentation and code
examples. This is especially important for rapidly evolving libraries.

**Priority Libraries for Context7**:

- **Next.js** (`/vercel/next.js`) - Framework APIs, routing, data fetching
- **React** (`/facebook/react`) - Hooks, components, server components
- **Drizzle ORM** (`/drizzle-team/drizzle-orm`) - Database queries, schema, migrations
- **Better Auth** (`/better-auth/better-auth`) - Authentication setup, providers, session management
- **Tailwind CSS** (`/tailwindlabs/tailwindcss`) - Styling utilities, configuration
- **tRPC** (`/trpc/trpc`) - API routes, client setup, type safety
- **Vitest** (`/vitest-dev/vitest`) - Testing patterns, assertions, mocking
- **next-mdx-remote** (`/hashicorp/next-mdx-remote`) - MDX compilation, components
- **Recharts** (`/recharts/recharts`) - Chart components, data visualization

**When to Use Context7**:

1. Before implementing new features using these libraries
2. When encountering API changes or deprecation warnings
3. For troubleshooting library-specific issues
4. When learning best practices for library usage
5. Before upgrading library versions

**Installed Versions** (always check Context7 for version-specific docs):

- Next.js 16.0.0 (with React Compiler enabled)
- React 19.2.0 with React DOM 19.2.0
- Drizzle ORM 0.38.3 with drizzle-kit 0.30.1
- Better Auth 1.3.28
- Tailwind CSS 4.0.14 with @tailwindcss/postcss 4.0.14
- tRPC 11.4.2 with @tanstack/react-query 5.81.2
- Vitest 4.0.3 with @vitest/coverage-v8 4.0.3
- next-mdx-remote 5.0.0
- Framer Motion 12.23.6
- Lucide React 0.471.1
- Upstash Redis 1.34.3
- Apollo Client 3.12.2

**How to Use**:

```
Claude, using Context7, how do I implement [feature] with [library]?
```

Example queries:

- "Using Context7, show me how to set up OAuth providers in Better Auth"
- "Using Context7, what's the best way to handle dynamic routes in Next.js 16?"
- "Using Context7, how do I create a custom middleware with tRPC?"

## Code Conventions

### Language & Writing Style

**Use English (Singapore) for all content, documentation, and user-facing text**:

- **Spelling**: British English variants (e.g., "colour", "optimise", "centre", "analyse")
- **Date Format**: DD/MM/YYYY or DD Month YYYY (e.g., 24/10/2025 or 24 October 2025)
- **Time Format**: 24-hour format (e.g., 14:30 instead of 2:30 PM)
- **Currency**: Singapore Dollar (SGD) when applicable
- **Tone**: Professional yet approachable, clear and concise
- **Terminology**: Use Singapore English terms where appropriate (e.g., "lorry" instead of "truck", "flat" instead of "
  apartment" for HDB context)

**Examples**:

```tsx
// ✅ Correct - English (Singapore)
const message = "Your profile has been optimised for better performance";
const date = "24 October 2025";
const time = "14:30";

// ❌ Incorrect - American English
const message = "Your profile has been optimized for better performance";
const date = "October 24, 2025";
const time = "2:30 PM";
```

### File Structure

- TypeScript with strict mode and path aliases (`@/*` maps to app root)
- Use kebab-case for filenames
- Tests in `__tests__/` directories alongside components
- Named exports preferred over default exports

### Styling & Components

- Tailwind CSS v4 with utility-first approach
- Component variants using class-variance-authority
- Functional components with hooks
- Error handling with proper TypeScript types

### Content Management

All blog content is managed through the database-backed Content Studio:

- **Content Studio CMS**: Access at `/studio` route (isolated route group with own layout)
- **Database Storage**: All blog posts stored in Neon PostgreSQL
- **Posts Schema**: `src/schema/posts.ts` - MDX content, metadata, tags, publish status
- **MDX Compilation**: Uses `next-mdx-remote` with rehype/remark plugins for rendering
- **Automatic Metadata**: Reading time, SEO tags, OpenGraph images generated automatically
- **API Routes**: `/api/studio/posts` for CRUD operations
- **Management UI**: Post listing, creation, editing, and publishing workflows
- **Draft Support**: Posts can be saved as drafts before publishing

### Authentication System

- Better Auth configuration in `src/lib/auth.ts`
- OAuth providers: GitHub and Google
- Account linking enabled for trusted providers
- Protected routes using `(auth)` route group
- Login page at `/login` with OAuth buttons
- Session management and last login method tracking

### Next.js Configuration

The Next.js configuration (`apps/blog/next.config.ts`) includes:

- **React Compiler**: Enabled via `reactCompiler: true` (babel-plugin-react-compiler 1.0.0)
- **Turbopack**: File system caching enabled for dev (`turbopackFileSystemCacheForDev: true`)
- **Strict Mode**: Enabled via `reactStrictMode: true`
- **Image Optimization**: Remote patterns for GitHub avatars and Google profile pictures
- **Security Headers**: HSTS, XSS Protection, X-Frame-Options, CSP, Referrer Policy, DNS Prefetch Control
- **Logging**: Full URL logging for fetch requests (`logging.fetches.fullUrl: true`)

## Tailwind CSS Guidelines

### Spacing Standards

#### 1. **Primary Rule: Use gap-* Instead of Space Utilities**

- **Always use `flex gap-*` for spacing** between child elements
- Use only even numbers: `gap-2, gap-4, gap-6, gap-8, gap-10, gap-12`
- **Avoid**: `gap-1, gap-3, gap-5, gap-7` and fractions like `gap-1.5`
- **Never use `space-y-*` or `space-x-*`** in custom components

```tsx
// ❌ Never - space utilities in custom code
<div className="space-y-4">
  <div>Content 1</div>
  <div>Content 2</div>
</div>

// ✅ Always - gap utilities
<div className="flex flex-col gap-4">
  <div>Content 1</div>
  <div>Content 2</div>
</div>
```

#### 2. **Margin Rules**

- **Avoid margin-top** for layout spacing
- **Prefer margin-bottom** for creating separation between elements
- **Use margin-y** sparingly for vertical rhythm
- **Use margin-x** for horizontal adjustments

```tsx
// ❌ Before - margin-top for spacing
<div className="mt-6">
  <h2>Title</h2>
</div>

// ✅ After - margin-bottom on previous element
<div>Previous content</div>
<div className="mb-6">
  <h2>Title</h2>
</div>
```

#### 3. **Spacing Priority Order**

1. **`gap*`** - For container element spacing (highest priority)
2. **`margin-bottom`** - For element separation
3. **`margin-y`** - For symmetrical vertical spacing
4. **`margin-top`** - Only for specific UI adjustments

#### 4. **Spacing Scale Reference**

Even numbers only for consistent spacing:

- `gap-2`/`mb-2` = 0.5rem (8px) - Small gaps
- `gap-4`/`mb-4` = 1rem (16px) - Standard gaps
- `gap-6`/`mb-6` = 1.5rem (24px) - Medium gaps
- `gap-8`/`mb-8` = 2rem (32px) - Large gaps
- `gap-12`/`mb-12` = 3rem (48px) - Extra large gaps

#### 5. **Component Architecture**

- Use `cn()` utility for conditional class merging
- Class Variance Authority (CVA) for component variants
- Consistent prop interfaces with `className?: string`
- Atomic component composition

```tsx
import { cn } from "@/lib/utils";

interface ComponentProps {
  className?: string;
}

export const Component = ({ className, ...props }: ComponentProps) => (
  <div className={cn("base-classes", className)} {...props} />
);
```

#### 6. **Theming System**

- Use semantic color tokens: `foreground`, `muted`, `accent`, `border`, `background`
- Dark mode via `.dark` class on parent elements
- CSS custom properties for design tokens
- OKLCH color space for modern color control

```tsx
// ✅ Semantic colors
<div className="bg-background text-foreground border-border">
  <h2 className="text-primary">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

#### 7. **Exception Cases**

- `mt-px` allowed for checkbox/radio alignment
- Negative margins for specific layout corrections
- Fractional values in UI components for fine-tuning
- **Do not modify files in `apps/blog/src/components/ui/`** (shadcn/ui components)
