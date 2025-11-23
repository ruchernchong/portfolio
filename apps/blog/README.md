# Personal Portfolio

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fruchernchong%2Fportfolio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Welcome to my portfolio website! Visit the live site at [ruchern.dev](https://ruchern.dev)

## 🚀 Tech Stack

This portfolio is built with modern web technologies:

### Core Framework

- **Next.js 16** - React framework with App Router
- **React 19.2** - Latest React with concurrent features
- **TypeScript** - Type-safe JavaScript with strict mode

### Styling & UI

- **Tailwind CSS v4.0.14** - Utility-first CSS framework
- **Tailwind Typography 0.5.8** - Beautiful typographic defaults
- **Lucide React 0.471.1** - Beautiful & consistent icons
- **Class Variance Authority 0.7.1** - Component variants
- **Framer Motion 12.23.6** - Animation library

### Content & Data

- **Database-backed MDX** - next-mdx-remote for MDX compilation
- **MDX** - Markdown with JSX components
- **Neon PostgreSQL** - Serverless Postgres database
- **Drizzle ORM 0.38.3** - Type-safe database toolkit
- **Upstash Redis 1.34.3** - Serverless Redis for caching and analytics
- **Better Auth 1.3.28** - Authentication with OAuth providers (GitHub, Google)
- **tRPC 11.4.2** - End-to-end type-safe API layer

### Analytics & Monitoring

- **Custom Analytics** - Privacy-focused visitor tracking
- **Vercel Analytics** - Web vitals and performance
- **Vercel Speed Insights** - Real user monitoring

### Development & Testing

- **Vitest 4.0.3** - Fast unit testing framework with coverage (v8)
- **Testing Library 16.3.0** - React component testing
- **Biome 2.2.6** - Fast linting and formatting (replaces ESLint + Prettier)
- **TypeScript 5.2.2** - Strict mode type checking
- **Husky 9.1.6** - Git hooks for commit quality
- **lint-staged 15.5.2** - Run linters on staged files
- **Turbo 2.6.1** - Monorepo build orchestration

### Deployment & Infrastructure

- **Vercel** - Deployment platform with automated migrations
- **Vercel Analytics 1.5.0** - Web vitals and performance monitoring
- **Vercel Speed Insights 1.2.0** - Real user monitoring
- **semantic-release 25.0.1** - Automated versioning and changelog
- **commitlint 19.8.1** - Enforce conventional commit messages

## 🛠️ Getting Started

### Prerequisites

- **Node.js 18.x or higher** - JavaScript runtime (recommended: v22+)
- **pnpm 10.22.0** - Fast, disk space efficient package manager (exact version required)
- **Git** - Version control system
- **Neon PostgreSQL database** - Serverless Postgres (sign up at [neon.com](https://neon.com))
- **Upstash Redis** - Serverless Redis for caching (sign up at [upstash.com](https://upstash.com))
- **GitHub/Google OAuth apps** - For authentication (optional, required for `/studio` CMS access)

### Installation

1. Clone the repository

```bash
git clone https://github.com/ruchernchong/portfolio.git
```

2. Navigate to the project directory

```bash
cd portfolio
```

3. Install dependencies

```bash
pnpm install
```

4. Set up environment variables

```bash
cd apps/blog
cp .env.example .env
```

5. Update the `.env` file with your configuration:
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` - From Upstash
   - `GH_ACCESS_TOKEN` - GitHub personal access token
   - `IP_SALT` - Random string for IP hashing
   - OAuth credentials (optional, for `/studio` CMS):
     - `BETTER_AUTH_SECRET` - Random secret string
     - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
     - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

6. Return to project root and set up the database

```bash
cd ../..
pnpm db:migrate
```

7. (Optional) Seed the database with sample data

```bash
pnpm db:seed
```

8. Start the development server

```bash
pnpm dev
```

Your site should now be running at `http://localhost:3000`!

### Accessing the CMS

If you've configured OAuth providers, you can access the Content Studio at `http://localhost:3000/studio` to manage blog posts through the web interface.

## 🧪 Development Workflow

### Available Scripts

#### Development (run from project root)
```bash
pnpm dev              # Start dev server with hot reload + Drizzle Studio
pnpm build            # Build all apps for production
pnpm start            # Start production server
pnpm test             # Run tests across all apps
pnpm test:coverage    # Generate coverage reports
pnpm lint             # Run linting across all apps with Biome
pnpm format           # Format code with Biome
```

#### Database Management (run from project root)
```bash
pnpm db:generate      # Generate migrations from schema
pnpm db:migrate       # Run database migrations
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio for database management
pnpm db:seed          # Seed database with test data
```

#### Quality & Release
```bash
pnpm release          # Create semantic release with conventional commits
```

For more commands, see the [CLAUDE.md](CLAUDE.md) file.

### Testing Strategy

- **Unit Tests**: Components and utilities with Vitest
- **Coverage Reports**: Generated in `coverage/` directory
- **Test Location**: Tests located in `__tests__/` directories alongside components

### Code Style

- **Language**: English (Singapore) for all content and documentation
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → `apps/blog/src`)
- **File Naming**: kebab-case for filenames
- **Components**: Functional components with hooks
- **Exports**: Named exports preferred over default exports
- **Linting**: Biome handles both linting and formatting
- **Commits**: Conventional commits enforced via commitlint + Husky


## 📁 Project Structure

This is a Turborepo monorepo with the following structure:

```
portfolio/
├── apps/
│   └── blog/                    # Main Next.js application
│       ├── src/
│       │   ├── app/            # Next.js App Router pages and API routes
│       │   │   ├── (auth)/     # Authentication routes (login)
│       │   │   ├── (blog)/     # Main blog routes
│       │   │   │   └── _actions/ # Server actions (mutations only)
│       │   │   ├── (studio)/   # CMS routes at /studio
│       │   │   ├── api/        # API routes (studio, auth)
│       │   │   ├── feed.xml/   # RSS feed route handler
│       │   │   └── llms.txt/   # LLM SEO route handler
│       │   ├── components/     # Reusable React components
│       │   ├── lib/           # Utility functions and integrations
│       │   │   ├── queries/   # Pure database queries (Drizzle)
│       │   │   └── services/  # Business logic & caching
│       │   ├── schema/        # Drizzle database schema
│       │   │   ├── posts.ts   # Blog posts table
│       │   │   ├── sessions.ts # Analytics sessions
│       │   │   └── auth.ts    # Better Auth tables
│       │   └── utils/         # Helper functions with tests
│       ├── migrations/        # Database migration files
│       └── drizzle.config.ts  # Drizzle configuration
└── turbo.json                # Turborepo task orchestration
```

## 🏗️ Architecture

### Service Layer Design

This application follows a **class-based service architecture** for better testability, maintainability, and error resilience:

#### Core Services (`lib/services/`)

**`CacheService`** - Redis Operations Wrapper
- Wraps all Redis operations with error handling
- Returns null/defaults on failures (graceful degradation)
- Logs errors with structured ERROR_IDS for monitoring
- Provides health check for Redis availability
- Methods: `get`, `set`, `del`, `zadd`, `zrange`, `zrem`, `isHealthy`

**`PostStatsService`** - Statistics Management
- Tracks view counts and likes per user
- Updates cache and popular posts sorted set atomically
- Uses React `cache()` for request-level deduplication
- Aggregates total likes across all users
- Integrates with analytics dashboard

**`PopularPostsService`** - Popular Posts Tracking
- Maintains Redis sorted set of posts by view count
- Fetches top N posts with scores
- Merges Redis data with database post details
- Falls back to recent published posts if Redis unavailable
- Handles sorted set operations (add, remove, update score)

**`RelatedPostsCalculator`** - Smart Recommendations
- Implements **Jaccard similarity algorithm** for tag matching
- Formula: `J(A,B) = |A ∩ B| / |A ∪ B|` (intersection over union)
- Caches results for 24 hours to reduce computation
- Filters posts below minimum similarity threshold (0.1)
- Returns posts sorted by similarity score (0.0 to 1.0)

**`CacheInvalidationService`** - Cache Management
- Invalidates post caches on content updates
- Clears related post caches when tags change
- Removes posts from popular sorted set on deletion
- Invalidates all posts with overlapping tags
- Integrated into studio API PATCH/DELETE handlers

#### Configuration (`lib/config/cache.config.ts`)

Centralized cache settings:
```typescript
POPULAR_POSTS: { LIMIT: 5, FALLBACK_LIMIT: 10 }
RELATED_POSTS: { LIMIT: 4, TTL: 86400, MIN_SIMILARITY: 0.1 }
POST_STATS: { TTL: 3600 }
REDIS_KEYS: {
  POPULAR_SET: "posts:popular",
  POST_STATS: (slug) => `post:${slug}`,
  RELATED_CACHE: (slug) => `post:${slug}:related`
}
```

#### Architecture Benefits

- **Error Resilience**: Redis failures don't crash the app
- **Testability**: 57 unit tests with dependency injection
- **Maintainability**: Clear class boundaries and single responsibilities
- **Type Safety**: Full TypeScript support with proper interfaces
- **Observability**: Structured error logging for monitoring
- **Performance**: Request-level caching and fallback strategies

### Layered Architecture

The codebase follows a **3-layer architecture** for separation of concerns:

1. **Database Layer** (`lib/queries/`) - Pure Drizzle ORM queries with zero business logic
2. **Service Layer** (`lib/services/`) - Business logic, caching, Redis operations, data transformations
3. **Action Layer** (`app/(blog)/_actions/`) - React Server Actions for mutations only (no reads)

## 🎯 Key Features

- **📝 Blog System**: Database-backed MDX with syntax highlighting via Shiki and next-mdx-remote 5.0.0
- **✏️ Content Studio**: Web-based CMS at `/studio` for managing blog posts (requires OAuth login)
- **🔥 Popular Posts**: Real-time view tracking with Redis sorted sets (top 5 posts by view count)
- **🔗 Related Posts**: Smart tag-based recommendations using Jaccard similarity algorithm (24hr Redis cache)
- **🔐 Authentication**: Better Auth 1.3.28 with GitHub and Google OAuth providers
- **📊 Analytics Dashboard**: Custom privacy-focused visitor analytics (IP hashing, geolocation, device detection)
- **🤖 LLM SEO**: Dynamic `/llms.txt` endpoint for AI crawler discovery (llmstxt.org standard)
- **📡 RSS Feed**: Auto-generated `/feed.xml` route handler with latest published posts
- **🎨 Dark/Light Mode**: next-themes 0.4.6 with Tailwind CSS theming
- **📱 Responsive Design**: Mobile-first responsive layout with Tailwind CSS v4
- **🔍 SEO Optimized**: Structured data (schema-dts), dynamic sitemaps, OpenGraph image generation
- **⚡ Performance**: Sharp image optimization, Redis caching, React Compiler, Cache Components mode
- **🔒 Privacy-First**: IP address hashing with salt, minimal PII collection
- **🚀 Modern Stack**: Next.js 16.0.0, React 19.2.0, TypeScript 5.2.2 strict mode, tRPC 11.4.2

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📫 Contact

[@ruchernchong](https://twitter.com/ruchernchong)

Project Link: [https://github.com/ruchernchong/portfolio](https://github.com/ruchernchong/portfolio)
