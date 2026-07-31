# Plan: AI-Assisted Blog Authoring for ruchern.dev

> **Status:** Plan only — nothing implemented.
> **Author model:** Opus 4.8 (`claude-opus-4-8[1m]`), reasoning effort: high
> **Date:** 2026-07-31
> **Repo:** `ruchernchong/blog` (pnpm/Turborepo monorepo; `apps/web` + `apps/docs` + `packages/*`)

---

## 1. Original request

> "Create a mobile app for writing blog posts that has integration with Apple Intelligence."

The stated goal was a **mobile app** for drafting/editing/publishing posts to ruchern.dev, with **Apple Intelligence** woven into the writing flow (rewrite, proofread, summarise, suggest titles/tags/summaries).

## 2. How the decision evolved

The plan changed twice as constraints surfaced. Recording the reasoning so the conclusion is auditable.

### 2.1 First cut — native iOS SwiftUI app

- Rationale: the whole value proposition is *Apple Intelligence*, and its two best hooks are Swift-only:
  - **Writing Tools** — proofread / rewrite / summarise, free in any SwiftUI `TextEditor`, zero code.
  - **Foundation Models framework** (iOS 26+) — on-device LLM with `@Generable` guided/structured output, for bespoke suggestions (titles, summaries, tags), offline, no per-token cost.
- Backend would reuse the existing OAuth 2.1/OIDC provider (PKCE public client) + `/api/mcp` tools — no new server.
- **Rejected because of distribution.** For single-user personal use, TestFlight / App Store / provisioning profiles / 7-day free-account signing expiry are pure overhead with no payoff.

### 2.2 Second cut — native macOS app

- Key insight: **Apple Intelligence is not iOS-exclusive.** Both Writing Tools and the Foundation Models framework ship on **macOS 26 (Tahoe)**.
- A Mac app keeps the full AI integration while collapsing "distribution" to: build & run from Xcode, or export a `.app` and copy it. No App Store, no notarisation for personal use, no 7-day expiry. The user already writes at their Mac.
- **Superseded** by a sharper observation below.

### 2.3 Final cut — no native app; do it in the web Studio

- **Writing Tools already work today, with zero build,** in the existing web Studio editor (`/studio`) in Safari on macOS 26: select text → right-click → Writing Tools (proofread / rewrite / summarise). This already covers most of what "Apple Intelligence for writing" meant.
- A custom app's only unique advantage was **Foundation Models** being on-device + free. For a personal blog:
  - Drafts are **not sensitive**, so on-device privacy is not a deciding factor.
  - API cost on a personal blog is **negligible**.
  - Therefore the on-device benefit does **not** outweigh the native-app distribution overhead.
- The bespoke, structured, voice-aware suggestions Writing Tools *cannot* do (e.g. "propose 5 tags", "draft a summary in my voice", "give me 3 title options") can be delivered **server-side inside the existing web Studio** via Vercel AI Gateway — web-only, cross-device, no app, and plugged into infrastructure that already exists in this repo.

## 3. Final decision

**Drop the native app entirely. Two moves, both staying in this repo:**

1. **Use system Writing Tools in the existing `/studio` editor** (free, available now, nothing to build). Validate this covers everyday proofread/rewrite/summarise before building anything.
2. **Add bespoke, `blog-voice`-aware AI suggestions to the web Studio**, server-side via Vercel AI Gateway. This is the only thing worth building.

Everything below concerns **move #2**.

## 4. Why the server-side web approach fits this repo

- **AI SDK v6 through Vercel AI Gateway** — plain `"provider/model"` strings (per repo Vercel guidance: prefer the gateway over provider-specific packages like `@ai-sdk/anthropic` unless direct wiring is explicitly needed).
- **Structured output** — `generateObject` (AI SDK v6) with a **Zod schema**, so suggestions return typed data (`{ titles: string[]; summary: string; tags: string[] }`) rather than free text to parse.
- **Voice guardrails** — the existing **`blog-voice` skill** rules become the system prompt, so output matches how the author actually writes (Singapore English, no emoji, no hype words, no em dashes, paragraph rhythm, heading-driven structure).
- **Auth** — reuse `requireAdmin()` (`apps/web/src/lib/api`), the same gate used by `/api/studio/posts`. No new auth surface.
- **Cost visibility for free** — calls route through the same model registry (`model` table) and `token_usage` aggregates the repo already ingests (`packages/usage`, `pnpm usage:ingest`), so AI-assist usage appears in the existing usage dashboard.
- **UI** — HeroUI v3 (Pro first, then OSS) with existing conventions (`onPress`, `isDisabled`, compound components, `buttonVariants()` for link-buttons, `@hugeicons/*` icons).

## 5. Existing backend surface (already in place — reused, not rebuilt)

- **OAuth 2.1 / OIDC provider** — `@better-auth/oauth-provider` + `jwt()` (`apps/web/src/lib/auth.ts`). Not needed for move #2 (server actions run under the admin session), but noted because it was the auth path for the abandoned native-app plan.
- **Studio posts REST API** — `apps/web/src/app/api/studio/posts/route.ts` (`GET` list, `POST` create), `[id]/route.ts`. Gated by `requireAdmin()` (session-cookie based). `POST` validates with `createPostSchema` (`apps/web/src/types/api.ts`), generates metadata via `generatePostMetadata`, and revalidates `posts:*` cache tags.
- **MCP tools** — `packages/mcp/src/tools/posts.tools.ts` (`list_posts`, `get_post`, `create_post`, `update_post`, `publish_post`, soft delete/restore) and `media.tools.ts` (presigned R2 upload flow). Exposed at `/api/mcp` with OAuth bearer + `mcp` scope.
- **Studio editor UI** — `apps/web/src/app/studio/...` (post + media management).

## 6. Implementation plan (move #2)

MVP = steps 1–3 for **title + summary + tags**. Rewrite-selection follows.

| Step | What | Where (proposed) |
|------|------|------------------|
| 1 | AI Gateway suggestion route/server action: `generateObject` + Zod schema, `blog-voice` system prompt, `requireAdmin()` gate | `apps/web/src/app/_actions/` (server action) or `apps/web/src/app/api/studio/ai/` (route) |
| 2 | Suggestion actions: **3 title options**, **summary draft**, **tag proposals** (all from post content); later **rewrite-selection** (tone/length) | same as step 1 |
| 3 | Studio editor UI: HeroUI v3 assist panel / inline actions that trigger the suggestions and show results | `apps/web/src/app/studio/...` |
| 4 | Wire accepted suggestions into the post form fields (title / summary / tags), reusing existing form state | Studio editor |

### 6.1 Server layer detail (steps 1–2)

- One server action (or route) per suggestion type, or a single action with a `kind` discriminator — decide during implementation based on how the editor calls it. Server actions are the repo's convention for mutations, but these are read/generate calls, so a `POST` route under `/api/studio/ai/` may be cleaner. **Recommendation: `/api/studio/ai/suggest` route** returning typed JSON.
- Input: `{ kind: "titles" | "summary" | "tags" | "rewrite"; content: string; selection?: string; tone?: string; length?: string }`.
- Model call: AI SDK v6 `generateObject({ model: "<provider/model>", schema, system: BLOG_VOICE_SYSTEM_PROMPT, prompt })`.
- Output schemas (Zod):
  - titles → `{ titles: z.array(z.string()).length(3) }`
  - summary → `{ summary: z.string() }`
  - tags → `{ tags: z.array(z.string()).min(3).max(8) }`
  - rewrite → `{ rewritten: z.string() }`
- Guard: `requireAdmin()` at the top, standardised error responses via `@/lib/api` and `ERROR_IDS` / `logError`.

### 6.2 UI layer detail (steps 3–4)

- An assist panel (HeroUI Pro Sheet/Card or an inline action row) in the post editor.
- Each action shows a loading state, renders the suggestion(s), and offers "accept" → writes into the corresponding form field.
- Titles: render 3 as selectable chips/buttons. Tags: render as `Chip`s the author can toggle into the tag field. Summary/rewrite: show diff-ish preview + accept/replace.
- Follow `design-language-system` / `component-naming` skills and HeroUI taste guidance.

## 7. Setup / prerequisites (verify before coding)

- Confirm **Vercel AI Gateway** is configured for the project and the chosen `"provider/model"` string is available; set required env via `vercel env` (do **not** hardcode a provider SDK).
- Confirm **AI SDK v6** (`ai`) is/should be a dependency of `apps/web`.
- Pull **current AI SDK / AI Gateway docs** (Context7 or the Vercel `ai-sdk` / `ai-gateway` skills) before writing code — APIs may have moved past training data.
- Load the **`blog-voice`** skill and distil its rules into the system prompt constant.

## 8. Risks & open questions

- **Voice fidelity** — Foundation Models on-device vs a gateway model will differ in tone; the `blog-voice` system prompt is the main lever. May need a few iterations / few-shot examples from published posts.
- **Where the code lives** — server action (`_actions/`) vs API route (`api/studio/ai/`). Leaning API route for a generate/read call; confirm on implementation.
- **Cost/rate** — negligible for personal use, but gate behind `requireAdmin()` so it is never public. Usage is visible via the existing `token_usage` pipeline.
- **Scope creep** — resist adding publish/media flows here; those already exist in Studio and MCP.

## 9. Explicitly out of scope (decided against)

- Native **iOS** app (distribution overhead: TestFlight / App Store / signing / 7-day expiry).
- Native **macOS** app (viable and keeps on-device Foundation Models, but not worth building when Writing Tools already work in-browser and bespoke suggestions can be server-side).
- Any change to the **OAuth provider**, **MCP auth**, or the web app's **`requireAdmin` session auth**.
- **On-device / offline** AI (the Foundation Models privacy/cost advantage does not justify a native app for non-sensitive personal drafts).

## 10. Immediate next actions (when approved)

1. Verify AI Gateway + AI SDK v6 setup and model availability; pull current docs.
2. Implement `/api/studio/ai/suggest` with `generateObject` + Zod + `blog-voice` system prompt, gated by `requireAdmin()`.
3. Add the Studio editor assist UI for titles / summary / tags and wire accepted values into the form.
4. (Later) Add rewrite-selection (tone/length) and confirm usage shows up in the token-usage dashboard.

**Free, do-now baseline (no code):** use system **Writing Tools** in the `/studio` editor on macOS 26 for proofread / rewrite / summarise.
