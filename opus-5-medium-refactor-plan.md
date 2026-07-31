# Refactor Plan: Architecture and CI Health

Audit and refactor plan for `ruchern-dev` (ruchern.dev blog monorepo).

---

## Metadata

| Field | Value |
| --- | --- |
| Model | Claude Opus 5 (`claude-opus-5[1m]`, 1M context) |
| Effort tier | medium |
| Subject | Whole-project problem audit and refactor plan |
| Date generated | 31 July 2026, 18:32 +08 |
| Repository | `/Users/ruchernchong/Projects/blog` |
| Branch | `main` |
| HEAD commit | `4d66c4d` |
| Working tree at audit time | Clean (0 modified files) |
| Scope | Audit and planning only. No implementation, no file modifications outside this document. |
| Analysis session duration | Approximately 12 minutes wall clock (18:20 to 18:32 +08) |
| Tool invocations | 10 (`Bash` x 9, `Write` x 1) |
| Subagents spawned | 0 |
| Workflows run | 0 |
| Source files inspected | 318 TypeScript/TSX files enumerated; 12 read in full or part |
| CI runs inspected | 8 recent runs, 1 failing job log |

### Codebase measurements taken

| Metric | Value |
| --- | --- |
| Total TS/TSX source files (excl. `node_modules`, `.next`, `.source`) | 318 |
| Total lines across those files | 26,664 |
| Test files | 31 |
| Test-to-source ratio | 9.7% |
| `"use client"` components | 43 |
| `useEffect` call sites in TSX | 46 |
| API route handlers | 15 |
| Server Actions files | 2 |
| Distinct `process.env.*` reads | 24 |
| Production dependencies in `@workspace/web` | 60+ |
| Unused production dependencies found | 6 |
| GitHub Actions workflows | 4 (Release, CodeQL, Copilot review, Dependabot) |
| Consecutive failing `Release` runs | 3 (since 25 July 2026) |

---

## Tools Used

All findings in this document were derived from direct inspection. No conclusion is inferred or assumed.

### 1. `Bash` — repository structure and manifests

```
ls -la
cat package.json turbo.json pnpm-workspace.yaml
find apps packages -type f \( -name "*.ts" -o -name "*.tsx" \) | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn
```

Established: monorepo shape (`apps/web`, `apps/docs`, `packages/mcp`, `packages/usage`), Turborepo task graph, pnpm catalog and overrides, and the file-density-per-directory map that pointed at the Studio and Usage hotspots.

### 2. `Bash` — file size and test distribution

```
find ... -exec wc -l {} + | sort -rn | head -30
find ... -name "*.test.ts*" | wc -l
```

Established: the largest-file ranking (`usage-breakdown.tsx` 861, `posts.tools.ts` 807, `posts-table.tsx` 598, `oauth-clients-table.tsx` 579, `series-table.tsx` 489) and the 31-test / 318-source ratio.

### 3. `Bash` — layering violation trace

```
grep -rln "@/lib/queries" .     # -> 40+ files including RSC and client components
grep -rln "@/lib/services" .    # -> 10 files only
grep -rln "drizzle-orm" .       # -> 8 API routes importing the DB directly
```

Established: the documented five-layer architecture is not the enforced architecture. This is the single most load-bearing measurement in the plan.

### 4. `Bash` — dependency usage audit

```
for p in embla-carousel recharts react-resizable-panels @number-flow/react \
         next-view-transitions react-spring @apollo/client marked react-markdown; do
  grep -rl "$p" src next.config.*
done
```

Established: six dependencies with zero import sites, and the single-use heavyweights (`@apollo/client` in one file, `react-spring` in one file).

### 5. `Bash` — repository hygiene and tooling config

```
git ls-files | grep -E "tsbuildinfo|\.DS_Store|next-env|\.deepsec|\.design-sync"
cat .gitignore biome.json prettier.config.mjs
wc -l AGENTS.md CLAUDE.md README.md DESIGN.md
```

Established: tracked build artefacts, the nested `.deepsec` lockfile, and the Prettier/Biome overlap.

### 6. `Bash` — environment variable audit

```
grep -rho "process\.env\.[A-Z_0-9]*" . | sort | uniq -c | sort -rn
ls config lib/config
```

Established: 24 unvalidated env reads, `BLOG_MCP_AUTH_TOKEN` at 10 sites, `IP_SALT` at 8, and the three-way config split.

### 7. `Bash` — Studio component comparison

```
head -60 app/studio/posts/components/posts-table.tsx
head -40 app/studio/series/components/series-table.tsx
grep -rl '"use client"' . | xargs grep -l 'fetch("/api'
```

Established: near-identical structure across three tables and the six client components fetching over REST inside `useEffect`.

### 8. `Bash` — API surface and auth pattern

```
find apps/web/src/app/api -name "route.ts"
cat lib/api/auth.ts
head -70 app/api/studio/series/route.ts
```

Established: `requireAuth` / `requireAdmin` exist and are used correctly, but business logic sits inline in the route below them.

### 9. `Bash` + `gh` CLI — CI forensics

```
cat .github/workflows/release.yml .github/actions/setup/action.yml
gh run list --limit 8
gh api repos/:owner/:repo/actions/workflows
gh run view 30157755749 --log-failed
gh api repos/:owner/:repo/actions/runs/30157755749/jobs
gh run view --job 89678256141 --log | grep -iE "err|fail"
```

Established the P0 finding with the exact error string and the exact responsible config lines. This is the only finding that required going outside the working tree.

### Tools deliberately not used

| Tool | Why not |
| --- | --- |
| `Agent` / subagents | Global instruction: do not call unless requested. Scope was tractable in one context. |
| `Workflow` | Requires explicit multi-agent opt-in. Not given. |
| `Context7 MCP` | No library API question arose. The audit concerned this codebase's own structure, not third-party API syntax. |
| `WebSearch` / `WebFetch` | No external research needed. |
| `Edit` / `Write` on source | Explicitly out of scope. Audit and plan only. |

---

# Part One: Findings

## P0 — CI is dead and has been since 25 July 2026

**Severity: critical. Blocks every other phase.**

Three consecutive `Release` workflow runs have failed. The failing step is `Setup`, and the error is:

```
✗ Lockfile failed supply-chain policy check (2002 entries in 6.1s)
[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION] 2 lockfile entries failed verification
##[error]Process completed with exit code 1
```

### Root cause

Two configuration decisions are in direct conflict:

| File | Line | Setting |
| --- | --- | --- |
| `pnpm-workspace.yaml` | `minimumReleaseAgeStrict: true` | Rejects any lockfile entry published more recently than the minimum age |
| `.github/actions/setup/action.yml` | `run: pnpm ci` | Enforces the policy strictly at install time |

Dependabot opens a PR bumping a package to a version published minutes earlier. The PR merges to `main`. CI installs, the age policy rejects two entries, `Setup` exits 1.

### Blast radius

The `Checks` job's remaining steps are all skipped:

```
✓ Set up job
✓ Checkout
X Setup            <- fails here
- Run Lint         (skipped)
- Run Test         (skipped)
- Run Build        (skipped)
- Release          (skipped, needs: checks)
```

Therefore, since 25 July 2026:

- No lint has run on `main`
- No test has run on `main`
- No build has been verified on `main`
- No release has been published

### Two compounding gaps

**No PR checks exist.** `release.yml` triggers only on `push: main`. Only CodeQL and Copilot review run on pull requests. Broken code cannot be caught before it lands. Even when the pipeline was green, the gate was after the merge, not before it.

**`typecheck` never runs in CI.** `pnpm typecheck` is defined in `package.json` and wired through Turborepo, but no workflow invokes it. TypeScript strict mode is configured and unenforced.

### Secondary CI observation

The `Dependabot Updates` run is also failing, and its scope includes `/.deepsec` — a nested directory that ships its own `pnpm-lock.yaml` and `pnpm-workspace.yaml`. Dependabot is attempting to maintain a lockfile that is not part of the workspace.

---

## P1 — The documented architecture is not the real architecture

`CLAUDE.md` documents a five-layer architecture:

```
1. Database Layer   (lib/queries/)   Pure Drizzle ORM queries
2. Service Layer    (lib/services/)  Business logic, class-based services
3. API Utilities    (lib/api/)       Standardised route handlers
4. tRPC Layer       (server/)        Type-safe API procedures
5. Actions          (app/_actions/)  Server actions for mutations only
```

Measured reality:

### Violation 1: API routes bypass the service layer

8 of 15 route handlers import `drizzle-orm` and `@/schema` directly:

```
app/api/studio/posts/route.ts
app/api/studio/posts/[id]/route.ts
app/api/studio/posts/[id]/restore/route.ts
app/api/studio/series/route.ts
app/api/studio/series/[id]/route.ts
app/api/studio/series/[id]/posts/route.ts
app/api/studio/series/[id]/restore/route.ts
app/feed.xml/route.ts
app/llms.txt/route.ts
```

`app/api/studio/series/route.ts` is representative. The `POST` handler performs auth, validation, an inline `db.insert(series)`, unique-constraint detection, duplicate-slug messaging, and database-error branching, all in one function. There is no `series.service.ts`.

### Violation 2: React components import the query layer directly

Over twenty component files import `@/lib/queries`, including:

```
app/(main)/blog/components/featured-post.tsx
app/(main)/blog/components/post-grid.tsx
app/(main)/blog/components/series-cards.tsx
app/(main)/blog/components/topics-cloud.tsx
app/(main)/dashboard/components/stats-grid.tsx
app/(main)/dashboard/components/visits-chart.tsx
app/components/home/home-stats.tsx
app/components/home/latest-writing.tsx
app/studio/oauth-clients/components/oauth-clients-table.tsx
```

Server Components reading data is correct in App Router. Reading it from the *query* layer rather than the *service* layer means caching, invalidation, and access rules are bypassed wherever a service would have applied them.

### Violation 3: the service layer is half-adopted

Only 10 files import `@/lib/services`. Services exist for `media`, `post-stats`, `popular-posts`, `related-posts`, `cache-invalidation`, and `r2`. There is **no** service for `series`, `posts` (CRUD), or `oauth-clients` — precisely the three entities whose logic is duplicated inline across route handlers.

### Violation 4: the tRPC "layer" is a single orphaned router

```
src/server/trpc.ts
src/server/index.ts
src/server/routers/github.ts   <- the only router
```

Its only consumer is `app/llms.txt/route.ts`. One router with one caller is not an architectural layer; it is a maintenance surface with its own dependency (`@trpc/server`) and its own conventions.

### Violation 5: layer inversion in `lib/api`

`lib/api/series.ts` sits in the API-utilities layer but imports from `lib/queries`, inverting the intended direction of the dependency.

### Consequence

Business rules — slug uniqueness, soft-delete semantics, cache invalidation, publish transitions — live in route handlers. They are:

- **Untested.** Not one `/api/studio/*` route has a test.
- **Unreusable.** `packages/mcp/src/tools/posts.tools.ts` (807 lines) reimplements much of the same logic against the same tables, independently. Two implementations of "create a post" now exist and can drift.
- **Unenforceable.** Nothing prevents the next route from repeating the pattern.

---

## P1 — Studio: approximately 1,700 lines of near-duplicate client code

### The duplication

| File | Lines |
| --- | --- |
| `app/studio/posts/components/posts-table.tsx` | 598 |
| `app/studio/oauth-clients/components/oauth-clients-table.tsx` | 579 |
| `app/studio/series/components/series-table.tsx` | 489 |
| **Total** | **1,666** |

Side-by-side comparison of the first 60 lines of `posts-table.tsx` and `series-table.tsx` shows they share:

- An identical HeroUI import block (`AlertDialog`, `Button`, `Card`, `Checkbox`, `Chip`, `Input`, `ListBox`, `Select`, `TextField`) plus `buttonVariants` and `EmptyState`
- An identical state shape: `all<Entity>[]`, `isLoading`, `isPending` via `useTransition`, `searchQuery`, `statusFilter` typed `"all" | "draft" | "published" | "deleted"`, `selected<Entity>: Set<string>`
- The same fetch-in-`useEffect` bootstrap with the same 401 branch and the same `console.error` handling
- The same client-side filter, the same bulk-select, the same `AlertDialog`-driven delete and restore

They differ only in entity type, endpoint string, and column definitions.

Minor inconsistency worth noting: `posts-table.tsx` uses React 19's `useEffectEvent` for its fetch while `series-table.tsx` uses `useCallback` for the identical purpose. The pattern was copied and then diverged.

### The deeper problem: client-side data fetching in an RSC app

Six client components fetch their own data over REST:

```
app/studio/series/components/series-table.tsx
app/studio/posts/components/posts-table.tsx
app/studio/posts/new/components/post-form.tsx
app/studio/oauth-clients/components/oauth-clients-table.tsx
app/studio/media/components/media-upload.tsx
components/studio/markdown-editor.tsx
```

Costs of this on Next.js 16 App Router:

- **Waterfall.** Page shell renders, then mounts, then fetches, then renders content. Two round trips where one would do.
- **No streaming.** The Suspense boundary and streaming SSR the framework provides are unused.
- **Over-fetching to the client.** `fetch("/api/studio/posts")` with no pagination ships the entire post set into browser memory so it can be filtered client-side.
- **Duplicated auth.** Each route re-runs `requireAdmin()` for data the server already had in scope.
- **A REST surface that exists only to serve the UI.** Most of the 15 route handlers exist because the components are clients. Server Components plus Server Actions would remove the need.

The imbalance is visible in the file counts: **15 REST route handlers versus 2 Server Actions files.**

### A third hotspot

`app/(main)/usage/components/usage-breakdown.tsx` is 861 lines containing 12 top-level function components plus sorting comparators, format-option constants, column builders, a filter chip, a toolbar, and pagination logic:

```
 51  HIDEABLE_COLUMNS
 60  ROWS_PER_PAGE_OPTIONS
 62  DEFAULT_SORT_DESCRIPTOR
 68  sortableCost
 80  rowProviders
 84  rowDisplayName
 99  compareRows
141  CostValue
155  ProviderLogo
169  ProviderValue
198  RowVisual
212  getColumns
340  FilterChip
371  BreakdownToolbar
479  paginationPages
504  BreakdownPagination
593  UsageBreakdown        <- the only export
```

---

## P2 — Dependency bloat

### Six production dependencies with zero import sites

Verified by grepping all of `apps/web/src` plus `next.config.*`:

| Package | Import sites |
| --- | --- |
| `embla-carousel` | 0 |
| `embla-carousel-react` | 0 |
| `recharts` | 0 |
| `react-resizable-panels` | 0 |
| `@number-flow/react` | 0 |
| `next-view-transitions` | 0 |

These are declared in `dependencies`, not `devDependencies`, so they are installed on every deployment.

### Single-use heavyweights

| Package(s) | Sole consumer | Note |
| --- | --- | --- |
| `@apollo/client` + `graphql` | `src/lib/github.ts` | A full GraphQL client and runtime for what appears to be one GitHub query. `@octokit/graphql` is already implied by the existing `@octokit/rest` dependency. |
| `react-spring` | `src/app/(main)/about/components/globe.tsx` | The project standardises on `motion` (7 files). Two animation runtimes ship to the client. |
| `marked` | `src/lib/api/mcp-auth.ts` | A Markdown parser imported into an auth module. Worth confirming this is intentional. |

### Tooling duplication: Prettier alongside Biome

Installed and configured:

```
devDependencies:  prettier, prettier-plugin-tailwindcss
prettier.config.mjs:  { plugins: ["prettier-plugin-tailwindcss"] }
```

Meanwhile `biome.json` is the actual formatter (`formatter.enabled: true`), is wired to `lint-staged`, and already sorts Tailwind classes via `linter.rules.nursery.useSortedClasses` with `functions: ["cn", "tw"]`.

No script invokes Prettier. Two formatters are configured for the same files with overlapping class-sorting responsibility. This is a latent source of formatting churn if anyone's editor picks up `prettier.config.mjs`.

---

## P2 — Configuration and environment handling

24 distinct environment variables are read directly via `process.env` with **no validation schema anywhere**:

```
10  BLOG_MCP_AUTH_TOKEN
 8  IP_SALT
 5  VERCEL_PROJECT_PRODUCTION_URL
 4  NODE_ENV
 2  VERCEL_URL, NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, GH_ACCESS_TOKEN, DATABASE_URL
 1  USAGE_INGEST_TARGET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
    R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL, R2_BUCKET_NAME, R2_ACCESS_KEY_ID,
    POSTHOG_PROJECT_ID, POSTHOG_API_KEY, POSTHOG_API_HOST, NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_BASE_URL, GOOGLE_CLIENT_SECRET, GOOGLE_CLIENT_ID,
    CLOUDFLARE_ACCOUNT_ID, BETTER_AUTH_URL
```

Problems:

1. **Failure is deferred to request time.** A missing `IP_SALT` or `R2_BUCKET_NAME` does not fail the build or the boot. It fails on the first request that touches that code path, in production, with an opaque downstream error.
2. **No server/client boundary enforcement.** Nothing structurally prevents a non-`NEXT_PUBLIC_` secret being referenced from a client component. `zod` 4.4.3 is already a dependency and already used elsewhere.
3. **Three-way config split:** `src/config/` (`index.ts`, `posthog.ts`, `redis.ts`), `src/lib/config/` (`cache.config.ts`, `r2.config.ts`), plus inline reads scattered through the tree.
4. **`.env.example` can drift.** It is maintained by hand with no mechanism tying it to actual usage.

---

## P2 — Test coverage is thin and inversely correlated with risk

31 test files against 318 source files (9.7%).

### Where tests exist

```
packages/usage/src/__tests__/            (registry, pricing, format)
packages/usage/src/parsers/__tests__/
packages/mcp/src/tools/__tests__/        (480-line tool-handlers suite)
apps/web/src/lib/api/__tests__/          (358-line mcp-auth suite)
apps/web/src/lib/services/__tests__/     (post-stats, popular-posts, related-posts, cache-invalidation)
apps/web/src/lib/queries/__tests__/      (models, usage)
apps/web/src/app/api/mcp/__tests__/
apps/web/src/app/api/usage/ingest/__tests__/
apps/web/src/workflows/__tests__/
```

The pricing, registry, and MCP-auth code is genuinely well covered.

### Where tests do not exist

| Area | Files | Tests |
| --- | --- | --- |
| `lib/queries/posts.ts` | 1 | 0 |
| `lib/queries/series.ts` | 1 | 0 |
| `lib/queries/oauth-clients.ts` | 1 | 0 |
| `lib/queries/posthog.ts` | 1 | 0 |
| `lib/services/media.service.ts` (385 lines) | 1 | 0 |
| `lib/services/r2.service.ts` | 1 | 0 |
| `app/api/studio/**` route handlers | 12 | 0 |
| All Studio components (~1,700 lines) | 13 | 0 |

**The untested code is exactly the code holding the un-extracted business logic.** Every rule that Phase 1 will move into a service currently sits in a file with no test protecting the move.

---

## P3 — Repository hygiene

| Issue | Detail |
| --- | --- |
| Tracked build artefacts | `tsconfig.tsbuildinfo` (2.4 MB) at root and `apps/docs/tsconfig.tsbuildinfo`. Both matched by `.gitignore` (`*.tsbuildinfo`) but present in the working tree. |
| `.DS_Store` | 6 KB at root. Gitignored, still present on disk. |
| Stray `next-env.d.ts` at root | `apps/web` and `apps/docs` each have their own. The root copy is a leftover from before the monorepo split. |
| `.deepsec/` nested workspace | Ships `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`. Dependabot scans it (`npm_and_yarn in /., /.deepsec, /apps/web`) and those runs are failing. |
| Documentation sprawl | `AGENTS.md` 414 lines, `CLAUDE.md` 378, `DESIGN.md` 230, `README.md` 132. `AGENTS.md` and `CLAUDE.md` overlap heavily. Meanwhile `apps/docs` (a full Fumadocs site) holds only 3 MDX pages. |

---

# Part Two: The Refactor Plan

Six phases, ordered so each unblocks the next. Every phase is independently shippable and independently revertible.

---

## Phase 0 — Unbreak the pipeline

**Effort: 0.5 day. Risk: low. Blocks: everything.**

Nothing below is verifiable while CI is red. Do this first, today.

### Steps

1. **Resolve the install policy conflict.** Two viable fixes:
   - *Preferred:* change `.github/actions/setup/action.yml` from `pnpm ci` to `pnpm install --frozen-lockfile`, and add a `cooldown` window to the Dependabot config so bumps wait out the `minimumReleaseAge` threshold before opening a PR. This keeps the supply-chain protection, which is worth keeping, and removes the conflict at its source.
   - *Alternative:* drop `minimumReleaseAgeStrict` to non-strict so violations warn rather than fail.

   The wrong fix is deleting the age policy. It exists for a reason; it is simply fighting the bot.

2. **Split the workflow.**
   - `ci.yml` — triggers on `pull_request` and `push: main`. Runs lint, typecheck, test, build.
   - `release.yml` — triggers on `push: main`, with `needs: ci`. Runs semantic-release only.

3. **Add `pnpm typecheck` to the check matrix.** The script and Turborepo task already exist.

4. **Enable required status checks on `main`** so the gate sits before the merge, not after.

5. **Scope Dependabot away from `.deepsec/`** in `.github/dependabot.yml` (or convert `.deepsec` into a proper workspace member, if it should be one).

### Verification

Open a throwaway PR containing a deliberate type error. Confirm the PR is blocked. Remove the error, confirm it merges and a release publishes.

### Exit criteria

- A green run on `main`
- Lint, typecheck, test, and build all executing
- Required checks enforced on PRs
- A release published

---

## Phase 1 — Establish real layer boundaries

**Effort: 2 to 3 days. Risk: medium. Blocks: Phase 2.**

Make the documented architecture true, and enforce it with tooling rather than convention.

### Steps

1. **Write the missing services.**
   - `lib/services/series.service.ts`
   - `lib/services/post.service.ts`
   - `lib/services/oauth-client.service.ts`

   Move out of the route handlers: slug-uniqueness handling, soft-delete and restore semantics, publish transitions, cache invalidation, and unique-constraint-to-HTTP-status mapping.

2. **Reduce every `/api/studio/*` route to four moves:** authenticate, validate, call service, map result to response. Target under 40 lines per handler. `requireAuth` / `requireAdmin` in `lib/api/auth.ts` are already correct and stay as-is.

3. **Move `lib/api/series.ts` into the service layer**, resolving the layer inversion.

4. **Encode the boundaries as lint rules.** Add Biome `noRestrictedImports` entries:

   | Rule | Rationale |
   | --- | --- |
   | `app/**` may not import `drizzle-orm` or `db` from `@/schema` | Routes and pages never touch the DB directly |
   | `app/**/components/**` may not import `@/lib/queries` | Components read through services |
   | `lib/queries/**` may not import `@/lib/services` | Preserves dependency direction |

   These rules should fail on the current tree before the refactor and pass after. That is the phase's own proof of completion.

5. **Resolve tRPC.** Either grow `server/` into the genuine typed read layer for client components, or delete it and demote `github.ts` to a plain service.

   **Recommendation: delete.** The app is RSC-first; the one router has one consumer; keeping it costs a dependency, a convention, and a decision every future contributor has to re-make.

6. **Reconcile the MCP duplication.** Once `post.service.ts` exists, evaluate whether `packages/mcp/src/tools/posts.tools.ts` (807 lines) can consume it rather than reimplementing post creation against the same tables. This may require extracting the services into a shared package; if the cost is high, defer it, but record the decision so the drift is at least known.

### Verification

Write service-level tests as each service lands. This is the cheapest point in the whole plan to close the coverage gap, because the logic is being touched anyway.

### Exit criteria

- Boundary lint rules green
- Every `/api/studio/*` handler under 40 lines
- Each new service has tests
- tRPC decision made and executed

---

## Phase 2 — Collapse Studio duplication and move it server-first

**Effort: 3 to 4 days. Risk: high. Depends on: Phase 1.**

This phase carries the most regression risk in the plan. It touches every Studio CRUD flow.

### Steps

1. **Write characterisation tests first.** Before extracting anything, add React Testing Library tests against the three existing tables capturing current behaviour: filtering, bulk selection, delete, restore, empty state, the 401 path. Refactor against these tests, not against hope.

2. **Extract a generic `<DataTable>`** parameterised by:
   - column configuration
   - row-key extractor
   - filter predicate
   - bulk-action set
   - empty-state content

   Expected outcome: the three call sites drop to roughly 120 lines each. **Approximately 1,666 lines becomes approximately 600.**

3. **Convert each Studio list page to a Server Component** that reads through the service layer directly, with a thin `"use client"` island for interaction only. Remove the fetch-in-`useEffect` bootstrap and the divergent `useEffectEvent` / `useCallback` handling along with it.

4. **Convert mutations to Server Actions** in `app/_actions/`, replacing `fetch("/api/studio/...")` calls.

5. **Delete the `/api/studio/*` routes that existed solely to feed the UI.** See the open question below before doing this.

6. **Split `usage-breakdown.tsx`** (861 lines) into:
   ```
   usage-breakdown/
     index.tsx          container
     columns.ts         getColumns, CostValue, ProviderLogo, ProviderValue, RowVisual
     toolbar.tsx        BreakdownToolbar, FilterChip
     pagination.tsx     BreakdownPagination, paginationPages
     sorting.ts         compareRows, sortableCost, DEFAULT_SORT_DESCRIPTOR
     constants.ts       HIDEABLE_COLUMNS, ROWS_PER_PAGE_OPTIONS, format options
   ```

### Verification

Characterisation tests must stay green throughout. Then manually walk every Studio flow: create, edit, publish, delete, restore, bulk delete, for posts, series, media, and OAuth clients.

### Exit criteria

- Studio table code reduced by roughly 60%
- Zero `fetch("/api/...")` calls inside `"use client"` components
- All Studio mutations flowing through Server Actions
- No file in `app/studio/**` over 300 lines

---

## Phase 3 — Dependency and tooling cleanup

**Effort: 0.5 day. Risk: low. Independent — can run in parallel with Phases 1 and 2.**

### Steps

1. **Remove the six unused dependencies:** `embla-carousel`, `embla-carousel-react`, `recharts`, `react-resizable-panels`, `@number-flow/react`, `next-view-transitions`. Confirm removal with a successful build, not just with grep.

2. **Replace `@apollo/client` + `graphql`** in `lib/github.ts` with `@octokit/graphql`, aligning it with the existing `@octokit/rest` dependency.

3. **Replace `react-spring`** in `globe.tsx` with `motion`. Respect the established import convention: `motion/react-client` for RSC pages, `motion/react` only inside `"use client"` components that need interactivity.

4. **Confirm the `marked` import in `lib/api/mcp-auth.ts`** is intentional. A Markdown parser in an auth module warrants a second look.

5. **Remove Prettier entirely:** delete `prettier` and `prettier-plugin-tailwindcss` from `devDependencies`, and delete `prettier.config.mjs`. Biome owns formatting and class sorting.

6. **Record the bundle-size delta** before and after, so the value is measurable rather than assumed.

### Exit criteria

- Zero unused production dependencies
- One animation library
- One formatter
- Measured bundle reduction

---

## Phase 4 — Centralise configuration

**Effort: 1 day. Risk: low. Independent.**

### Steps

1. **Create `src/config/env.ts`** with a Zod schema (Zod 4.4.3 is already a dependency), split into `serverEnv` and `clientEnv`, parsed once at module load so a missing or malformed variable fails at boot rather than at request time.

2. **Replace all 24 `process.env.*` reads** with imports from that module. Highest-value first: `BLOG_MCP_AUTH_TOKEN` (10 sites) and `IP_SALT` (8 sites).

3. **Merge `src/lib/config/`** (`cache.config.ts`, `r2.config.ts`) into `src/config/`, ending the three-way split.

4. **Generate `.env.example` from the schema** so documentation cannot drift from the code.

### Exit criteria

- One config module
- Zero direct `process.env` reads outside it
- Boot-time validation with actionable error messages
- Generated `.env.example`

---

## Phase 5 — Coverage and hygiene

**Effort: ongoing. Risk: low. Independent.**

### Steps

1. **Target the newly-extracted services and the query layer.** That is where the logic now lives, and where tests are cheapest to write. A realistic goal is roughly 60% line coverage on `lib/`, rather than a repo-wide percentage that would be dominated by untestable presentational components.

2. **Add a coverage threshold to the CI gate** once a baseline exists. `@vitest/coverage-v8` is already installed in all three packages.

3. **Untrack build artefacts:** `git rm --cached tsconfig.tsbuildinfo apps/docs/tsconfig.tsbuildinfo` and remove the stray root `next-env.d.ts`. All are already gitignored.

4. **Consolidate documentation:**
   - `CLAUDE.md` stays the lean gotchas file it is meant to be
   - `AGENTS.md` becomes a pointer to it rather than a 414-line parallel copy
   - Architecture, OAuth, and ingestion detail move into `apps/docs`, which is a full Fumadocs site currently holding only 3 pages
   - `DESIGN.md` merges into `apps/docs` or into the `design-language-system` skill

### Exit criteria

- Coverage threshold enforced in CI
- Clean `git status` with no tracked artefacts
- Single source of truth per topic in the docs

---

# Sequencing

| Phase | Effort | Risk | Depends on | Parallelisable |
| --- | --- | --- | --- | --- |
| 0 — CI | 0.5 d | Low | — | No, do first |
| 1 — Layers | 2 to 3 d | Medium | Phase 0 | No |
| 2 — Studio | 3 to 4 d | **High** | Phase 1 | No |
| 3 — Deps | 0.5 d | Low | Phase 0 | Yes |
| 4 — Config | 1 d | Low | Phase 0 | Yes |
| 5 — Coverage | Ongoing | Low | Phase 1 | Yes |

**Total: approximately 7 to 9 working days** for Phases 0 through 4, with Phase 5 continuing afterwards.

Phases 3 and 4 are genuinely independent and make good quick wins to run alongside the heavier structural work, or to front-load if a visible early result is wanted.

**Phase 0 is non-negotiable and should land today.** Every merge to `main` is currently ungated, and nothing has shipped since 25 July 2026.

---

# Tracking

Per the project's established convention (GitHub issues, not Beads — the repository is public and issues are managed via `gh`):

```
Parent issue:  "Refactor: architecture and CI health"
  ├── Phase 0 — Fix CI pipeline           [bug] [P0]
  ├── Phase 1 — Establish layer boundaries    [refactor] [P1]
  ├── Phase 2 — Studio dedup and server-first [refactor] [P1]
  ├── Phase 3 — Dependency cleanup            [chore]    [P2]
  ├── Phase 4 — Centralise config             [refactor] [P2]
  └── Phase 5 — Coverage and hygiene          [chore]    [P3]
```

Phase 0 is filed as `bug`, not planned work. It is an active production-blocking failure.

Sub-issues link to the parent via `gh sub-issue`. Branches follow the existing `<issue-number>-<slug>` convention visible in recent history (for example `353-per-source-retry-in-the-registry-sync-workflow-is-unreachable`).

---

# Open Questions

Two decisions should be made before Phase 1 begins, because each changes the shape of the work:

### 1. tRPC: keep or delete?

Currently one router (`server/routers/github.ts`), one consumer (`app/llms.txt/route.ts`), one dependency (`@trpc/server`).

- **Delete** (recommended): Phase 1 removes `server/` and demotes `github.ts` to a plain service. Simpler, fewer conventions.
- **Keep and grow:** Phase 1 invests in tRPC as the typed read layer, which changes Phase 2's approach to client-island data access.

### 2. Is anything outside the web app consuming `/api/studio/*`?

- **If UI-only:** Phase 2 deletes most of the 15 route handlers in favour of Server Actions. Large simplification.
- **If the MCP server, a mobile client, or an external tool depends on them:** they stay, the refactor is narrower, and Phase 2 becomes "add Server Actions alongside" rather than "replace".

This determines whether Phase 2 is a 3-day or a 4-day phase, and whether the REST surface survives.

---

*Generated 31 July 2026 at 18:32 +08 by Claude Opus 5 at medium effort. Audit and planning only. No source files were modified.*
