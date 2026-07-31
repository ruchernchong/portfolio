# Mobile Blog Writing App with Apple Intelligence — Plan

**Status:** Proposal. Nothing implemented.
**Date:** 31 July 2026
**Repo:** `ruchernchong/blog` (pnpm + Turborepo monorepo, Next.js 16 App Router)

---

## 1. Goal

A way to write, edit, and publish blog posts on `ruchern.dev` from an iPhone, with
Apple Intelligence assisting the writing. Single user (the repo owner). No team,
no collaboration, no public distribution.

---

## 2. What the repo already provides

Findings from reading the codebase, not assumptions.

| Capability | State | Location |
| --- | --- | --- |
| OAuth 2.1 / OIDC provider, PKCE, public clients, dynamic client registration | Complete | `apps/web/src/lib/auth.ts` |
| Bearer-token validation, `mcp` scope gate, JWKS verification | Complete | `apps/web/src/lib/api/mcp-auth.ts` |
| Remote MCP endpoint at `https://ruchern.dev/api/mcp` | Complete, documented for Claude mobile | `apps/web/src/app/api/mcp/` |
| Post tools: `list_posts`, `get_post`, `create_post`, `save_draft`, `update_post`, `delete_post`, `restore_post`, `publish_post` | Complete | `packages/mcp/src/tools/posts.tools.ts` |
| Media tools: `request_upload`, `confirm_upload`, `upload_from_path`, `upload_from_url`, `list_media`, `delete_media` | Complete | `packages/mcp/src/tools/media.tools.ts` |
| Content Studio UI (posts, media, series, OAuth clients) | Complete, desktop-oriented | `apps/web/src/app/studio/` |
| Studio REST API | Complete, but session-cookie auth only via `requireAdmin()` — **no OAuth bearer path** | `apps/web/src/app/api/studio/`, `apps/web/src/lib/api/auth.ts:75` |
| PWA manifest / service worker | **Absent** | no `app/manifest.ts`, no `public/sw.js` |

### Posts schema (`apps/web/src/schema/posts.ts`)

`id`, `slug`, `title`, `summary`, `metadata` (jsonb: `readingTime`, `description`,
`canonical`, `openGraph`, `twitter`), `content`, `status` (`draft` | `published`),
`tags[]`, `featured`, `coverImage`, `authorId`, `seriesId`, `seriesOrder`,
`publishedAt`, `createdAt`, `updatedAt`, `deletedAt`.

The AI-assistable fields are `summary`, `tags`, and `metadata.description`. These
are short-input, short-output tasks, which matters for the model-sizing argument
in section 5.

---

## 3. Options considered

### Option 0 — Claude mobile app against the existing remote MCP server

**Build cost: zero.** CLAUDE.md already documents `https://ruchern.dev/api/mcp` as
reachable from Claude Desktop, Claude Code, and the Claude mobile app. Add the
server with a bearer token and you can dictate, draft, revise, and publish from
the phone immediately, using the post and media tools listed above.

- Pros: available today, no code, full Claude quality, respects the `blog-voice`
  skill if invoked, media upload included.
- Cons: this is Claude, not Apple Intelligence. No offline. No purpose-built
  editor UI. Dependent on the Claude app's own UX.
- Verdict: **the baseline.** Any build must beat this to justify itself.

### Option 1 — `/studio` as an installed PWA (recommended)

Turn the existing Content Studio into a home-screen web app.

- Pros: no distribution, no App Store review, no signing, no certificate expiry,
  updates ship on `git push`. Auth already works via the existing Better Auth
  session cookie and `requireAdmin()`, so no OAuth client registration and no new
  API surface. Builds on code already owned and tested.
- Cons: no access to the Foundation Models framework. Editor polish will be below
  native. Depends on WebKit behaviour for Writing Tools (see section 5).
- Verdict: **recommended.**

### Option 2 — native SwiftUI app

- Distribution: TestFlight or App Store is disproportionate for one user. Free
  personal provisioning expires every 7 days and needs Xcode re-signing on a
  schedule. A paid developer account is $99/year and still requires periodic
  Xcode work.
- Pros: full Foundation Models framework access, `@Generable` typed structured
  output, `LanguageModelSession`, App Intents, best editor UX.
- Cons: entire OAuth client flow, Swift MCP JSON-RPC client, SwiftData store, and
  a permanent signing/distribution treadmill — all for one user.
- Verdict: **rejected.** The earlier version of this plan reached for native
  because Foundation Models is Swift-only, and let that single framework drag
  along an app, an auth flow, and a distribution story. Not worth the tail.

---

## 4. Recommended architecture

```
iPhone home screen
  └── /studio PWA (standalone display mode)
        ├── Editor  ── Writing Tools (system, via WebKit selection callout)
        ├── Service worker ── offline draft cache + outbound mutation queue
        └── fetch → /api/studio/*  (Better Auth session cookie, requireAdmin)

Apple Shortcuts (no distribution)
  ├── "Use Model" action ── on-device / Private Cloud Compute / ChatGPT
  └── "Get Contents of URL" → /api/mcp  (bearer token)

Claude mobile app (retained)
  └── remote MCP → /api/mcp  (heavy drafting, voice-critical work)
```

Three surfaces, each doing what it is actually good at. No new backend layer, no
new auth path, no new attack surface.

---

## 5. Apple Intelligence: what is realistically available

### Not available to a PWA

- **Foundation Models framework.** Swift-only. No `LanguageModelSession`, no
  `@Generable` / `@Guide` typed structured output, no adapters. There is no web
  workaround. This is the real cost of choosing Option 1.

### Available, and covering most of the value

- **Writing Tools (proofread, rewrite, summarise).** WebKit added Writing Tools
  support for editable web content, so the selection callout should offer them
  inside a `<textarea>` or `contenteditable` in Safari. This is the feature that
  gets used hourly while writing, and a PWA would get it for free with no code.
  **Must be verified on device — see section 8.**

- **Apple Shortcuts "Use Model" action (iOS 26).** Runs a prompt against the
  on-device model, Private Cloud Compute, or ChatGPT, and Shortcuts can call an
  HTTP API with "Get Contents of URL". This closes the structured-generation gap
  without any distribution overhead: a "generate tags for this draft" shortcut or
  a dictate-to-draft capture shortcut becomes buildable. **Must be verified on
  device — see section 8.**

- **Dictation and Siri.** System dictation into the PWA editor. Shortcuts can be
  triggered by voice for idea capture away from the desk.

### Deliberately excluded

- **Image Playground / Genmoji** for cover images. Generated art will not match
  the site's design language (coral OKLCH tokens, per the `design-language-system`
  skill). Keep using the existing R2 media flow.

### Honest sizing note

The on-device model is roughly 3B parameters with a small context window. It
cannot draft a publishable post in the `blog-voice` style, and it cannot hold a
2000-word post in context for a structural edit. It is genuinely good at short,
bounded tasks: tags, summary, OG description, slug suggestions, outline review,
capture triage. That maps precisely onto the `posts` fields identified in
section 2. Voice-critical long-form work stays with Claude via Option 0.

### Availability gating

Apple Intelligence requires A17 Pro or M-series silicon and a supported region
and language. Every AI affordance must degrade cleanly to a non-AI path. In a PWA
this is mostly automatic, since Writing Tools simply will not appear in the
callout when unsupported.

---

## 6. Work breakdown for Option 1

### 6.1 PWA shell

- Add `apps/web/src/app/manifest.ts` with `display: "standalone"`,
  `start_url: "/studio/posts"`, theme and background colours drawn from the
  existing OKLCH semantic tokens in `apps/web/src/app/globals.css`, and the icon
  set.
- Apple-specific meta for status bar appearance and splash.
- Scope the manifest so installing does not turn the whole public blog into an
  app shell.

### 6.2 Responsive editor (the bulk of the work)

Files to rework for narrow viewports:

- `apps/web/src/app/studio/posts/new/components/post-form.tsx`
- `apps/web/src/app/studio/posts/new/components/new-post-editor.tsx`
- `apps/web/src/app/studio/posts/[id]/edit/components/edit-post-form.tsx`
- `apps/web/src/app/studio/posts/[id]/edit/components/edit-post-editor.tsx`
- `apps/web/src/app/studio/posts/components/posts-table.tsx` (table → card list on
  small screens)
- `apps/web/src/app/studio/layout.tsx` (navigation for narrow viewports)
- `apps/web/src/app/studio/media/components/media-library.tsx`

Design constraints from the project skills:

- HeroUI Pro (`@heroui-pro/react`) first, HeroUI OSS (`@heroui/react`) as
  fallback. HeroUI v3 conventions: `onPress`, `isDisabled`, compound components,
  `TextField` owning controlled `value` / `onChange(string)`.
- No render props for links; use `buttonVariants()` from `@heroui/styles` on a
  Next `Link`.
- Tailwind v4: `flex gap-*` rather than `space-y-*`, even spacing values,
  `margin-bottom` over `margin-top`.
- Icons from `@hugeicons/*`.
- HeroUI Pro overlay components reference `document` during SSR, so any drawer or
  sheet used for mobile navigation must live in a `"use client"` component and be
  mounted client-side only.

Editor UX decisions:

- Markdown source with a preview tab. **No WYSIWYG** — MDX round-tripping through
  a rich text editor is a bug factory.
- Keyboard accessory row: heading, bold, link, code fence, image insert.
- The content field must be a plain `<textarea>` or `contenteditable`, not a
  canvas- or div-span-based editor, otherwise Writing Tools will not attach.
- MDX component autocomplete is out of scope for v1.

### 6.3 Offline support

- Service worker caching the studio shell and the draft list.
- IndexedDB store for draft bodies.
- Outbound mutation queue replaying to `/api/studio/posts` and
  `/api/studio/posts/[id]` on reconnect.
- Conflict handling by comparing `updatedAt`, surfacing a "keep mine / keep
  server" choice rather than silent last-write-wins. Silently losing a draft is
  the one unforgivable bug in this category.
- Home-screen-installed PWAs are exempt from Safari's 7-day storage eviction,
  which is what makes offline drafts viable at all. Verify this holds.

### 6.4 Media

Reuse the existing presigned R2 flow through `/api/studio/media/upload` so the
phone never holds R2 credentials. Camera roll and direct camera capture come free
from `<input type="file" accept="image/*">`.

### 6.5 Shortcuts (optional, after the PWA works)

- **Generate tags** — read draft via `/api/mcp` `get_post`, run "Use Model",
  write back via `update_post`.
- **Capture idea** — dictate, run "Use Model" to title and tidy it, create a
  draft via `save_draft`.
- Both authenticate with the existing static bearer (`BLOG_MCP_AUTH_TOKEN`) or an
  OAuth token, and require the `mcp` scope.

---

## 7. What is explicitly not being built

- No native iOS app.
- No new REST API surface. `/api/studio/*` and `/api/mcp` are sufficient.
- No OAuth bearer branch added to `requireAdmin()`. The PWA rides the existing
  session cookie, so widening that admin-scoped surface is unnecessary.
- No Swift MCP client.
- No AI cover-image generation.
- No server-side Claude proxy route in v1. If voice-matched long-form assistance
  is wanted later, it would be a new authenticated route on the web app calling
  Claude with the `blog-voice` skill and published-post samples as context, which
  would also flow through the existing `token_usage` ingestion so cost shows on
  the analytics dashboard. Deferred.

---

## 8. Assumptions requiring device verification before committing

These gate the plan and are cheap to check.

1. **Writing Tools in Safari text inputs.** Select text in a `<textarea>` on
   `ruchern.dev/studio` in mobile Safari. Do proofread and rewrite appear in the
   callout? If not, the main AI argument for the PWA collapses and Option 0
   becomes the whole answer.
2. **Shortcuts "Use Model" action.** Confirm it exists on the installed iOS
   version and that the on-device model target is selectable.
3. **PWA storage durability.** Confirm installed-PWA IndexedDB survives beyond
   7 days of non-use before relying on it for unsynced drafts.
4. **Device eligibility.** Confirm the handset is A17 Pro or newer and that
   Apple Intelligence is enabled in a supported region and language.

---

## 9. Sequencing

**Step 0 — no code.** Wire the remote MCP server into the Claude iOS app. Use it
for a fortnight. It may be sufficient on its own, in which case the rest of this
plan is unnecessary and that is a good outcome.

**Step 1 — verification.** Work through section 8. Roughly an hour.

**Step 2 — PWA shell.** Manifest, icons, Apple meta. Small.

**Step 3 — responsive editor.** The main effort. Roughly a weekend against
existing components.

**Step 4 — offline queue.** Service worker, IndexedDB, conflict prompt.

**Step 5 — Shortcuts.** Tag generation and dictated capture.

**Step 6 — optional polish.** Series ordering on mobile, media browsing, a
server-assisted voice-matching route.

---

## 10. Open questions

1. Is iOS 26 the floor? Shortcuts "Use Model" depends on it. Writing Tools needs
   iOS 18.1 or later.
2. Should the PWA scope be `/studio` only, or should the public blog also become
   installable? Recommend studio-only.
3. Is offline editing genuinely needed, or is the phone always connected in
   practice? If connectivity is reliable, step 4 can be dropped entirely and the
   build shrinks a lot.

---

## 11. Recommendation in one line

Do step 0 today, verify section 8 this week, and only then decide whether the
PWA is worth building — because the zero-build option may already be enough.
