# Migrating from GramJS (vendor) to teleproto

Telegramito ran on a vendored fork of GramJS (`vendor/gramjs`, published as
`vendor/telegram-built`) until this migration. The upstream GramJS project is
archived; **teleproto** is its maintained, GramJS-compatible successor — typed
errors, auth email / reCaptcha hooks, and ongoing TL layer updates. Telegramito
now runs on the npm `teleproto` package as its sole MTProto client.

This guide documents what changed, as shipped, for developers working in this
codebase and for users of the app.

Reference: [Migrating from GramJS — teleproto docs](https://docs.teleproto.dev/migrating-from-gramjs)

---

## For users: what changed at login

Existing users **stayed logged in** across the app update — stored sessions
carried over automatically (see [Session continuity](#session-continuity)).

If you sign in fresh on a new device or after logging out, Telegram may now ask for:

- **An email address** — for account verification on first sign-in.
- **An email code** — a 6-digit confirmation sent to that address.
- **A security check (captcha)** — on flows Telegram considers suspicious (new accounts,
  unusual devices). Telegramito cannot solve captchas in the browser. If one appears, the
  app shows a blocking message: finish signing in with the **official Telegram app** or
  [web.telegram.org](https://web.telegram.org) on this account, then return here.
  Existing saved sessions are unaffected.

The login screen walks you through each step as Telegram requests it. Most users only
ever see the phone + SMS code flow; email and captcha steps are rare. Phone number, SMS
code, and two-factor password flows are unchanged.

---

## What shipped

The sections below describe the migrated codebase as it stands, not a walkthrough to
follow — useful mainly as a reference if a similar dependency swap comes up again
elsewhere in the project.

### 1. Runtime dependency

`package.json`'s dependency entry changed from the vendored file reference to the npm
package:

```diff
-"telegram": "file:./vendor/telegram-built"
+"teleproto": "^1.228.5"
```

`teleproto` is now the only MTProto client Telegramito ships. `vendor/gramjs` (the git
submodule) is intentionally still present — see [Tooling cleanup](#tooling-cleanup).

### 2. Browser-compatibility shims

Unlike the vendored GramJS fork — which shipped a `browser` field and isomorphic
dependency choices tailored to this app — plain npm `teleproto` assumes a Node runtime
in a few places. Three fixes cover the gap:

- **`src/zlib-shim.ts`** — teleproto's `GZIPPacked` decompresses gzip-wrapped MTProto
  responses via Node's `zlib.unzipSync`, which has no browser implementation. The shim
  re-implements `unzipSync` on top of `pako` (the same isomorphic package GramJS's own
  fork used for this), and is aliased over both `zlib` and `node:zlib` in
  `vite.config.ts`'s `resolve.alias`.
- **`src/node-localstorage-shim.ts`** — teleproto's `sessions` barrel eagerly
  `require()`s `node-localstorage` (fs-backed, Node-only) as part of loading
  `StoreSession`, even though Telegramito only ever constructs `StringSession`. Left
  unshimmed, the eager require throws at app boot before any session is constructed.
  The shim's `LocalStorage` class only throws if actually instantiated — `StoreSession`
  stays genuinely unused dead code, so a future accidental real usage fails loudly
  instead of silently no-op'ing. Aliased over `node-localstorage` in `vite.config.ts`.
- **`networkSocket` wiring** — teleproto's `TelegramClient` defaults to
  `PromisedNetSockets` (Node `net.Socket`) unconditionally; unlike GramJS, it does not
  auto-detect browser vs. Node. `src/telegram/clientFactory.ts` exports a shared
  `browserClientOptions = { networkSocket: PromisedWebSockets }` object that both
  `TelegramClient` construction sites — `clientFactory.ts`'s
  `createClientFromStringSession` and `TelegramContext.tsx`'s login flow — spread into
  their options.

A fourth fix ships as a `patch-package` patch rather than app code — see
[Patch-package fix](#patch-package-fix) below.

### 3. Import rewrite

All `"telegram"` / `"telegram/<subpath>"` imports (~170 import statements, plus 23
inline `import("telegram")` type expressions) were rewritten to their `teleproto`
equivalents:

| Old import | New import |
|---|---|
| `telegram` | `teleproto` |
| `telegram/sessions` | `teleproto/sessions` |
| `telegram/events` | `teleproto/events` |
| `telegram/errors` | `teleproto/errors` |
| `telegram/tl` | `teleproto/tl` |
| `telegram/tl/custom/dialog` | `teleproto/tl/custom/dialog` |
| `telegram/Helpers` | `teleproto/Helpers` |
| `telegram/Utils` | `teleproto/Utils` |
| `telegram/define` | `teleproto/define` |
| `telegram/client/downloads` | `teleproto/client/downloads` |

Zero `telegram`-specifier imports remain in `src/` (the one string match left is a
doc-comment self-reference inside the AC-T3 guard test, `noGramjsImports.test.ts`, not
a real import).

One knock-on fix was needed outside the import rewrite itself: `tsconfig.app.json`
now sets `"types": ["vite/client", "node"]` explicitly. Vendored GramJS's shipped
`.d.ts` files carried `/// <reference types="node" />`, which pulled in `@types/node`'s
ambient globals (`process`, `Buffer`, `node:fs`, …) as a side effect for the whole
program — several structural tests rely on those globals directly. teleproto's `.d.ts`
files carry no such reference, so the `node` types entry is now explicit rather than
incidental.

### 4. Read receipts — a non-event

teleproto renames GramJS's `sendReadAcknowledge` to `markAsRead` with a different
signature. Neither name occurs anywhere in `src/`: Telegramito's read-receipt path
(`markChatRead.ts`) already called `messages.ReadHistory` / `messages.ReadDiscussion`
directly via `invoke`, so this rename required no code changes at all.

### 5. Auth challenge callbacks

`client.start` gained three optional callbacks for challenges Telegram can issue, wired
into `TelegramContext.tsx`'s login flow and `LoginView.tsx`'s rendering:

```typescript
await client.start({
  phoneNumber:       () => promptPhone(),
  phoneCode:         () => promptSmsCode(),
  password:          () => prompt2FA(),

  // New in teleproto — only called if Telegram challenges the flow
  emailAddress:      () => promptEmail(),
  emailVerification: async () => ({ code: await promptEmailCode() }),
  reCaptchaCallback: async (siteKey) => solveCaptcha(siteKey),

  onError: handleAuthError,
});
```

All three are optional and are only invoked on flows that require them. Existing
phone / SMS / 2FA login paths are unchanged.

#### reCaptcha in a static PWA (v1 decision: honest block)

`reCaptchaCallback` must return a solved token. In a static browser-only PWA there is
no trusted WebView host or server side to proxy the solve.

**Shipped (D8):** `reCaptchaCallback` sets `loginStep → "captchaBlocked"` and throws a
sentinel to abort `client.start` cleanly. Because `TelegramContext.tsx`'s catch around
`c.start` would otherwise unconditionally overwrite `loginStep` back to `"idle"` and
show a generic error banner (a failure mode confirmed during the code QA pass, since
teleproto's `reCaptchaCallback` rejection path has no special handling), the sentinel is
carved out ahead of the generic error handler so the block screen actually renders and
sticks.

`LoginView.tsx` renders the `captchaBlocked` step with the app's `login.captchaTitle` /
`login.captchaBody` copy:

> *Telegram asked for a security check that Telegramito cannot complete in the browser.
> Finish signing in with the official Telegram app or web.telegram.org on this account,
> then return here. Existing saved sessions are unaffected.*

A single "Understood" button (`login.captchaDismiss`) returns to `idle` so the user can
try again after completing sign-in externally. No in-app captcha widget shipped in v1;
the hook stays wired so a future widget can replace the block screen without reshaping
the state machine.

### 6. Typed errors

teleproto generates a class per Telegram RPC error. Auth / connection error handling in
`TelegramContext.tsx` uses `instanceof` checks against the actually-installed classes:

```typescript
if (e instanceof errors.SessionRevokedError) { ... }
```

| Class | When |
|---|---|
| `errors.SessionRevokedError` | Saved session was killed by the user or Telegram |
| `errors.AuthKeyUnregisteredError` | Auth key no longer valid — treated as revoked |
| `errors.FrozenMethodInvalidError` | Account restricted; method blocked |
| `errors.FrozenParticipantMissingError` | Target account is frozen |
| `errors.EmailUnconfirmedError` | Sign-in requires email verification |
| `errors.SlowModeWaitError` | Chat has slow mode; `.seconds` gives the wait |
| `errors.FloodWaitError` | Rate-limited; `.seconds` gives the wait |

All seven class names are confirmed against `node_modules/teleproto/errors/index.d.ts`
and covered by `src/context/TelegramContext.errors.test.ts`.

### 7. Layer gate

`scripts/check-telegram-layer.mjs` compares `.telegram-layer.expected` (currently `228`)
against the installed MTProto client's `LAYER` constant. It now reads
`teleproto/tl/runtime/registry.js` first, falling back to the old vendored-`telegram`
paths only for the duration of the cutover window (removed once `vendor/gramjs` itself
is removed, DD-002). `src/version.ts`'s `TELEGRAM_LAYER_EXPECTED` matches.

### 8. Vite config

`vite.config.ts` references `teleproto` throughout — `resolve.dedupe: ["teleproto"]`
(one physical copy, one `tlobjects` map) and an `optimizeDeps.include` list covering
`teleproto`, `teleproto/sessions`, `teleproto/events`, `teleproto/Helpers`,
`teleproto/Utils`, `teleproto/client/downloads`, `teleproto/tl/custom/dialog`, and
`teleproto/extensions` (needed for `PromisedWebSockets`, see
[Browser-compatibility shims](#2-browser-compatibility-shims) above).

#### Fork patches — verify before removing

The vendor fork carried several Vite / TL patches that stock teleproto might not
include. Status after this migration:

| Patch | What it fixed | Status |
|---|---|---|
| Vite shared TL object map (`globalThis`) | Duplicate `tlobjects`, constructor-not-found in dev/prod | Addressed via `resolve.dedupe: ["teleproto"]` + `optimizeDeps.include` (§8 above) |
| `DialogCommunity` safe skip in `getDialogs` | App crashed on community dialogs | **Not independently re-verified against teleproto this pass** — no app-level special-casing was needed either way (no `DialogCommunity` reference exists in `src/`), but that alone doesn't confirm teleproto's own dialog handling is safe on this case, since the original fix was library-level, not app-level. Needs a dedicated check before this row is closed. |
| LAYER 228 `CustomMessage` / `richMessage` fields | Custom message fields not in base GramJS | **Partially addressed, not fully verified.** `patches/teleproto+1.228.5.patch` adds a missing `invertMedia` field to teleproto's own `CustomMessage` typings (confirmed present in the raw TL schema but absent from teleproto's `.d.ts`). teleproto's package also now ships its own `richMessage.js` / `tl/custom/message.js` natively, which didn't exist in GramJS. Whether every field the fork patch covered has an equivalent in teleproto is not confirmed. |
| Uncommitted L228 work in `vendor/gramjs` | Any local-only patches | Not audited this pass — submodule is still present (DD-002), audit before deleting it |

### 9. Optional: download pool

Not implemented this pass (tracked as AC-T12). teleproto exposes
`maxConcurrentDownloads` and `downloadPool` on `TelegramClientParams`; neither is
currently passed in `clientFactory.ts`. If a future pass wants to cap parallel media
fetches in the browser:

```typescript
const client = new TelegramClient(session, API_ID, API_HASH, {
  connectionRetries: 5,
  maxConcurrentDownloads: 4,
  downloadPool: { workers: 4 },
  // ...
});
```

### 10. Outbound markdown (Cycle A)

The compose box parses a small, teleproto-native markdown dialect on send.
`src/telegram/composeMarkdown.ts` wraps teleproto's built-in `MarkdownParser`
(`teleproto/extensions/markdown`); `src/hooks/useChatCompose.ts` calls it on all
three send paths — direct chat (`client.sendMessage`), forum thread
(`sendInForumThread` → `messages.SendMessage.entities`) and media caption
(`client.sendFile`) — passing `formattingEntities` when it returns a result.

**Supported delimiters:** `**bold**`, `__italic__`, `~~strike~~`, `` `code` ``.
(`` ```pre``` `` round-trips but teleproto's `md` parser matches the leading
single backtick first, so a fenced block degrades to inline `code`.)

**Lossless-only rule.** `parseComposeMarkdown` returns a parsed result **only**
when `MarkdownParser.unparse(parsed) === input` — i.e. re-inserting the
delimiters reproduces exactly what the user typed. teleproto's parser silently
drops an unmatched delimiter (`"a**b"` → `"ab"`); the guard rejects those cases
and the caller sends the **raw text verbatim**. No user character is ever lost;
the cost is that ambiguous input simply isn't formatted.

**Not supported in this mode** (no delimiter in teleproto's `md` set):
`[text](url)` links, `||spoiler||`, `@mention` resolution. Received messages
still render all of these — see `src/ui/MessageTextContent.tsx`. Adding them to
*outbound* composing is a separate composer feature, not part of the migration.

---

## Session continuity

teleproto's `StringSession` reads legacy 352-character GramJS / Telethon strings
directly — no data migration was needed. Confirmed byte-for-byte in
`src/telegram/stringSessionCompat.test.ts` against both packages' `StringSession`
source, with a synthetic (non-real) session fixture:

```typescript
import { StringSession } from "teleproto/sessions";

// Existing stored string still loads
const session = new StringSession(storedString);
```

New saves come out in teleproto's version-prefixed format (`"1" + base64`). Both
formats are read on load by both library generations, so a rollback would also work.

---

## Patch-package fix

`patches/teleproto+1.228.5.patch` (applied automatically via `package.json`'s
`postinstall: patch-package` hook) carries two focused fixes to teleproto `1.228.5`,
both confirmed as real upstream defects rather than app-side workarounds:

1. **`Helpers.js` `sleep()`** — teleproto called `setTimeout(...).unref()`
   unconditionally when its internal `isUnref` flag is set. Browser `setTimeout`
   returns a number, not a Node `Timeout`, and numbers have no `.unref()` — this threw
   in the browser on every use. GramJS gated the same call behind `platform.isNode`;
   the patch replaces that with a `typeof timer.unref === "function"` feature-detect.
2. **`tl/custom/message.d.ts`** — `CustomMessage`'s declared fields omitted
   `invertMedia`, even though the raw `Message` TL constructor still carries it and
   teleproto's runtime field-assignment loop still sets it — a types-only omission.
   Fixed by adding the same declaration GramJS's own typings carried.

See `patches/README.md` for the removal plan (drop once these land in an upstream
teleproto release).

---

## Tooling cleanup

Done, not pending:

| Artefact | What happened |
|---|---|
| `package.json` `preinstall` hook | Removed |
| `rebuild:telegram` / `build:telegram` npm scripts | Removed from `package.json` |
| `scripts/prepare-vendor-telegram.mjs` | **Unwired, not deleted.** The file is kept on disk, marked `RETIRED` in its own header comment, as a reference for as long as `vendor/gramjs` survives. It runs from no npm script or hook. |
| `scripts/check-telegram-layer.mjs` | Updated, not removed — reads teleproto's `LAYER` first (see [Layer gate](#7-layer-gate)) |

Removing the `preinstall` hook also fixed a real bug: the old hook silently overwrote
`.telegram-layer.expected` from GramJS's `LAYER` on every `npm install`, which could
fight `check-telegram-layer.mjs`'s teleproto-based check the next time the two layers
diverged.

`vendor/gramjs` (the submodule) and `vendor/telegram-built` (its gitignored build
output) are **intentionally still present**. Per `deferred.md` DD-002, the submodule is
kept for one stable release after this cutover before removal (AC-T15) — it is not yet
due. Don't delete it as part of unrelated cleanup.

---

## Deferred work

Tracked separately, not part of this migration's build:

- **AC-T12 — download pool.** See [Optional: download pool](#9-optional-download-pool) above.
- **AC-T13 — layer-gap reconciliation (DD-003).** Reconciling the four open L228 gap
  feature specs (rich-messages-render, communities-dialogs, ephemeral-messages,
  join-invite-chat-result) against teleproto's actually-shipped schema.
- **AC-T14 — `client.api` facade (DD-001).** Mass-adopting teleproto's facade over the
  current `invoke(new Api...)` call pattern is optional incremental follow-up.
- **AC-T15 — remove `vendor/gramjs` (DD-002).** Gated on one stable release post-cutover.

Full details and trigger conditions: `.tlk/features/2026-08-02-migrate-teleproto/deferred.md`.
