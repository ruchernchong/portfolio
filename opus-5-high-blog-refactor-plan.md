# Audit and Refactor Plan — `ruchern-dev`

> Static audit of the `ruchern.dev` monorepo, plus a phased refactor plan.
> **No implementation was performed.** No tracked file was created, modified or deleted.

---

## Metadata

| Field | Value |
| --- | --- |
| Plan file | `opus-5-high-blog-refactor-plan.md` |
| Model | Opus 5 (`claude-opus-5[1m]`, 1M context) |
| Reasoning effort | `high` — **assumed**; the effort tier was not surfaced to me in-session, so it is inferred from the depth of the run, not read from a setting |
| Subject | `blog-refactor` |
| Date | 31 July 2026 |
| Timezone | `+0800` (Asia/Singapore) |
| Session start | 2026-07-31 18:19:02 |
| Plan written | 2026-07-31 18:33 |
| **Total duration** | **~14 minutes wall clock** |
| Repository | `/Users/ruchernchong/Projects/blog` |
| Branch | `main` |
| HEAD | `4d66c4d` — *Merge pull request #354 from ruchernchong/353-per-source-retry-in-the-registry-sync-workflow-is-unreachable* (2026-07-25 20:18:22 +0800) |
| Working tree at audit start | clean |
| Working tree at audit end | clean (verified via `git status --porcelain`) |

### Environment

| Component | Version |
| --- | --- |
| Node.js | v26.1.0 |
| pnpm | 11.5.3 |
| Turborepo | 2.10.4 |
| Next.js | 16.3.0-preview.5 |
| React | 19.2.4 |
| Biome | 2.5.0 |
| Vitest | ^4.1.5 |
| Drizzle ORM | ^0.45.2 |
| GitHub CLI | 2.96.0 |
| Platform | darwin 27.0.0 |

### Repository scale

| Metric | Count |
| --- | --- |
| Git-tracked files | 653 |
| TypeScript/TSX files (excl. `node_modules`, `.next`) | 333 |
| Source `.ts`/`.tsx` (tracked, excl. tests) | 285 |
| Test files (tracked) | 31 |
| Total source LOC (TS/TSX, excl. skills/generated) | 26,819 |
| Workspaces | 4 — `@workspace/web`, `@workspace/docs`, `@workspace/mcp`, `@workspace/usage` |
| App Router files | 152 |
| `"use client"` components | 43 |
| Runtime dependencies in `apps/web` | 68 |

---

## Tools used

### Claude Code tools

Exactly **one** Claude Code tool was used: **`Bash`**.

| Tool | Invocations | Notes |
| --- | --- | --- |
| `Bash` | 44 issued, 43 executed | 1 rejected by the user (an `npx biome` call; re-issued as `pnpm exec biome` per the session instruction to use `pnpm`/`pnx`) |

Deliberately **not** used, and why:

| Tool | Why not |
| --- | --- |
| `Agent` / subagents | Session instruction: *"Do not call the AgentTool unless the user requested it"* |
| `Workflow` | Session instruction: *"Do not use workflows or deep-research unless the user requested it"* |
| `Read` | Every file inspection was scoped (specific line ranges, greps, structural extracts), so shell reads were more economical than whole-file reads |
| `Edit` / `Write` | Audit only — no implementation requested. (`Write` used once, for this file.) |
| `Skill` (`security:security`, `quality:refactor`, `seo-audit`, `web-design-guidelines`, …) | These belong to the *unexecuted* discovery phase (Part 2), not the static pass |
| MCP servers (`github`, `context7`, `heroui-pro`, `vercel`) | The GitHub MCP tools were unnecessary — `gh` CLI covered CI forensics directly. No library-documentation questions arose |
| `TaskCreate` / `TodoWrite` | Repo standing preference is GitHub issues; and a read-only audit needed no task ledger |

### Command-line tools invoked through Bash

| Category | Tools |
| --- | --- |
| VCS & forge | `git` (`ls-files`, `check-ignore`, `log`, `status`, `rev-parse`, `branch`), `gh` (`run list`, `run view --log-failed`, `run view --job --log`, `api .../actions/jobs/<id>/logs`) |
| Package & build | `pnpm` (`test`, `typecheck`, `build`, `ci`, `exec`), `turbo` (via pnpm scripts), `tsc --noEmit`, `next build`, `next typegen`, `fumadocs-mdx` |
| Quality | `biome check --reporter=summary`, `vitest run` with `@vitest/coverage-v8` |
| Search & inspect | `grep -rn/-rl/-rln`, `find`, `wc -l`, `head`, `tail`, `sed -n`, `diff`, `ls -la/-laT`, `stat`, `date` |
| Scripting | `node -e` — a bespoke dependency-usage scanner (see below) |

### Custom analysis written during the audit

A `node -e` script walked every `.ts`/`.tsx`/`.mjs`/`.js`/`.css` file in `apps/web` and tested each declared dependency against four resolution forms:

```
from "<pkg>"  |  from "<pkg>/…"
require("<pkg>")
@import "<pkg>"     ← catches Tailwind/HeroUI CSS entrypoints
@plugin "<pkg>"     ← catches @tailwindcss/typography
```

This is what produced the unused-dependency list in **P3-15**. Results were then manually triaged for false positives — `sharp`, `posthog-js`, `@vercel/og`, `@vercel/functions`, `dotenv`, `mermaid`, `shiki`, `react-dom` and the `@types/*` packages are reached indirectly (dynamic `import()`, framework-implicit, peer, or type-only) and were **excluded** from the removal list.

### Commands whose output is quoted as evidence

| Command | Result | Duration |
| --- | --- | --- |
| `pnpm typecheck` | ✅ 4/4 packages pass | 25.4s |
| `pnpm test` | ✅ 3/3 packages pass — 29 files, 2 skipped | 11.2s |
| `pnpm build` | ✅ 2/2 packages pass | 49.5s |
| `pnpm exec biome check .` | ❌ 1 error, 32 warnings | 167ms (357 files) |
| `gh api .../actions/jobs/89678256141/logs` | ❌ root cause of CI failure isolated | — |

---

## ⚠️ Caveats and side effects

1. **`pnpm ci` was executed once** (to test whether it was a valid pnpm command — it is, in pnpm 11). It **wiped and reinstalled `node_modules`** across all four workspaces. No tracked file changed; the working tree stayed clean. The reinstall succeeded, and dependencies are in a good state. Flagging it because it altered the local environment.
2. **The reported test-coverage figures understate the problem.** `vitest.config.ts` does not set `coverage.all: true`, so coverage counts only files the tests actually load. The real repo-wide figure is materially lower than the numbers quoted.
3. **This was a static audit.** No browser, no runtime profiling, no database inspection, no Lighthouse. Part 2 lists what that leaves uncovered.
4. **The CI root cause is time-sensitive.** The two offending packages have since aged past the 24-hour cutoff, so a re-run today would likely get further. The *structural* cause remains.

---

# Part 1 — Findings

Baseline: `typecheck` ✅ · `test` ✅ · `build` ✅ · `lint` ❌ · **CI ❌**

## P0 — Broken right now

### P0-1 · CI has failed on every push to `main` for 6 days

Runs `30157283657`, `30157718604`, `30157755749` — all dead in 31–37s at the `Setup` step.

Root cause, from `gh api repos/ruchernchong/blog/actions/jobs/89678256141/logs`:

```
✗ Lockfile failed supply-chain policy check (2002 entries in 6.1s)
[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION] 2 lockfile entries failed verification:
  @emnapi/runtime@1.11.3 was published at 2026-07-25T07:00:03.000Z, within the
                         minimumReleaseAge cutoff (2026-07-24T12:18:46.726Z)
  postcss@8.5.23         was published at 2026-07-24T17:04:11.000Z, within the
                         minimumReleaseAge cutoff (2026-07-24T12:18:46.726Z)
```

`pnpm-workspace.yaml` sets `minimumReleaseAgeStrict: true`. Dependabot merged same-day bumps that violate the repo's own supply-chain policy, and `pnpm ci` (frozen install) rejects the lockfile.

**Consequence:** `lint`, `test` and `build` have not executed in CI since 25 July, and `semantic-release` has not published. The last successful release is version `1.31.0`.

- `.github/actions/setup/action.yml` → `run: pnpm ci`
- `pnpm-workspace.yaml` → `minimumReleaseAgeStrict: true`

### P0-2 · Nothing gates a merge

`.github/workflows/` contains exactly one file: `release.yml`, triggered on `push: main`. There is **no `pull_request` workflow**. CodeQL is the only PR check. Both **Dependabot and Renovate** (`renovate.json`) are active — two bots, one supply-chain policy, and no pre-merge validation of either against it.

### P0-3 · `typecheck` and `format` run in no workflow

Even when `release.yml` works, its `parallel` group runs only `lint`, `test`, `build`. Additionally, `packages/mcp` and `packages/usage` declare no `format` script, so `turbo run format` silently skips two of four workspaces.

## P1 — Architecture

### P1-4 · Circular workspace dependency (`web → mcp → web`)

`apps/web/package.json` depends on `@workspace/mcp`. And `packages/mcp/tsconfig.json`:

```jsonc
"paths": { "@/*": ["../../apps/web/src/*"] }   // hardcoded reach into the app
```

`packages/mcp` imports across that boundary in four files:

| File | Imports |
| --- | --- |
| `src/tools/posts.tools.ts` | `@/lib/post-metadata`, `@/lib/services/cache-invalidation`, `@/schema` |
| `src/tools/media.tools.ts` | `@/lib/services` |
| `src/tools/models.tools.ts` | `@/lib/queries/model-registry`, `@/lib/queries/models`, `@/schema` |
| `src/tools/__tests__/tool-handlers.test.ts` | `@/lib/post-metadata`, `@/lib/services`, `@/schema` |

`packages/mcp/package.json` declares **neither** `@workspace/web` nor the transitive runtime deps it reaches (`@neondatabase/serverless`, `@upstash/redis`, `@aws-sdk/client-s3`). `pnpm mcp` works only via pnpm hoisting — phantom dependencies. `transpilePackages: ["@workspace/mcp", "@workspace/usage"]` in `next.config.ts` and turbo's `transit` node mask the cycle from both toolchains.

**This is the single highest-leverage defect.** `packages/mcp` cannot be built, tested or reasoned about independently.

### P1-5 · Three API paradigms, no rule for choosing

| Paradigm | Location | Scope |
| --- | --- | --- |
| tRPC | `src/server/` | **one** router (`github`) |
| REST | `app/api/studio/*` | 12 route files |
| Server Actions | `app/_actions/` | `series.ts`, `stats.ts` |

Studio client components fetch REST from the browser, in a Next 16 app with `cacheComponents: true`.

### P1-6 · Layering violations

`CLAUDE.md` documents *"Database Layer (`lib/queries/`) — Pure Drizzle ORM queries"*. Nine files bypass it and import `@/schema` directly:

```
app/api/studio/posts/route.ts             app/_actions/series.ts
app/api/studio/posts/[id]/route.ts        app/feed.xml/route.ts
app/api/studio/series/route.ts            app/llms.txt/route.ts
app/api/studio/series/[id]/route.ts       app/(main)/blog/components/featured-posts.tsx
app/api/studio/series/[id]/posts/route.ts app/studio/posts/components/posts-table.tsx
```

### P1-7 · The same form implemented twice, incompatibly

| File | LOC | Approach |
| --- | --- | --- |
| `app/studio/posts/new/components/post-form.tsx` | 462 | `react-hook-form` + `zodResolver` + `newPostSchema` + shared `Studio*Controller` components |
| `app/studio/posts/[id]/edit/components/edit-post-form.tsx` | 505 | raw `useState` + `FormEvent` + `useRef` + hand-written `interface Post` |

~970 lines for one concept, with two divergent validation paths. The `interface Post` in the edit form re-declares fields already derivable from the Drizzle schema.

## P2 — Structure and consistency

### P2-8 · Three component homes, no distinguishing rule

`src/components/` · `src/app/components/` · `src/app/(main)/*/components/`

### P2-9 · Tests decoupled from their subjects

Six tests in `src/components/__tests__/` test components that live elsewhere:

| Test | Subject |
| --- | --- |
| `blog-post.test.tsx` | `app/(main)/blog/components/blog-post.tsx` |
| `featured-posts.test.tsx` | `app/(main)/blog/components/featured-posts.tsx` |
| `like-button.test.tsx` | `app/(main)/blog/components/like-button.tsx` |
| `like-counter.test.tsx` | `app/(main)/blog/components/like-counter.tsx` |
| `view-counter.test.tsx` | `app/(main)/blog/components/view-counter.tsx` |
| `suspense-fallbacks.test.tsx` | (multiple) |

### P2-10 · Duplicated homes for one concern

| Concern | Split across |
| --- | --- |
| Config | `src/config/` **and** `src/lib/config/` |
| Utilities | `src/utils/` **and** `src/lib/` |
| Types | `src/types/index.ts`, `src/types/api.ts`, `src/lib/api/types.ts` |

### P2-11 · Conventions applied partially

- **`.client.tsx` suffix: 9 of 43 `"use client"` files (21%).** Inconsistent is worse than either extreme.
- **Dot-suffixes are arbitrary.** `lib/services/` holds `media.service.ts` and `r2.service.ts` beside `post-stats.ts`, `related-posts.ts`, `popular-posts.ts`, `cache-invalidation.ts`. Same in `lib/config/` (`cache.config.ts`, `r2.config.ts`) versus `config/` (`posthog.ts`, `redis.ts`).

### P2-12 · Same name, two implementations

| File | Kind | Formatting |
| --- | --- | --- |
| `(main)/dashboard/components/last-updated.tsx` | async Server Component | `toLocaleString` + `APP_LOCALE`/`APP_TIME_ZONE` |
| `(main)/usage/components/usage-last-updated.tsx` + `last-updated.client.tsx` | Server shell + Suspense + Client leaf | `date-fns` `formatDistance` + `enGB` |

Both emit the identical `<span className="shrink-0 font-mono text-muted text-sm">`.

The same server-shell/`.client` wrapper split is repeated four more times in `usage/` (`usage-heatmap`, `usage-trend`, `usage-token-mix`, `usage-last-updated`) and once in `dashboard/` (`visits-chart`), with no shared abstraction.

### P2-13 · God files

| File | LOC |
| --- | --- |
| `app/(main)/usage/components/usage-breakdown.tsx` | 861 |
| `packages/mcp/src/tools/posts.tools.ts` | 807 |
| `app/studio/posts/components/posts-table.tsx` | 598 |
| `app/studio/oauth-clients/components/oauth-clients-table.tsx` | 579 |
| `lib/queries/usage.ts` | 563 |
| `app/studio/posts/[id]/edit/components/edit-post-form.tsx` | 505 |
| `app/studio/series/components/series-table.tsx` | 489 |
| `packages/usage/src/registry.ts` | 450 |
| `packages/mcp/src/tools/media.tools.ts` | 446 |

`usage-breakdown.tsx` already contains its own seams — `BreakdownToolbar`, `BreakdownPagination`, `getColumns`, `FilterChip`, `RowVisual`, `ProviderLogo`, `ProviderValue`, `CostValue` — each of which wants its own file.

## P3 — Dead code and dependency debt

### P3-14 · The likes feature is commented-out code across 9 files

`like-button.tsx` · `like-counter.tsx` · `stats-bar.tsx` · `_actions/stats.ts` · `lib/services/post-stats.ts` · `types/index.ts` (`LikesByUser`, `PostStats`) · `lib/config/cache.config.ts` · plus **two entirely commented-out test files** (`__tests__/like-button.test.tsx`, `__tests__/like-counter.test.tsx`, both opening with *"Tests temporarily disabled — likes feature is disabled"*).

### P3-15 · 17 confirmed-unused runtime dependencies

No import anywhere in `apps/web`, verified by the custom scanner and manually triaged:

```
streamdown                      react-resizable-panels    marked
recharts                        next-view-transitions     remark-breaks
embla-carousel                  @better-fetch/fetch       react-aria-components
embla-carousel-react            @icons-pack/react-simple-icons
@number-flow/react              ua-parser-js  +  @types/ua-parser-js
tailwind-merge                  ws            +  @types/ws
tailwind-variants
```

On the last two: **there is no `cn()` utility anywhere in `apps/web`**, despite `CLAUDE.md` instructing *"Use `cn()` utility for conditional class merging."* (`apps/docs/src/lib/cn.ts` exists; the web app has no equivalent.)

### P3-16 · Misplaced dependencies

`vite`, `typescript` and `@types/ua-parser-js` are in `dependencies`, not `devDependencies`.

### P3-17 · Two GitHub clients in one file

`lib/github.ts` (202 lines) instantiates **both** an Apollo Client (`@apollo/client` + `graphql` + `setContext` auth link) for GraphQL **and** `@octokit/rest` for REST. Octokit alone covers both surfaces via `octokit.graphql`.

### P3-18 · 168 tracked-but-gitignored files

`.gitignore` lists `.agents/`, but 167 files under it remain tracked (added before the rule). Also tracked despite being agent scratch: `.deepsec` (10 files), `.beads` (10), `.design-sync` (7), `.codex` (2).

Downstream effect: **the single current Biome *error*** is a formatting complaint about `.deepsec/.claude/settings.local.json`.

### P3-19 · Pre-monorepo leftovers at root

`tsconfig.tsbuildinfo` (2.4 MB) and `next-env.d.ts` sit at the repo root, from before the Turborepo split.

### P3-20 · Catalog under-used and drifting

`pnpm-workspace.yaml` defines a catalog, but `apps/web` pins outside it: `react`, `react-dom`, `@types/react`, `@types/react-dom`, `typescript`, `tailwind-merge`. `tailwind-merge` has already drifted — `^3.4.0` in `apps/web` vs `^3.6.0` in the catalog.

### P3-21 · Two formatters configured

`prettier` + `prettier-plugin-tailwindcss` + root `prettier.config.mjs` coexist with Biome, which is what `lint-staged` actually invokes.

### P3-22 · Turbo remote cache silently failing

```
WARNING failed to contact remote cache: HTTP status client error
(413 Request Entity Too Large) for url (https://vercel.com/api/v8/artifacts/…)
```

The `build` artefact exceeds the upload limit, so remote caching never populates for the most expensive task.

## P4 — Test coverage

### P4-23 · 31 test files for 285 source files

| Workspace | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `@workspace/usage` | 82.82% | 81.42% | 83.87% | 85.31% |
| `@workspace/web` | 51.95% | 44.95% | 49.77% | 52.63% |
| `@workspace/mcp` | 28.04% | 35.34% | 16.66% | 28.04% |

**The web figure is inflated** — without `coverage.all: true`, only files the tests load are counted. Entirely absent from the report: all of `app/studio/**`, all of `app/(main)/blog/components/**`, `media.service.ts`, `r2.service.ts`.

Weakest measured modules:

| Module | Statements |
| --- | --- |
| `lib/queries/posthog.ts` | 0% |
| `schema/schema.ts` | 0% |
| `lib/queries/usage.ts` | 5.49% |
| `lib/api/errors.ts` | 7.14% |
| `app/components/home/animated-counter.tsx` | 7.14% |
| `lib/github.ts` | 20.4% |
| `workflows/sync-model-registry.steps.ts` | 47.82% |
| `lib/logger.ts` | 57.14% |

### P4-24 · All 32 lint warnings are `noExplicitAny` in test files

`lib/services/__tests__/cache-invalidation.test.ts` (6) · `popular-posts.test.ts` (6) · `post-stats.test.ts` (6) · `packages/mcp/.../tool-handlers.test.ts` (14). Mocks typed as `any`.

### P4-25 · Turbo task-graph gaps

`lint` and `test` lack `dependsOn: ["transit"]`, so they can execute against stale workspace dependencies.

## P5 — Security and documentation

### P5-26 · Non-constant-time token comparison

`lib/api/mcp-auth.ts:169`:

```ts
// 3. Fall back to static MCP token.
// TODO(remove): delete this fallback and BLOG_MCP_AUTH_TOKEN once the remote
// MCP server and usage:ingest:prod authenticate via OAuth.
if (token && token === process.env.BLOG_MCP_AUTH_TOKEN) {
  return { type: "token" };
}
```

Two issues: `===` on a secret is not timing-safe, and the branch returns an **unscoped** identity with no owning user or role. The code already flags itself as deprecated.

### P5-27 · `CLAUDE.md` (27 KB) contradicts the codebase

| Claim | Reality |
| --- | --- |
| *"Use `cn()` utility for conditional class merging"* | No `cn()` exists in `apps/web` |
| *"Next.js 16.1 with App Router"* | `16.3.0-preview.5` |
| *"Use `bd` for ALL task tracking"* | Superseded by the standing preference for GitHub issues |

`AGENTS.md` (25 KB) is a near-duplicate — a 262-line diff against `CLAUDE.md`. `apps/web/CLAUDE.md` is 11 bytes; `apps/web/AGENTS.md` is 612 bytes.

### P5-28 · `.gitignore` self-conflict

Line 15 has `!.env.example`, but a bare `.env*` near the bottom overrides it. `apps/web/.env.example` survives tracking only because it predates that rule — a fresh clone-and-add would silently drop it.

---

# Part 2 — Plan to find the rest

The audit above is the **static** half. These gaps remain, ordered by expected yield.

| # | Area | Method / tooling | Looking for |
| --- | --- | --- | --- |
| 1 | Dead exports & files | `knip` | Unreferenced exports and files; cross-check the P3-15 dependency list |
| 2 | Import cycles | `madge --circular`, `dependency-cruiser` | Cycles beyond `mcp ↔ web`, especially inside `apps/web/src` |
| 3 | Bundle weight | `@next/bundle-analyzer` across the 43 client components | Whether `mermaid` (11.15.0), `shiki`, `@mdxeditor/editor` or `cobe` leak into the public bundle |
| 4 | Rendering correctness | `next build` route table + `/_next/mcp` + the `next-dev-loop` skill | `cacheComponents: true` and `partialPrefetching: true` are both on — verify Suspense boundaries and `cacheLife`/`cacheTag` are deliberate. Currently 7 routes are `◐ Partial Prerender`, all in `/studio` |
| 5 | Database | `EXPLAIN ANALYZE` on `lib/queries/usage.ts` (563 LOC, 5% covered); index audit against `src/schema/` | Missing indexes; N+1 in `db.query.posts.findMany({ with: { author: true } })`; Neon egress cost |
| 6 | Cache | Key/TTL inventory across `lib/config/cache.config.ts` and the services | Unbounded keys, missing TTLs, invalidation gaps in `cache-invalidation.ts` |
| 7 | Accessibility | `web-design-guidelines` skill + `agent-browser` on `/blog`, `/usage`, `/studio` | Keyboard traps in the HeroUI `DataGrid`; contrast on the coral OKLCH tokens |
| 8 | Security | `/security-review` on the OAuth 2.1 provider; `gitleaks` over full history | PKCE enforcement, `/consent` flow, hashed-token storage, historical secret leaks |
| 9 | Performance | Lighthouse on `/`, `/blog/[slug]`, `/usage` | LCP impact of the globe (`cobe` + `react-spring`) and the 861-line breakdown grid |
| 10 | Docs drift | Diff `CLAUDE.md`/`AGENTS.md` against `package.json` + actual code | The rest of the P5-27 class of contradiction |

---

# Part 3 — Refactor plan

Seven phases. Each is independently shippable and leaves the repo green. **Phases 0–2 are prerequisites**; 3–6 can be reordered.

## Phase 0 — Make CI trustworthy again

**~0.5 day · blocks everything**

Nothing else is safe to refactor while the quality gates are dark.

1. Regenerate the lockfile: `pnpm clean --lockfile && pnpm install`, clearing the release-age violation.
2. Add `.github/workflows/ci.yml` on `pull_request`, running `lint`, `typecheck`, `test`, `build`. Make all four **required checks** on `main`.
3. Add `typecheck` to the `parallel` group in `release.yml`.
4. Resolve the bot overlap — pick **Dependabot or Renovate**, not both, on a grouped weekly schedule that respects `minimumReleaseAge`. Either raise the age window past the bot's cadence, or set the bot's cooldown to match.
5. Fix the Turbo remote-cache `413` by trimming `build` outputs (`.next/cache/**` is already excluded; the bulk is likely the Turbopack FS cache — `turbopackFileSystemCacheForBuild: true` is enabled).
6. Add `format` scripts to `packages/mcp` and `packages/usage`; add `dependsOn: ["transit"]` to `lint` and `test` in `turbo.json`.

**Exit criteria:** a PR opens → four checks run and pass; a merge to `main` publishes a release.

## Phase 1 — Cut the noise

**~1 day · pure deletion, near-zero risk**

Do this *before* restructuring, so there is less code to restructure.

1. `git rm -r --cached .agents` and untrack `.deepsec`, `.beads`, `.design-sync`, `.codex`. Add the same paths to `biome.json` → `files.includes`, clearing the lone lint error.
2. Delete root `tsconfig.tsbuildinfo` and `next-env.d.ts`.
3. Fix the `.gitignore` `.env*` / `!.env.example` ordering.
4. Remove `prettier`, `prettier-plugin-tailwindcss` and `prettier.config.mjs` — Biome owns formatting.
5. **Decide on likes.** Re-enable it, or delete all nine files plus the `LikesByUser`/`PostStats` types and the `post-stats.ts` like methods. Commented-out code is worse than no code; git has the history.
6. Drop the 17 unused dependencies (P3-15). Move `vite`, `typescript`, `@types/ua-parser-js` to `devDependencies`.
7. Either add a real `cn()` — keeping `tailwind-merge` — or strike the `cn()` line from `CLAUDE.md`. Right now the doc lies.
8. Collapse `lib/github.ts` onto Octokit alone (`octokit.graphql` covers the GraphQL calls), removing `@apollo/client` and `graphql`.

**Expected:** ~19 dependencies gone, 168 files untracked, ~600 lines deleted.

## Phase 2 — Break the `mcp ↔ web` cycle

**~3 days · highest architectural payoff**

Extract the shared core into real packages, not a path alias:

```
packages/db/       Drizzle schema, `db` client, Insert*/Select* types
                     ← moved from apps/web/src/schema/
packages/core/     queries + services: posts, series, media, models, r2
                     ← moved from apps/web/src/lib/{queries,services}
packages/mcp/      depends on @workspace/db + @workspace/core. No @/* alias.
packages/usage/    unchanged
apps/web/          depends on @workspace/db + @workspace/core
```

Sequence, green at every step:

1. Move `src/schema/` → `packages/db`; declare `@neondatabase/serverless` and `drizzle-orm` there; leave `apps/web/src/schema/index.ts` as a re-export shim.
2. Move `lib/queries/` and `lib/services/` → `packages/core`. These are already framework-free **except** for `next/cache` imports (`revalidateTag`, `cacheLife`, `cacheTag`) — isolate those behind a small injected `revalidate` port so `packages/core` stays Next-agnostic and unit-testable without mocking Next.
3. Delete `"@/*": ["../../apps/web/src/*"]` from `packages/mcp/tsconfig.json`; declare real dependencies including the previously phantom `@neondatabase/serverless`, `@upstash/redis`, `@aws-sdk/*`.
4. Delete the shims. Move `drizzle.config.ts` and `migrations/` to `packages/db` (keep `vercel-build` pointing at them).
5. Add a `dependency-cruiser` rule forbidding `packages/*` from importing `apps/*`, and wire it into the Phase 0 CI.

**Exit criteria:** `pnpm --filter @workspace/mcp mcp` runs with no reliance on hoisting; `madge --circular` is clean.

## Phase 3 — One data-access story

**~3 days**

Pick one paradigm and retire the others. Recommended, given Next 16 + `cacheComponents`:

| Concern | Mechanism |
| --- | --- |
| Reads | Server Components calling `packages/core` directly |
| Mutations | Server Actions in `app/_actions/`, one file per resource |
| REST `/api/studio/*` | **Delete**, except where an external client genuinely needs HTTP |
| Keep as HTTP | `/api/mcp`, `/api/usage/ingest`, `/api/auth/[...all]`, `/.well-known/*` |
| tRPC | **Delete** — one router does not justify the layer; `github` becomes a `packages/core` function |

Steps:

1. Convert the Studio tables and forms from client-side `fetch("/api/studio/…")` to Server Components + Server Actions. This alone should substantially shrink `posts-table.tsx` (598), `series-table.tsx` (489) and `oauth-clients-table.tsx` (579) — most of their bulk is fetch/loading/error state.
2. Replace the boilerplate repeated in every surviving handler —
   `const authResult = await requireAdmin(); if (!authResult.success) return authResult.response;`
   — with a `withAdmin(handler)` wrapper.
3. Move the nine files from P1-6 onto `packages/core`.
4. Delete `src/server/`, `@trpc/server`, `@apollo/client`, `graphql`.

**Exit criteria:** `grep -r 'fetch("/api/studio' apps/web/src` returns nothing.

## Phase 4 — Unify the Studio forms

**~2 days**

1. Extract a single `PostForm` from `post-form.tsx` and `edit-post-form.tsx`, keeping the **react-hook-form + `zodResolver`** implementation (the better of the two) and driving create/edit from a `mode` prop plus a shared `postFormSchema` in `packages/core`.
2. Delete the hand-rolled `interface Post` in the edit form — derive from the Drizzle `SelectPost` type.
3. Repeat for the series forms (`series-form.tsx`, `series-form-fields.tsx`, `edit-series-editor.tsx`).

**Expected:** ~970 lines → ~400, with one validation path.

## Phase 5 — Settle the file conventions

**~2 days · mostly mechanical**

Write the rules into `CLAUDE.md` **first**, then apply them:

| Rule | Change |
| --- | --- |
| Components colocate with their route | Merge `src/app/components/` into `src/components/` (shared) or the owning route folder |
| Tests sit beside their subject | Move the six orphaned tests in `src/components/__tests__/` |
| One config home | Merge `src/lib/config/` into `src/config/`; drop the `.config.ts` suffix |
| One util home | Merge `src/utils/` into `src/lib/` |
| One types home | Merge `src/types/api.ts` + `src/lib/api/types.ts` into `src/types/`; derive DB types from `packages/db` |
| No dot-suffixes | `media.service.ts` → `media.ts` — the directory already says `services` |
| `.client.tsx` all or nothing | 21% adoption today. **Recommend dropping it**: `"use client"` is already the first line of the file |
| One `LastUpdated` | Extract to `src/components/last-updated.tsx`, parameterised by format |
| One server/client wrapper pattern | Factor the five repeated `X.tsx` + `X.client.tsx` shells in `usage/` and `dashboard/` into a shared primitive |

Then split the god files. `usage-breakdown.tsx` (861) breaks cleanly along the seams it already contains.

## Phase 6 — Raise the floor on tests

**Ongoing**

1. Set `coverage.all: true` in `vitest.config.ts` so the figure reflects the whole tree. **Expect the web number to fall well below 51%.** That is the real number.
2. Add a ratcheting coverage threshold — start at the honest baseline, forbid regression.
3. Prioritise by risk, not by ease:
   - `lib/api/errors.ts` (7%) — every error path in the app
   - `lib/queries/usage.ts` (5%) — 563 lines, the whole usage pipeline
   - `media.service.ts` and `r2.service.ts` — untested, and they touch R2
   - `lib/queries/posthog.ts` (0%)
   - the OAuth consent flow
   - the Studio Server Actions from Phase 3
4. Type the test mocks properly, clear the 32 `noExplicitAny` warnings, then raise that rule from `warn` to `error`.
5. Finish the `BLOG_MCP_AUTH_TOKEN` removal the code already flags: migrate the remote MCP server and `usage:ingest:prod` to OAuth, then delete the fallback. **Until then, at minimum switch to `crypto.timingSafeEqual`.**

## Phase 7 — Documentation truth

**~0.5 day**

Cut `CLAUDE.md` from 27 KB to what is *not* derivable from `package.json`, `README.md` or `ls`.

**Remove:** the command tables (they are `package.json`), the Beads block (superseded by GitHub issues), stale version numbers, the phantom `cn()` rule.

**Keep** — genuine, non-obvious gotchas:

- the `zod@4` override rationale (`@hookform/resolvers@3` peer resolution)
- the `.well-known/workflow/` proxy-matcher exclusion
- `pnpm db:push` locally, never `pnpm db:migrate`
- the HeroUI render-prop / `buttonVariants()` link pattern
- HeroUI Pro overlays are SSR-unsafe (`document is not defined`)

Make `AGENTS.md` a **symlink** to `CLAUDE.md` rather than a 262-line-divergent copy.

---

## Sequencing and effort

```
Phase 0  CI                ██                    0.5d   ← blocks all
Phase 1  Deletion          ████                  1d
Phase 2  Break cycle       ████████████          3d     ← unblocks 3, 4, 5
Phase 3  Data access       ████████████          3d
Phase 4  Forms             ████████              2d
Phase 5  Conventions       ████████              2d
Phase 6  Tests             ~~~~~~~~~~~~~~~~~~    ongoing
Phase 7  Docs              ██                    0.5d
                                                 ─────
                                                 12d   (0–5 and 7)
```

**Phases 0 and 1 deliver most of the immediate value** — a working pipeline and ~19 fewer dependencies — for a day and a half.

### Dependency graph

```
Phase 0 ──┬─► Phase 1 ──► Phase 2 ──┬─► Phase 3 ──► Phase 4
          │                         ├─► Phase 5
          └────────────────────────►└─► Phase 6 (continuous)

Phase 7 — independent, do last so the docs describe the end state
```

---

## Open decisions (yours, not mine)

1. **Is the likes feature coming back?** Phase 1 step 5 branches on the answer. If it is not, ~9 files of commented-out code should go.
2. **Should the Studio move to Server Actions?** Phase 3 is the largest single chunk. Reversible in principle, expensive to redo.
3. **Dependabot or Renovate?** Both are live. Running both against a strict `minimumReleaseAge` policy is what broke CI.
4. **`.client.tsx` — adopt fully or drop?** Recommendation is to drop; either is better than 21%.

---

<sub>Generated by Claude Code · Opus 5 (1M) · 31 July 2026 · ~14 min · 43 Bash invocations · HEAD `4d66c4d` · no tracked files modified</sub>
