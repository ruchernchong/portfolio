# Blog Monorepo — Audit & Refactor Plan

## Metadata

| Field | Value |
|---|---|
| **Model** | Claude Fable 5 (`claude-fable-5`) |
| **Reasoning effort** | Low |
| **Subject** | Full-project problem audit + refactor plan for the `blog` monorepo |
| **Date produced** | 31/07/2026 |
| **Repository** | `/Users/ruchernchong/Projects/blog` (branch: `main`, clean at time of planning) |
| **Repo shape** | pnpm/Turborepo monorepo: `apps/web` (Next.js 16.1, React 19.2), `apps/docs` (Fumadocs), `packages/mcp`, `packages/usage` |
| **Scale measured** | ~336 TypeScript/TSX source files; 15 `__tests__` directories; service layer ~2,592 lines |
| **Planning duration** | ~2 minutes wall clock (one reconnaissance step + plan authoring). No implementation performed. |
| **Estimated execution duration** | Audit: ~1–2 hours (mostly parallel agents). Refactor: 8 sequential PRs, roughly 1–3 focused sessions depending on findings volume. |
| **Constraint** | Plan only — no code changes made or to be made without explicit approval. Existing working-tree changes ignored/untouched. |

## Tools used during planning

| Tool | Calls | Purpose |
|---|---|---|
| `Bash` | 2 (run in parallel) | Reconnaissance only: counted source files, listed `apps/web/src` directory structure, counted test directories, measured `lib/queries`/`lib/services` line counts, listed `packages/mcp` and `packages/usage` contents |
| `Write` | 1 | This plan file |

No files were read, edited, or executed beyond the read-only reconnaissance above. Context sources: project `CLAUDE.md`, user global `CLAUDE.md`, persistent memory index, and Beads/session hooks.

## Tools planned for execution (not yet used)

- **Subagents (`Agent` tool):** `security-auditor`, `database-optimizer`, `cache-strategist`, `Explore`, `accessibility-checker`, `responsive-checker`, `vercel:performance-optimizer`, `test-writer`
- **Skills:** `/quality:refactor`, `/quality:project-structure`, `/quality:naming-format`, `/component-naming`, `/quality:tailwind`, `/security:deps`, `/security:security`, `/workflow:github-actions`, `/workflow:create-branch`, `/workflow:commit`, `/workflow:create-pr`, `next-dev-loop`, `webapp-testing`
- **Context7 MCP:** current-docs verification for Next.js 16, HeroUI v3, Better Auth, React 19
- **GitHub MCP / `gh` CLI:** filing parent + sub-issues for triaged findings (per user preference: GitHub issues, not Beads)
- **Optional (requires opt-in):** `Workflow` multi-agent adversarial verification pass, or `/code-review` on resulting branches

---

## Part 1 — Finding the problems (audit)

### Phase 0: Baseline signals (cheap, mechanical)

Record ground truth before touching anything; every later change must not regress it.

1. `pnpm typecheck` — TypeScript strict-mode errors across workspaces
2. `pnpm lint` — Biome findings
3. `pnpm test` — current pass/fail state
4. `pnpm build` — build health across all workspace packages
5. `pnpm audit` + GitHub Dependabot alerts (`gh api`) — dependency vulnerabilities
6. Dead-export analysis (`knip` / `ts-prune` style) — unused code candidates

### Phase 1: Parallel domain audits (read-only subagents, run concurrently)

| Agent | Target surface |
|---|---|
| `security-auditor` | OAuth 2.1/OIDC provider flow, `validateMcpAuth` (`lib/api/mcp-auth.ts`), `/api/mcp` and `/api/usage/ingest` routes, static `BLOG_MCP_AUTH_TOKEN` bearer, `IP_SALT` hashing, R2 presigned upload flow |
| `database-optimizer` | `lib/queries/`, Drizzle schemas in `apps/web/src/schema/`, N+1 patterns, missing indexes, `syncModelRegistry` merge path |
| `cache-strategist` | Upstash Redis usage — post stats, popular posts, related posts, analytics; stampede risk, TTL policy, invalidation on post update/delete |
| `Explore` (very thorough) | Cross-cutting inconsistencies: error handling vs `ERROR_IDS`/`logError` convention, duplicated logic between server actions / tRPC / API routes, direct DB access bypassing the query layer |
| `accessibility-checker` + `responsive-checker` | Studio CMS (`/studio`) and public blog pages |
| `vercel:performance-optimizer` | Per-route rendering strategy (verify which routes are actually static — likes were disabled specifically to enable static generation), bundle size, image handling, Core Web Vitals |

### Phase 2: Targeted skill-based sweeps

Use the project's purpose-built skills rather than re-deriving rules:

- `/quality:refactor` — dead code, nesting depth, code smells
- `/quality:project-structure` — colocation, misplaced files, directory anti-patterns
- `/quality:naming-format` + `/component-naming` — filename casing, export style, PascalCase Domain+Role component naming
- `/quality:tailwind` — v4 patterns; enforce `flex gap-*` over `space-*`, even spacing values, semantic colour tokens
- `/security:deps` — supply-chain pinning, install-script lockdown, Renovate/Dependabot config
- `/workflow:github-actions` — SHA pinning and least-privilege permissions in CI workflows

### Phase 3: Framework-currency check (Context7 MCP)

Verify against current documentation where the stack moves fast and training knowledge is flagged stale:

- **Next.js 16** — Cache Components adoption status, rendering/caching APIs (local `.next-docs` index explicitly warns memorised Next.js knowledge is wrong for this project)
- **HeroUI v3** — `onPress`/`isDisabled` conventions, compound components, no `render` props for links (known past gotcha; use `buttonVariants()` on Next `Link`)
- **Better Auth** — OAuth provider plugin best practices (`@better-auth/oauth-provider` + `jwt()`), token/JWKS handling
- **React 19** — `useEffectEvent` usage in client-side view tracking

### Phase 4: Verification and triage

1. Adversarially verify each finding: does it reproduce, is it reachable, is it already covered by a test. (Multi-agent `Workflow` verification pass if opted in; otherwise `/code-review` on branches.)
2. File everything as GitHub issues via `gh`: one parent "audit" issue, sub-issues per confirmed finding.
3. Tag by severity: **correctness/security** → **performance** → **convention drift** → **nice-to-have cleanup**.

---

## Part 2 — Refactor sequence (highest value first; one branch + PR each)

1. **Security & auth hardening** — apply confirmed security-audit findings; retire `BLOG_MCP_AUTH_TOKEN` in favour of OAuth-only for MCP/ingest clients (already slated for removal in CLAUDE.md). First because it is user-facing risk.
2. **Layer enforcement** — fix bypasses of the `lib/queries` → `lib/services` → `lib/api` layering; standardise all error handling on `ERROR_IDS` + `logError`/`logWarning`/`logInfo`. Makes every later refactor safer.
3. **Query & cache tuning** — indexes, query consolidation, correct Redis invalidation on mutations.
4. **Rendering strategy** — resolve the likes-disabled-for-static-generation tension properly, likely via Cache Components/PPR so dynamic stats and static content coexist instead of commented-out features.
5. **UI convention sweep** — HeroUI v3 semantic props over custom classNames, `buttonVariants()` on Links instead of render props, Tailwind v4 spacing rules, icons from `@hugeicons/*` only.
6. **Dead code & structure** — remove knip/skill-flagged dead code, relocate misplaced files, dedupe shared logic (candidates: OG helpers, overlap between `packages/usage` and web).
7. **Test backfill** — `test-writer` agent fills Phase 0 gaps, prioritising the OAuth flow, registry-sync merge logic, and pricing in `packages/usage` (least forgiving to regress). Follow `it("should...")` convention; mock external dependencies.
8. **Docs truth-up** — update CLAUDE.md/README only where commands or architecture actually changed; keep CLAUDE.md a lean gotchas file per user preference.

## Working rules throughout execution

- Every step: `/workflow:create-branch` → changes → `/workflow:commit` (GitLeaks-scanned conventional commits) → `/workflow:create-pr`.
- Gate each PR on `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- No commits or pushes without explicit user approval (conservative profile).
- Behaviour-preserving refactors touching UI verified against the running app via `next-dev-loop` / `webapp-testing`.
- Task tracking via GitHub issues (`gh`), not Beads/TodoWrite, per user preference.
- English (Singapore) for all content; no em dashes or hyphen-joined clauses in blog prose.

## Key judgment call

Security and layering are sequenced before cosmetic work because they reduce the blast radius of everything that follows. The codebase already has a sound layered architecture, so this is a **tighten-and-harden** refactor, not a rewrite.
