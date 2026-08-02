# Migrating from GramJS (vendor) to teleproto

Telegramito historically ran on a vendored fork of GramJS (`vendor/gramjs`, published
as `vendor/telegram-built`). The upstream GramJS project is archived; **teleproto** is
its maintained, GramJS-compatible successor — typed errors, auth email / reCaptcha hooks,
and ongoing TL layer updates (currently npm `1.228.x`).

This guide covers what developers need to change and what existing users will notice.

Reference: [Migrating from GramJS — teleproto docs](https://docs.teleproto.dev/migrating-from-gramjs)

---

## For users: what changes at login

Existing users **stay logged in** after an app update — your stored session is carried
over automatically (see [Session continuity](#session-continuity)).

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

## Developer migration

### 1. Swap the package

```bash
# Remove the vendored dep
npm uninstall telegram

# Install teleproto (pin to the layer you validated)
npm install teleproto@^1.228.0
```

In `package.json`, the entry changes from:

```jsonc
"telegram": "file:./vendor/telegram-built"
```

to:

```jsonc
"teleproto": "^1.228.0"
```

The `preinstall` hook (`scripts/prepare-vendor-telegram.mjs`) and the
`rebuild:telegram` / `build:telegram` scripts are no longer needed once
the npm package is the sole runtime source. Retire or delete them after
the migration is stable (see [Tooling cleanup](#tooling-cleanup)).

---

### 2. Rewrite imports

Every `"telegram"` import becomes `"teleproto"`. All subpaths follow the same
pattern — find-and-replace is safe:

```diff
-import { TelegramClient } from "telegram";
+import { TelegramClient } from "teleproto";

-import { StringSession } from "telegram/sessions";
+import { StringSession } from "teleproto/sessions";

-import { NewMessage } from "telegram/events";
+import { NewMessage } from "teleproto/events";

-import { Api } from "telegram/tl";
+import { Api } from "teleproto/tl";
```

Common subpaths in use today:

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

After the bulk rename, run `tsc --noEmit`. Newer TL layers tighten some request and
response types — fix what the compiler flags before running the code.

---

### 3. Replace `sendReadAcknowledge` with `markAsRead`

`sendReadAcknowledge` is removed in teleproto. The replacement is `markAsRead` with a
different signature:

```diff
-// GramJS
-await client.sendReadAcknowledge(chat, { maxId: 123 });

+// teleproto — single message
+await client.markAsRead(chat, 123);

+// teleproto — mark whole chat read + clear mentions
+await client.markAsRead(chat, undefined, { clearMentions: true });
```

Telegramito's `markChatRead.ts` already calls `messages.ReadHistory` /
`ReadDiscussion` via `invoke` for the primary read path. Audit the codebase for any
remaining `sendReadAcknowledge` callsites and rewrite them.

---

### 4. Wire auth challenge callbacks

`client.start` gains three optional callbacks for the challenges Telegram can now
issue. Supply them in `clientFactory.ts` / `TelegramContext.tsx`:

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

All three are optional — they are never invoked on flows that don't require them.
Existing phone / SMS / 2FA login paths are unchanged.

#### reCaptcha in a static PWA (v1 decision: honest block)

`reCaptchaCallback` must return a solved token. In a static browser-only PWA there is
no trusted WebView host or server side to proxy the solve.

**v1 decision (D8, closed):** reject the callback and set `loginStep →
"captchaBlocked"`. Abort the `client.start` promise cleanly — do not hang. Show the
user a blocking screen with copy along the lines of:

> *Telegram asked for a security check that Telegramito cannot complete in the browser.
> Finish signing in with the official Telegram app or web.telegram.org on this account,
> then return here. Existing saved sessions are unaffected.*

A single "Understood" button returns to `idle` so the user can try again after
completing sign-in externally. No in-app captcha widget is planned for v1. Wire the
hook and `loginStep` so a future widget can replace the block screen without reshaping
the state machine.

---

### 5. Adopt typed errors

teleproto generates a class per Telegram RPC error. Replace string comparisons with
`instanceof` checks:

```diff
-if (e.errorMessage === "SESSION_REVOKED") { ... }
+if (e instanceof errors.SessionRevokedError) { ... }
```

Priority classes to handle in auth / connection paths:

| Class | When |
|---|---|
| `errors.SessionRevokedError` | Saved session was killed by the user or Telegram |
| `errors.AuthKeyUnregisteredError` | Auth key no longer valid — treat as revoked |
| `errors.FrozenMethodInvalidError` | Account restricted; method blocked |
| `errors.FrozenParticipantMissingError` | Target account is frozen |
| `errors.EmailUnconfirmedError` | Sign-in requires email verification |
| `errors.SlowModeWaitError` | Chat has slow mode; `.seconds` gives the wait |
| `errors.FloodWaitError` | Rate-limited; `.seconds` gives the wait |

No requirement to rewrite every generic `e instanceof Error ? e.message` in the app —
focus on paths that already surface auth / connect failures to the user.

---

### 6. Layer gate

The existing `scripts/check-telegram-layer.mjs` compares `.telegram-layer.expected`
against the installed package's `LAYER` constant. After the swap:

- Update the check script to read `LAYER` from the `teleproto` package instead of
  `telegram`.
- Update `src/version.ts` `TELEGRAM_LAYER_EXPECTED` to match teleproto's shipped layer.
- Update `.telegram-layer.expected` to the pinned teleproto layer (≥ 228 with current
  npm).

---

### 7. Vite config

Update `vite.config.ts` to reference `teleproto` instead of `telegram`:

```diff
 optimizeDeps: {
   include: [
-    "telegram",
-    "telegram/sessions",
-    "telegram/events",
+    "teleproto",
+    "teleproto/sessions",
+    "teleproto/events",
     // add other subpaths used at import time
   ],
 },
 resolve: {
   dedupe: [
-    "telegram",
+    "teleproto",
   ],
 },
```

#### Fork patches — verify before removing

The vendor fork carries several Vite / TL patches that stock teleproto may not include:

| Patch | What it fixed | Status |
|---|---|---|
| Vite shared TL object map (`globalThis`) | Duplicate `tlobjects`, constructor-not-found in dev/prod | **Must verify** on teleproto npm before removing |
| `DialogCommunity` safe skip in `getDialogs` | App crashed on community dialogs | **Must verify** |
| LAYER 228 `CustomMessage` / `richMessage` fields | Custom message fields not in base GramJS | **Must verify** — may now be upstream |
| Uncommitted L228 work in `vendor/gramjs` | Any local-only patches | Audit before deleting submodule |

Run a browser spike (AC-T1 in the spec) — connect, `invoke`, deserialize one `Message`
in the Vite bundle — to confirm the above before the full import rewrite.

---

### 8. Optional: download pool

teleproto exposes `maxConcurrentDownloads` and `downloadPool` on `TelegramClientParams`.
Add these to `clientFactory.ts` to cap parallel media fetches in the browser:

```typescript
const client = new TelegramClient(session, API_ID, API_HASH, {
  connectionRetries: 5,
  maxConcurrentDownloads: 4,
  downloadPool: { workers: 4 },
  // ...
});
```

---

## Session continuity

teleproto's `StringSession` reads legacy 352-character GramJS / Telethon strings
directly — no data migration needed:

```typescript
import { StringSession } from "teleproto/sessions";

// Existing stored string still loads
const session = new StringSession(storedString);
```

New saves come out in teleproto's version-prefixed format (`"1" + base64`). Both
formats are read on load by both library generations, so a rollback would also work.

---

## Tooling cleanup (AC-T11)

Once the npm package is the sole runtime source and the migration is stable:

| Artefact | Action |
|---|---|
| `scripts/prepare-vendor-telegram.mjs` | Delete |
| `scripts/rebuild:telegram` npm script | Delete from `package.json` |
| `scripts/build:telegram` npm script | Delete from `package.json` |
| `package.json` `preinstall` hook | Delete (ran the prepare script) |
| `vendor/gramjs` submodule | Keep until one stable release post-cutover (OQ-T3), then remove with `git submodule deinit` |
| `vendor/telegram-built` | Gitignored build output — gone once the submodule is removed |

Update the contributing / setup section of the README once the submodule is gone so
new developers don't look for a build step that no longer exists.

---

## Checklist summary

- [ ] Browser spike passes (connect + invoke + deserialize in Vite bundle)
- [ ] `npm uninstall telegram && npm install teleproto@^1.228.0`
- [ ] All `from "telegram"` / `from "telegram/…"` rewritten to `teleproto` in `src/` and tests
- [ ] `sendReadAcknowledge` callsites replaced with `markAsRead`
- [ ] Auth challenge callbacks wired (`emailAddress`, `emailVerification`, `reCaptchaCallback`)
- [ ] Typed error handling in auth / connect paths
- [ ] Layer gate updated (script + `.telegram-layer.expected` + `src/version.ts`)
- [ ] Vite `optimizeDeps` / `dedupe` updated
- [ ] Fork patches verified or re-applied on teleproto
- [ ] `tsc -b` and `npm run build` green
- [ ] Existing StringSession reconnects without re-login (smoke test)
- [ ] Tooling scripts retired (after stable)
