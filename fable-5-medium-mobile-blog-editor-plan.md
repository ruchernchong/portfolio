# Mobile Blog Writing App with Apple Intelligence — Plan

- **Model:** Fable 5 (`claude-fable-5`)
- **Effort:** medium
- **Date:** 31/07/2026
- **Status:** Planning only. Nothing implemented.

## Goal

A mobile writing experience for ruchern.dev blog posts with Apple Intelligence
assistance: drafting, editing, metadata generation, and publishing from a phone.

## What the blog repo already provides

The hard backend pieces exist today and require little to no new work:

- **OAuth 2.1 / OIDC provider** via `@better-auth/oauth-provider` + `jwt()`
  (`apps/web/src/lib/auth.ts`): Authorization Code + PKCE, public clients,
  dynamic client registration, consent at `/consent`, JWT access tokens
  verifiable via JWKS. Endpoints under `/api/auth/oauth2/*`, discovery at
  `/api/auth/.well-known/openid-configuration`.
- **Post and media operations** exposed through the MCP server (`packages/mcp`)
  and the remote route at `/api/mcp`: post CRUD, publish, soft delete/restore,
  presigned R2 upload flow (`request_upload` → PUT → `confirm_upload`), and
  server-side auto-generated metadata in `create_post`.
- **Content Studio** at `/studio` — an existing CMS UI for posts and media.
- **Scope gating**: the `mcp` scope controls MCP API access; `validateMcpAuth`
  (`lib/api/mcp-auth.ts`) verifies bearers locally against JWKS.

## Option A — Native iOS app (original plan)

### Stack

- Swift 6, SwiftUI, iOS 26+ minimum target.
- Native is **forced** by full Apple Intelligence integration: the Foundation
  Models framework, Writing Tools customisation, App Intents, and Genmoji are
  Swift-only APIs with no first-class cross-platform (React Native/Expo)
  bindings.
- Separate repo (e.g. `blog-ios`), not a workspace package — an Xcode project
  gains nothing from the pnpm/Turborepo setup and talks to the blog over HTTPS
  only.

### Backend integration

- **Auth:** `ASWebAuthenticationSession` running Authorization Code + PKCE
  against the existing endpoints. Register as a public client via dynamic
  client registration with a custom scheme redirect (e.g.
  `dev.ruchern.blog://callback`). Scopes: `openid email offline_access mcp`,
  with `resource` (RFC 8707) so the access token is a JWKS-verifiable JWT.
  Tokens stored in the Keychain; refresh via `offline_access`. Optionally
  register the app as a trusted client in plugin options instead of dynamic
  registration.
- **Content API:** preferred approach is a thin REST surface (e.g.
  `/api/posts`) in the blog repo reusing the same service layer the MCP tools
  call, if the handlers are currently MCP-only. Speaking MCP-over-HTTP from
  Swift was considered and rejected: MCP is a tool protocol, not an app API.
- **Media:** reuse the presigned R2 flow for camera-roll uploads.
- **Offline drafts:** SwiftData local store as source of truth while writing;
  sync on save. Last-write-wins guarded by `updatedAt` is sufficient for a
  single-author blog.

### Apple Intelligence features (ordered by effort-to-value)

1. **Writing Tools (near-free).** Proofread/rewrite/tone appear automatically
   in `UITextView`/`TextEditor` on Apple Intelligence devices. Work needed:
   set `writingToolsBehavior` to full inline mode and protect MDX code fences
   and frontmatter from rewrites (`writingToolsIgnoredTextRanges`, or edit
   body-only).
2. **Foundation Models framework (on-device LLM — the differentiator).**
   `LanguageModelSession` with guided generation (`@Generable` structs) for:
   - Metadata generation: title suggestions, summary/excerpt, tag suggestions
     from the existing taxonomy, slug — typed structs, mirroring the
     server-side auto-metadata in `create_post`, but offline and instant.
   - Voice-preserving assists: outline-to-draft expansion, paragraph
     tightening, heading suggestions. Session instructions seeded with the
     blog-voice rules (Singapore English, no em dashes, no hype words) so
     rewrites match the published voice.
   - Fully on-device: free, private, works offline.
3. **App Intents + Siri/Shortcuts.** "New draft about X", "Publish my latest
   draft"; drafts in Spotlight.
4. **Image Playground sheet (later).** Cover/inline image generation, uploaded
   through the R2 flow.
5. **Availability gating.** Check `SystemLanguageModel.default.availability`;
   on unsupported devices the app remains a fully working editor with AI
   affordances hidden, not broken.

### App structure

```
BlogApp/
├── Features/
│   ├── PostList/        # drafts + published, status filters
│   ├── Editor/          # MDX text editor, frontmatter form, Writing Tools config
│   ├── Intelligence/    # FoundationModels sessions, @Generable schemas, prompts
│   ├── Media/           # picker, R2 upload pipeline
│   └── Auth/            # PKCE flow, Keychain token store
├── Core/
│   ├── API/             # typed client for the blog REST endpoints
│   └── Persistence/     # SwiftData draft store + sync
└── AppIntents/          # Siri/Shortcuts intents
```

### Phasing

| Phase | Scope | Outcome |
|---|---|---|
| 1 | Auth + read-only post list | Proves the OAuth client flow end-to-end |
| 2 | Editor + draft CRUD + offline drafts | Usable writing app; Writing Tools already active |
| 3 | Foundation Models metadata + voice assists | The Apple Intelligence differentiator |
| 4 | Media upload, publish flow, App Intents | Full mobile replacement for desktop Studio |
| 5 | Polish: Image Playground, widgets, distribution | Ship to own device |

### Distribution problem (the objection)

For a personal-use-only app, every native distribution path carries ongoing
cost:

- **Free Apple ID + Xcode install:** builds expire after 7 days. Unusable for
  a daily app.
- **Paid developer account (USD 99/yr) + Xcode/ad-hoc install:**
  development-signed builds last one year on registered devices. Tolerable if
  the app is iterated on regularly; still a permanent tax.
- **TestFlight:** 90-day build expiry plus light beta review per build.
  Agreed to be overkill for single-user distribution.

## Option B — Mobile-first web editor (recommended)

Remove the distribution problem entirely by making `/studio` genuinely good on
a phone instead of building a native app.

### Why it covers most of the value

- **Writing Tools work in Safari.** On an Apple Intelligence device,
  proofread/rewrite/tone are system-level and appear in any `textarea` or
  contenteditable on a web page. The editor gets the most-used AI feature
  with zero Swift.
- **Metadata generation does not need to be on-device.** `create_post`
  already does auto-metadata server-side; a mobile editor UI calls the same
  code. Server-side AI assists can run through the existing stack.
- **Everything else already exists:** `/studio`, auth, the API, R2 uploads.
- **Zero distribution:** PWA added to the home screen; updates ship with
  `git push`.

### Scope of work

- Audit `/studio` behaviour at phone widths (first step).
- Responsive editor layout for phone use.
- PWA installability (manifest, icons, standalone display).
- Offline draft persistence via localStorage/IndexedDB (best-effort, not
  native-grade).

### What is genuinely lost vs native

- On-device Foundation Models (offline, free, private LLM calls).
- App Intents / Siri / Shortcuts integration.
- Offline-first robustness beyond PWA capabilities.

These are the tail of the feature list, not the head. Writing Tools — the
feature touched most while actually writing — survives the move to web intact.

## Recommendation and decision path

1. **Build Option B now:** polish `/studio` for phone use, PWA-installable,
   server-side AI assists.
2. **Revisit Option A later** only if on-device/offline generation or Siri
   integration is genuinely missed after living with the web editor. At that
   point the USD 99/yr + yearly re-sign is a considered trade rather than an
   upfront tax.

## Open questions

- iPhone-only or iPhone + iPad (affects editor layout ambition)?
- If native is ever built: App Store-bound or personal sideload (affects auth
  hardening and review-proofing)?
- Are the post/media handlers reachable as plain REST with an OAuth bearer
  today, or MCP-only (determines the thin REST layer work in Phase 1)?
