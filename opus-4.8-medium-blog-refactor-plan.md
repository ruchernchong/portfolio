# Blog Monorepo — Problem-Finding & Refactoring Plan

## Metadata

| Field | Value |
|-------|-------|
| Model | Opus 4.8 (`claude-opus-4-8[1m]`, 1M context) |
| Reasoning effort | medium |
| Subject | Full-project problem discovery + refactor strategy |
| Repository | `ruchernchong/blog` (`/Users/ruchernchong/Projects/blog`) |
| Branch | `main` (clean at start) |
| Generated | 2026-07-31 |
| Scope | Analysis only — no implementation, no changes to existing files |
| Deliverable | This plan file (`opus-4.8-medium-blog-refactor-plan.md`) |

### Repository snapshot at time of analysis

| Metric | Value |
|--------|-------|
| Monorepo | pnpm workspaces + Turborepo (`turbo` 2.10.4), `pnpm@11.5.3` |
| Apps | `apps/web` (Next.js `16.3.0-preview.5`, React 19.2), `apps/docs` (Fumadocs) |
| Packages | `@workspace/usage`, `@workspace/mcp`, `packages/db` (phantom — see #2) |
| Web source files | ~263 `.ts`/`.tsx` |
| Test files | 25 (`__tests__/`, Vitest) |
| Tooling | Biome 2.5.0 (lint+format), TypeScript strict, Husky + lint-staged, semantic-release |
| DB / infra | Neon Postgres + Drizzle ORM, Upstash Redis, Cloudflare R2, Better Auth (OAuth provider) |

---

## Tools used to produce this plan

All discovery was done through the `Bash` tool (6 calls). No file edits, no agents, no MCP calls were made.

| Tool | Calls | What it was used for |
|------|-------|----------------------|
| `Bash` | 6 | Inspect root config (`package.json`, `turbo.json`, `pnpm-workspace.yaml`, `biome.json`, `tsconfig`); map `apps/web/src` tree, routes, layers, schema; `wc -l` for largest files; `grep` for code smells (`any`, `console.*`, `TODO`, suppressions); inspect `packages/*` `package.json` + cross-package imports; read `.github/workflows/release.yml`; check `packages/db` contents |
| `Write` | 1 | Create this plan file (the only filesystem write) |

Commands executed inside `Bash` (for reproducibility):
- `ls -la` (root) + `cat` of `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `biome.json`, `tsconfig.json`, `apps/web/package.json`, `apps/web/tsconfig.json`
- `find apps/web/src -maxdepth 2 -type d` and route/layer/schema `find`/`ls`
- `grep -rIn --include='*.ts' --include='*.tsx' -E 'TODO|FIXME|HACK|XXX'` and variants for `: any|as any`, `console.`, `@ts-ignore|@ts-expect-error|biome-ignore`, `eslint-disable`
- `find ... | xargs wc -l | sort -rn | head` (largest files)
- `grep -rIn "from '@/'..."` inside `packages/mcp` + `packages/usage` (inverted-dependency check)
- `cat packages/mcp/package.json packages/usage/package.json`; `find packages/db`
- `cat .github/workflows/release.yml`

### Approximate duration

| Phase of this analysis | Est. active time |
|------------------------|------------------|
| Exploration (6 `Bash` sweeps) | ~4–5 min |
| Synthesis + writing plan | ~4–5 min |
| **Total (est.)** | **~8–10 min** |

> Note: wall-clock timestamps are not exposed to the tool session, so the duration above is an estimate of active working time, not a measured elapsed time.

---

## Part 1 — Concrete problems already found

Confirmed during exploration, with file evidence:

| # | Problem | Evidence | Severity |
|---|---------|----------|----------|
| 1 | **Inverted package dependency.** `packages/mcp` imports app internals via the `@/` alias — `@/schema`, `@/lib/services`, `@/lib/queries/models`, `@/lib/queries/model-registry`, `@/lib/post-metadata`. A shared workspace package depends on the app that consumes it. | `packages/mcp/src/tools/models.tools.ts:5-7`, `posts.tools.ts:6,12`, `media.tools.ts:4` | **High** |
| 2 | **Phantom `packages/db`.** Directory holds only `.turbo/` + `.tsbuildinfo` — no `package.json`, no `src`. Actual schema + drizzle client live in `apps/web/src/schema/`. The intended home for fixing #1 is half-created. | `find packages/db` → build artefacts only | **High** |
| 3 | **Broken CI syntax.** `release.yml` nests `- parallel:` under `steps:` — not valid GitHub Actions. Lint/test/build likely never run as intended. | `.github/workflows/release.yml` | **High** |
| 4 | **No PR CI.** The only workflow triggers on `push: main`. Nothing gates pull requests before merge. | only `release.yml` exists in `.github/workflows` | **High** |
| 5 | **Logger bypassed.** 75 `console.*` calls despite the mandated `logError/logWarning/logInfo` + `ERROR_IDS` convention (per CLAUDE.md). Spread across scripts, lib, queries, and Studio components. | grep across `apps/web/src` + `packages` | Medium |
| 6 | **Type-safety debt.** 33 `any`/`as any`/`<any>`, 7 suppressions (`@ts-ignore`/`@ts-expect-error`/`biome-ignore`), 6 `TODO`/`FIXME`/`HACK` — in a "strict mode" codebase. | grep | Medium |
| 7 | **God modules.** `usage-breakdown.tsx` (861 lines), `posts.tools.ts` (807), plus 460–600-line Studio tables/forms (`posts-table` 598, `oauth-clients-table` 579, `edit-post-form` 505, `series-table` 489, `post-form` 462). | `wc -l` top-20 | Medium |
| 8 | **Root clutter.** ~12 tool-scratch dirs at root (`.deepsec`, `.ds-sync`, `.design-sync`, `.impeccable`, `ds-bundle`, `.agents`, `.codex`), a committed `.DS_Store`, and a 2.4 MB committed `tsconfig.tsbuildinfo`. | root `ls -la` | Low |
| 9 | **Doc sprawl / drift.** CLAUDE.md (378) + AGENTS.md (414) + README (132) + DESIGN.md (230) overlap; CLAUDE.md's Beads block already contradicted by the project's move to GitHub issues. | `wc -l`, memory | Low |

Supporting observations worth verifying (not yet confirmed as defects):
- `apps/web` declares `@apollo/client`, `graphql`, and `vite` as runtime deps in a Next.js app — candidates for dead/misplaced dependencies.
- Next.js pinned to a **preview** build (`16.3.0-preview.5`) — release-risk to confirm.
- `packages/usage` is imported transitively; confirm it stays free of `@/` app imports (currently clean).

---

## Part 2 — Methodology to find the remaining problems

Six audit passes. Independent passes can run in parallel (delegate to agents). Each produces a written artefact that feeds a single ranked issue register.

### Pass A — Static & type health
- Capture a baseline: run `pnpm typecheck`, `pnpm lint`, `pnpm test` and save output (are they green today?).
- Throwaway strictness probe: temporarily enable `noExplicitAny`, `noConsole`, `noUnusedImports` in a scratch Biome config and count violations (measure debt; do **not** commit).
- Dead-code / unused-dep scan with `knip` or `ts-prune` (validates #2 phantom package and the Apollo/graphql/vite suspicion).
- **Tools:** `Bash` (pnpm scripts), `knip`/`ts-prune`, `Read`.

### Pass B — Architecture & dependency graph
- Generate the real import graph: `madge apps/web/src packages --circular` — enumerate every inverted/circular edge beyond mcp→web.
- Verify layer boundaries: components importing `lib/queries` directly, business logic leaking into actions/route handlers, services skipped.
- **Tools:** `madge`/`dependency-cruiser` via `Bash`, **Explore agent** ("find every cross-package and `@/` import inside `packages/`").

### Pass C — Tests & coverage
- `pnpm test --coverage`; identify layers with zero tests (25 test files vs 263 source files is thin).
- Prioritise critical untested paths: MCP auth, OAuth scope enforcement, usage pricing/registry merge, ingest route, query layer.
- Flag implementation-detail assertions vs behavioural tests.
- **Tools:** `Bash` (Vitest coverage), `Read`, **test-writer agent** for gap analysis.

### Pass D — Security & auth
- Audit `lib/auth.ts`, `lib/api/mcp-auth.ts`, OAuth provider routes, `/api/usage/ingest`: token validation, `mcp` scope enforcement, the static `BLOG_MCP_AUTH_TOKEN` bearer (slated for removal — confirm it isn't a bypass), IP-salt hashing, hashed token storage.
- Secret hygiene: `.env*` files present at root — confirm none are committed; run `gitleaks` over history.
- **Tools:** **security-auditor agent**, `/security-review`, `gitleaks` via `Bash`.

### Pass E — Runtime, data & performance
- DB review of `lib/queries/` (esp. `usage.ts` 563 lines, `posts.ts`): N+1s, missing indexes, unbounded scans, Jaccard related-posts cost.
- Rendering strategy: static vs dynamic routes, whether the "likes disabled for static generation" workaround is still needed, Redis + `unstable_cache`/Cache Components correctness.
- Next 16 preview-version risk assessment.
- **Tools:** **database-optimizer agent**, **vercel:performance-optimizer agent**, `Read`.

### Pass F — DX, config & docs
- Reconcile CLAUDE.md/AGENTS.md against reality (commands, layer descriptions, Beads-vs-GitHub-issues contradiction).
- Audit `turbo.json` task wiring (`dependsOn`, the custom `transit` task, `typecheck`/`test`/`lint` graph).
- Root hygiene inventory (gitignore scratch dirs, drop committed build artefacts).
- **Tools:** `Read`, `Bash`, **tooling:update-project skill**.

**Deliverable:** one ranked issue register (severity × effort) filed as GitHub issues — a parent tracking issue with a sub-issue per pass.

---

## Part 3 — Refactoring plan (phased by risk)

Ordered so each phase unblocks the next and stays independently shippable.

### Phase 0 — Stop the bleeding (low risk, high signal) — #3, #4, #8
- Fix `release.yml` `parallel:` into real parallel jobs / matrix.
- Add a PR-triggered `ci.yml` (lint + typecheck + test + build) to protect `main`.
- Root hygiene: gitignore/remove scratch dirs, `.DS_Store`, committed `tsconfig.tsbuildinfo`.
- Establish and hold a green `typecheck`/`lint`/`test` baseline as the gate for every later phase.

### Phase 1 — Fix the dependency inversion (keystone) — #1, #2
1. Create a real `@workspace/db` package (`package.json`, tsconfig, exports).
2. Move `apps/web/src/schema/*` (schema + drizzle `db` client) into it; repoint `drizzle.config`/`drizzle-kit` and keep `db:*` scripts working.
3. Extract framework-free logic the MCP tools depend on (`post-metadata`, model-registry normalise/merge, DB-only service pieces) into `@workspace/db` or a new `@workspace/core`.
4. Rewrite `packages/mcp` imports from `@/…` to `@workspace/db`/`@workspace/core`. MCP depends on packages only — never on `apps/web`.
5. `apps/web` re-exports from `@workspace/db` behind its existing `@/schema` alias to minimise app-side churn.
- **Done when:** `madge --circular` is clean and `packages/mcp` has zero `@/` imports.

### Phase 2 — Enforce layer boundaries — Pass B
- Add a lint boundary rule (Biome `noRestrictedImports` or dependency-cruiser in CI) forbidding components→queries direct imports and package→app imports, so inversions can't regress.
- Move any business logic in server actions / route handlers down into `lib/services`.

### Phase 3 — Consistency sweep — #5, #6
- Replace `console.*` with `logError/logWarning/logInfo` + `ERROR_IDS`; enable `noConsole` to lock it.
- Type or scope-justify the 33 `any` sites; enable `noExplicitAny` as `warn`, ratchet to `error`.
- Resolve the 6 TODO/FIXMEs (fix or convert to tracked issues).

### Phase 4 — Decompose god modules — #7
- Split `usage-breakdown.tsx`, the 460–600-line Studio tables/forms, and `posts.tools.ts` into presentational + container + hooks, and per-tool files. Do test-first (Phase 5) on each file before touching it.

### Phase 5 — Test coverage backfill — Pass C
- Add characterization tests for the untested critical paths (MCP auth, OAuth scope, usage pricing/registry, ingest, query layer) **before** decomposing each god module.
- Add a coverage threshold to CI at the current %, then ratchet up.

### Phase 6 — Docs & config truth-up — #9, Pass F
- Collapse CLAUDE.md/AGENTS.md overlap to a single source + pointers; fix the Beads/GitHub-issues contradiction; verify every documented command exists.
- Audit `turbo.json` `dependsOn` wiring and decide on the Next 16 preview pin.

### Phase 7 (optional) — Dependency & runtime optimisation
- Remove confirmed dead deps (Apollo/graphql/stray vite).
- Apply Pass E DB/rendering findings (indexes, caching, related-posts cost).

### Sequencing

```
Phase 0 ──► Phase 1 ──► Phase 2
              │
              ├──► Phase 3 (parallel)
              ├──► Phase 5 ──► Phase 4 (test-first per module)
              └──► Phase 6 (parallel)
                        └──► Phase 7
```

Phases 0 and 1 are highest-leverage: CI protection + dependency inversion unblock everything else. Phases 3/5/6 can run concurrently once the graph is clean.

---

## Open decisions before implementation

1. **Phase 1 package split** — expand `@workspace/db` to hold shared logic, or split into `@workspace/db` (schema/client only) + `@workspace/core` (pure logic)? Recommendation: two-package split to keep the DB package dependency-light.
2. **Scope of next step** — run Pass A–F now and produce the ranked GitHub issue register, or treat this document as the final deliverable?
