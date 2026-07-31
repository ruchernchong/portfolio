# Mobile Blog Authoring with Apple Intelligence

**Status:** Planning. Nothing implemented.
**Date:** 31 July 2026
**Model:** Opus 5 (1M context), high effort

---

## 1. Problem Statement

Build a way to write and publish blog posts for ruchern.dev from a phone, with
Apple Intelligence integration.

The initial framing assumed a native iOS app. That assumption was challenged on
distribution grounds: TestFlight or App Store distribution is disproportionate
overhead for a single-user, personal tool. This document works through what is
actually required, corrects that framing, and lays out four viable paths.

**Key finding:** the lightest path needs no app at all. iOS 26 Shortcuts can call
the on-device Apple Intelligence model directly and POST to the existing API,
for roughly half a day of backend work, no Xcode, no developer account, and no
signing expiry.

---

## 2. Existing Infrastructure Audit

Read before planning, so the plan targets what is actually in the repo.

### 2.1 Data model

`apps/web/src/schema/posts.ts` defines the `posts` table:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key, `defaultRandom()` |
| `slug` | `text` | unique, indexed |
| `title` | `text` | not null |
| `summary` | `text` | nullable |
| `metadata` | `jsonb` | typed `PostMetadata`, server-generated |
| `content` | `text` | MDX source |
| `status` | `text` | enum `draft` / `published`, default `draft` |
| `tags` | `text[]` | default `[]` |
| `featured` | `boolean` | default `false` |
| `coverImage` | `text` | nullable |
| `authorId` | `text` | FK to `user`, cascade delete |
| `seriesId` | `uuid` | FK to `series`, set null |
| `seriesOrder` | `integer` | nullable |
| `publishedAt` | `timestamptz` | set on publish |
| `createdAt` / `updatedAt` | `timestamptz` | `defaultNow()` |
| `deletedAt` | `timestamptz` | soft delete |

`PostMetadata` is a substantial nested blob covering `readingTime`,
`description`, `canonical`, `openGraph`, `twitter`, and `structuredData`. It is
generated server-side by `generatePostMetadata` in `apps/web/src/lib/post-metadata.ts`.

**Implication:** a client never needs to construct `metadata`. It sends title,
slug, summary, content, tags, and the server derives the rest. This materially
reduces client complexity for every option below.

### 2.2 HTTP surfaces

Two independent surfaces exist today.

**Studio REST** (`apps/web/src/app/api/studio/`):

```
GET    /api/studio/posts
POST   /api/studio/posts
GET    /api/studio/posts/[id]
PATCH  /api/studio/posts/[id]
DELETE /api/studio/posts/[id]
POST   /api/studio/posts/[id]/restore
GET    /api/studio/series            (+ [id], [id]/posts, [id]/restore)
GET    /api/studio/media             (+ [id])
POST   /api/studio/media/upload      (presigned R2 PUT)
GET    /api/studio/oauth-clients     (+ [id])
```

All gated by `requireAdmin()` from `apps/web/src/lib/api/auth.ts`, which calls
`auth.api.getSession({ headers: await headers() })` and then checks
`role === "admin"`. Bodies validated with Zod schemas from
`apps/web/src/types/api.ts` via `parseAndValidateBody`.

**MCP** (`apps/web/src/app/api/mcp/route.ts`): streamable HTTP transport wrapping
`createServer` from `packages/mcp/src/server.ts`. Tools in
`packages/mcp/src/tools/`: posts (list, get, create, update, delete, restore,
publish), media (list, get, request upload, confirm, upload from path, upload
from URL, delete), and model registry overrides.

### 2.3 Authentication

`apps/web/src/lib/auth.ts` configures Better Auth with plugins: `admin()`,
`bearer()`, `jwt()`, `oauthProvider()`, `lastLoginMethod()`, `oAuthProxy()`.

The app is a full OAuth 2.1 / OIDC provider. Scopes configured:
`openid`, `profile`, `email`, `offline_access`, `mcp`. PKCE required. Dynamic
client registration supported. Public clients supported. Consent screen at
`/consent`.

`apps/web/src/lib/api/mcp-auth.ts` implements `validateMcpAuth` with a three-tier
strategy:

1. **Better Auth session** (cookie or bearer session token) via `auth.api.getSession`
2. **OAuth JWT access token**, verified locally against the provider JWKS at
   `${OAUTH_RESOURCE}/jwks` using `verifyAccessToken` from `better-auth/oauth2`,
   with explicit `audience` and `issuer`. Rejects tokens from a disabled
   `oauthClient` row, then loads the owning user and role by subject.
3. **Static token** `BLOG_MCP_AUTH_TOKEN`, marked deprecated in the source
   comments and slated for removal once the remote MCP server and
   `usage:ingest:prod` migrate to OAuth.

`/api/mcp` additionally enforces the `mcp` scope (403 `insufficient_scope`
otherwise) and `role === "admin"` for OAuth-type auth.

**Critical asymmetry:** `/api/mcp` accepts OAuth bearers and the static token.
The `/api/studio/*` routes accept only Better Auth sessions. Any non-browser
client wanting the clean REST surface needs this gap closed.

### 2.4 Media pipeline

`POST /api/studio/media/upload` calls `mediaService.requestUpload()` and returns
a presigned Cloudflare R2 PUT URL, with type and size validation. A confirm step
creates the database row. The equivalent flow exists as MCP tools
(`request_upload`, `confirm_upload`).

**Implication:** image upload from a phone is already solved server-side. A
client does presigned PUT then confirm. No new backend work.

---

## 3. What Apple Intelligence Actually Provides

Four distinct technologies with very different access requirements. Conflating
them is the main source of confusion when scoping this kind of work.

### 3.1 Writing Tools

System-provided Proofread, Rewrite, and Summarise in the text selection menu.

- **Access:** automatic on any native text view (`UITextView`, SwiftUI
  `TextEditor`). Also available on editable text in Safari.
- **Cost:** zero. It is opt-out, not opt-in.
- **Control:** `writingToolsBehavior` can be set per view. Relevant here because
  rewriting inside a fenced code block would corrupt it. Use `.limited` inside
  fences, `.complete` in prose.
- **Requires no app.** This is the single most important point for the
  lightweight options.

### 3.2 Foundation Models framework

On-device model, roughly 3B parameters, `import FoundationModels`. Swift only.

Availability gating is mandatory:

```swift
switch SystemLanguageModel.default.availability {
case .available: // proceed
case .unavailable(.appleIntelligenceNotEnabled): // user must enable
case .unavailable(.modelNotReady):               // downloading, retry later
case .unavailable(.deviceNotEligible):           // hardware too old
}
```

Basic session:

```swift
let session = LanguageModelSession(instructions: """
    You edit blog posts written in British English for a personal
    technical blog. Never use emoji or em dashes.
    """)
let response = try await session.respond(to: prompt)
```

**Guided generation** is what makes this reliable rather than a novelty. The
`@Generable` macro plus `@Guide` constraints yields a typed Swift struct instead
of prose you must parse:

```swift
@Generable
struct PostFrontmatter {
  @Guide(description: "URL slug, lowercase, hyphen-separated, max 6 words")
  let slug: String

  @Guide(description: "Meta description in British English, 140-155 characters")
  let summary: String

  @Guide(description: "Three to five lowercase topic tags", .count(3...5))
  let tags: [String]
}

let fm = try await session.respond(to: draft, generating: PostFrontmatter.self)
```

Check `selectedModel.capabilities.contains(.guidedGeneration)` before relying on
it. Streaming is available via `streamResponse(to:schema:...)` returning a
`ResponseStream<GeneratedContent>` for partial results.

**Tool calling** lets the model query app state. Conform to `Tool`:

```swift
struct FindSeriesTool: Tool {
  let name = "findSeries"
  let description = "Finds existing post series by topic."

  @Generable
  struct Arguments {
    @Guide(description: "Natural language description of the topic")
    let query: String
  }

  func call(arguments: Arguments) async throws -> String { /* query SwiftData */ }
}
```

This grounds series suggestions in real posts rather than hallucinated ones.

**Context window is small.** A full-length post will exceed it. Every call needs:

```swift
do { let r = try await session.respond(to: prompt) }
catch LanguageModelError.contextSizeExceeded(let context) {
  // start a fresh session, chunk the input
}
```

Anything post-wide (summary, voice check) needs a map-reduce chunking pass.

- **Access:** requires a native app, therefore Xcode and code signing.
- **Hardware:** iPhone 15 Pro or newer.

### 3.3 Shortcuts "Use Model" action

iOS 26 added an intelligent **Use Model** action to Shortcuts, exposing three
backends:

- **On-Device** — the same Apple Intelligence model, offline capable, fastest,
  fully private, limited in scope
- **Private Cloud Compute** — for more complex requests, still privacy preserving
- **Extension Model** — ChatGPT

Combined with **Get Contents of URL**, this gives scripted access to the model
plus arbitrary HTTP, with no app, no Xcode, and no developer account.

- **Hardware:** iPhone 15 Pro or newer, same as the framework.
- **Limitation:** no `@Generable`. You prompt for JSON and parse the text, which
  is meaningfully less reliable than a typed schema.

### 3.4 App Intents, Siri, Image Playground

- **App Intents** expose app actions to Siri, Spotlight, and Apple Intelligence's
  own action layer. Requires a native app. Cheap to add once one exists.
- **Image Playground / Genmoji** could generate cover images. Generated art
  likely does not suit this blog. Recommend skipping.

---

## 4. Distribution Reality (Correction to the Original Framing)

The original plan implied TestFlight or App Store were the options. That was
wrong. **Direct install from Xcode to your own device is a third path** and needs
neither.

| Path | Cost | Re-sign cadence | Other limits |
|---|---|---|---|
| Free Apple ID ("personal team") | $0 | **Every 7 days** | 3 signed apps at once, ~10 app IDs per rolling week |
| Paid Developer Program | ~$99/yr | **Every 12 months** | none that matter for personal use |
| TestFlight internal testing | ~$99/yr | 90 days per build | up to 100 internal testers, **no App Review** |
| App Store | ~$99/yr | n/a | full App Review, privacy manifest, Sign in with Apple requirement |

With a paid membership the real friction is: connect the phone once a year, hit
Build. That is far less than "TestFlight or App Store" implies. The free tier's
7-day cycle is the genuinely painful one, and it is what most writing about
sideloading pain actually refers to.

TestFlight internal testing is also lower friction than assumed: internal
distribution does not go through App Review. Only external testing does.

**Conclusion:** distribution is a real cost but a smaller one than stated. It is
roughly $99/yr plus an annual rebuild. It should not by itself decide the
architecture. What should decide it is whether the features that require a native
app are worth two weeks of work.

---

## 5. The Four Options

### Option A: Shortcuts + existing API

No app. A Shortcut chains the on-device model to an HTTP POST.

```
[Dictate Text]  or  [Ask for Input]
      ↓
[Use Model — On-Device]
   "Return JSON with keys slug, summary, tags for this draft"
      ↓
[Get Contents of URL]
   POST https://ruchern.dev/api/studio/posts
   Authorization: Bearer ***
   Body: { title, slug, summary, content, tags, status: "draft" }
      ↓
[Show Result]
```

**Backend work:** approximately half a day. Let `POST /api/studio/posts` accept a
bearer token by reusing `validateMcpAuth`. The static `BLOG_MCP_AUTH_TOKEN` path
already exists for `/api/mcp`, so this is wiring, not new capability.

**Pros**

- Roughly half a day total, versus two weeks
- No Xcode, no developer account, no signing, no expiry
- Syncs to every device via iCloud automatically
- Editable without a build step
- Proves or disproves the underlying premise cheaply

**Cons**

- No guided generation. Prompt for JSON, parse text, handle malformed output
- No offline draft store. Online or not writing
- No custom editor, no syntax highlighting, no markdown toolbar
- Shortcuts becomes unpleasant to maintain past roughly 20 actions
- This is a capture-and-publish tool, not a writing environment

**Open security question:** using the static `BLOG_MCP_AUTH_TOKEN` inside a
Shortcut means a long-lived secret stored in iCloud in plaintext. For a
single-user personal blog this may be acceptable. The alternative is doing the
OAuth work up front, which largely defeats the point of choosing this option.
Worth an explicit decision rather than a default.

### Option B: Mobile-friendly `/studio`

Make the existing Studio editor usable on a phone. Writing Tools and dictation
come free in Safari on editable text.

**Work:** responsive pass over `apps/web/src/app/studio/posts/[id]/edit` and
`apps/web/src/app/studio/posts/new/components/post-form.tsx`. Textarea sizing,
sticky toolbar, autosave, viewport handling with the keyboard open, optional PWA
manifest for home-screen install.

**Pros**

- Zero new infrastructure, zero new auth, zero distribution
- Reuses code that already exists and is already tested
- Writing Tools and dictation for free
- Works on iPad and Android equally

**Cons**

- No Foundation Models API. No structured generation, no tool calling
- No offline support without significant service worker work
- No App Intents or Siri
- Mobile browser text editing for long MDX is genuinely unpleasant
- **Assumption to verify:** Writing Tools availability on Safari editable text
  should be confirmed on the actual device before planning around it. This takes
  about one minute.

**Estimated effort:** two days.

### Option C: Native SwiftUI app, direct install

The full original plan, minus TestFlight.

**Repository layout**

```
apps/ios/                 Xcode project
  BlogKit/                Swift package: API client, models, keychain, sync
  Intelligence/           Swift package: Foundation Models sessions, @Generable
  App/                    SwiftUI views
```

Must be excluded from `pnpm-workspace.yaml`, `turbo.json`, and `biome.json`, or
`pnpm lint` and `pnpm build` will trip over it.

**Authentication.** Public OAuth client using `ASWebAuthenticationSession` with
PKCE. Tokens in Keychain, refresh via `offline_access`. Register at
`/studio/oauth-clients` with redirect URI `dev.ruchern.blog://oauth-callback` and
`token_endpoint_auth_method: "none"`. This reuses the OAuth provider already
built, so no new auth system and no password handling.

**Local store.** SwiftData. A `Post` model mirroring `schema/posts.ts` minus
`metadata`, which stays server-generated. Every draft is local-first so writing
never blocks on network.

**Sync engine.** Background actor. Push queue of local mutations, pull by
`updatedAt` delta, three-way conflict UI on `409`.

**Editor.** A `UIViewRepresentable` wrapping `UITextView` rather than SwiftUI
`TextEditor`. This buys correct Writing Tools range handling, a custom
`inputAccessoryView` markdown toolbar, and syntax highlighting via
`AttributedString`. `TextEditor` also gets Writing Tools but offers less control
over selection and toolbars.

**Preview.** Render Markdown natively via `swift-markdown-ui` or
`AttributedString`. MDX JSX blocks render as opaque placeholder cards rather than
attempting component execution. A server-rendered preview endpoint is the
fallback if fidelity matters more than latency.

**Contract safety.** Swift `Codable` structs are hand-written against
`apps/web/src/types/api.ts`. Add one Vitest test in the web app that snapshots
the Zod schemas to JSON Schema, and one Swift test that decodes those fixtures.
This catches drift without building a codegen pipeline.

**Apple Intelligence features, in rough value order**

1. **Slug, summary, and tag suggestion** on publish, filling `slug`, `summary`,
   `tags` directly
2. **SEO meta description** feeding `PostMetadata.description` and the OG and
   Twitter titles
3. **Voice check** against the `blog-voice` skill rules, encoded as session
   `instructions` (Singapore English, no emoji, no hype words, no em dashes),
   returning a `@Generable` list of flagged spans with suggested rewrites. This
   is where a small on-device model is genuinely strong, because it is
   classification and local rewriting rather than long-form generation
4. **Outline from dictated notes**, pairing `SpeechTranscriber` with on-device
   cleanup
5. **Series placement** via a `Tool` querying the local SwiftData index, so
   `seriesId` and `seriesOrder` suggestions are grounded in real posts

**Pros**

- Everything: guided generation, offline drafting, real editor, Siri, widgets
- Best writing experience by a wide margin

**Cons**

- Roughly two weeks of work
- $99/yr plus an annual re-sign
- Swift and Xcode maintenance burden alongside a TypeScript monorepo
- A second client to keep in sync with the API contract

### Option D: Shortcut now, app later

Ship Option A immediately as a probe. Use it for a month. Revisit Option C with
evidence about whether mobile drafting actually happens and which limits are hit
first.

```
Week 0   Option A                     ~0.5 day
           ↓
         daily use for a month
           ↓
Week 4   decide with evidence:
           · did I actually draft on mobile?
           · what broke first?
           · is offline genuinely needed?
           ↓
         Option C only if justified
```

This is the recommended path. The half day is not wasted even if Option C
follows, because the bearer-auth backend change is a prerequisite for any
non-browser client and the Shortcut remains useful for quick capture.

---

## 6. Backend Changes by Option

| Change | File | A | B | C |
|---|---|---|---|---|
| Accept bearer on `POST /api/studio/posts` | `lib/api/auth.ts` | Yes | No | Yes |
| Layered auth for all studio routes | `lib/api/auth.ts` | No | No | Yes |
| Factor shared verify out of `mcp-auth.ts` | `lib/api/mcp-auth.ts` | Partial | No | Yes |
| New `studio` OAuth scope | `lib/auth.ts` | No | No | Yes |
| Optimistic concurrency (`expectedUpdatedAt`, 409) | `api/studio/posts/[id]/route.ts` | No | No | Yes |
| List projection and `?since=` delta sync | `api/studio/posts/route.ts` | No | No | Yes |
| Responsive editor pass | `app/studio/posts/**` | No | Yes | No |
| Register OAuth client | via `/studio/oauth-clients` | No | No | Yes |

Two notes on the Option C rows:

**Optimistic concurrency is the one genuine gap.** The phone edits offline while
Studio may edit the same post on desktop. Today the last write silently wins.
Accepting `expectedUpdatedAt` and returning `409` with the server row lets a
client present a conflict instead of clobbering.

**The current `GET /api/studio/posts` returns every post** with full `content`
and a joined author. Fine for a desktop table, wasteful over cellular.

---

## 7. Effort Summary

| Option | Effort | Recurring cost | Distribution friction |
|---|---|---|---|
| A: Shortcuts | ~0.5 day | $0 | None |
| B: Mobile web | ~2 days | $0 | None |
| C: Native app | ~2 weeks | $99/yr | Annual re-sign |
| D: A then C | 0.5 day now | $0 now | None now |

Option C phase breakdown, if pursued:

| Phase | Scope | Effort |
|---|---|---|
| 0 | Backend: layered auth, scope, 409 concurrency, list projection | 1 to 2 days |
| 1 | Xcode project, OAuth PKCE, Keychain, list and read-only detail | 3 to 4 days |
| 2 | Editor with Writing Tools, SwiftData, sync engine, conflict UI | 5 to 7 days |
| 3 | Foundation Models: gating, frontmatter generation, voice check | 3 to 4 days |
| 4 | Media: PhotosPicker, HEIC transcode and downscale, R2 upload | 2 days |
| 5 | App Intents, Siri, dictation, widgets | 2 to 3 days |

---

## 8. Risks and Constraints

**Hardware floor.** Apple Intelligence needs iPhone 15 Pro or newer, plus an
eligible region and language setting. This applies equally to the Shortcuts
action and the native framework. Every option that uses it must degrade
gracefully when unavailable.

**Model capability ceiling.** A roughly 3B on-device model will not draft a post
in your voice at publishable quality. Position it as extraction, classification,
and local rewriting. If real drafting is wanted, the escape hatch is a server
route calling Claude, with the on-device path as the offline and private
fallback. That is a hybrid architecture and should be decided deliberately rather
than discovered late.

**Context window.** Small enough that full-length posts will exceed it. Anything
post-wide needs chunking with a map-reduce pass and a
`LanguageModelError.contextSizeExceeded` handler that starts a fresh session.

**JSON reliability in Shortcuts.** Without `@Generable`, output is prose that
happens to look like JSON. Needs a validation step and a retry or manual
fallback.

**Secret in iCloud.** The static bearer token in a Shortcut syncs in plaintext.
Acceptable for a single-user blog, but an explicit decision.

**Monorepo friction.** An Xcode project inside a pnpm and Turborepo workspace
needs explicit exclusion from workspace globs, Turbo tasks, and Biome. A separate
repository avoids this at the cost of losing the shared contract test.

**Second client to maintain.** The API contract currently has one consumer, the
Studio, in the same repository and language. A Swift client is a second consumer
in a different language that cannot be type-checked against the source of truth
without deliberate effort.

---

## 9. Recommendation

**Option D.** Build the Shortcut first.

The reasoning is not that the native app is a bad idea. It is that the native app
costs two weeks and answers a question that half a day can answer instead: do you
actually draft posts on your phone, or does it only seem like you might?

If after a month the Shortcut is in regular use and its limits are frustrating,
you will know precisely which limits, and the native app becomes a justified two
weeks against real requirements rather than imagined ones. If it goes unused,
half a day was spent instead of two weeks.

The backend change it requires is a prerequisite for the native app anyway, so
none of the work is thrown away.

---

## 10. Open Questions

1. **Bearer secret in iCloud.** Is reusing the static `BLOG_MCP_AUTH_TOKEN` in a
   Shortcut acceptable, or should the OAuth flow be done properly up front? The
   latter largely defeats the purpose of choosing the lightweight option.
2. **Where does drafting actually happen?** Offline support and a real editor
   only matter if you write in places without signal or for extended sessions on
   a phone. If mobile use is capture-then-finish-at-desk, Option A is not a
   compromise, it is the correct shape.
3. **Writing Tools in mobile Safari.** Needs one minute of verification on device
   before Option B is planned around it.
4. **On-device only, or hybrid with server-side Claude?** Affects whether phase 0
   also needs a generation endpoint.
5. **Same repository or separate,** if Option C proceeds. Leaning same repository
   under `apps/ios`, excluded from the JS tooling, to keep the contract test.
6. **Preview fidelity.** Does the preview need real MDX component rendering, or
   is Markdown with placeholder cards enough? Real fidelity means a
   server-rendered preview route.

---

## 11. Sources

- [Use Apple Intelligence in Shortcuts (Apple Support SG)](https://support.apple.com/en-sg/guide/iphone/iph78c41eaf8/ios)
- [Compare Apple Developer memberships](https://developer.apple.com/support/compare-memberships/)
- [Free account 7-day provisioning limits](https://mybyways.com/blog/new-limitations-imposed-on-free-apple-developer-account)
- [Foundation Models framework documentation](https://developer.apple.com/documentation/foundationmodels)
- [Managing the context window](https://developer.apple.com/documentation/foundationmodels/managing-the-context-window)
- [Expanding generation with tool calling](https://developer.apple.com/documentation/foundationmodels/expanding-generation-with-tool-calling)
