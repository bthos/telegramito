# npm patches (`patch-package`)

Use only for **urgent** fixes to a dependency before the change lands upstream. Each file in
this directory should map to one focused patch.

- Add a patch: `npx patch-package <package-name>` after editing files under `node_modules/`.
  (If `npx patch-package <name>` fails to create the patch itself — e.g. its temp-install step
  errors with no useful output — diff a fresh `npm install <name>` in a scratch directory
  against your edited `node_modules/<name>` and hand-assemble the unified diff with
  `a/node_modules/<name>/...` / `b/node_modules/<name>/...` path prefixes; `patch-package` applies
  a correctly-formatted file the same way regardless of how it was produced.)
- Every patch must reference a **tracking issue** (this repo or upstream) and a **removal plan**
  (e.g. “remove once teleproto ships a fix upstream”).

## `teleproto+1.228.5.patch` (migrate-teleproto)

Two focused fixes to teleproto `1.228.5` (npm), both confirmed as real upstream defects (not
app-side workarounds) — originally verified by diffing against the (now-removed) vendored GramJS
build, which handled both cases correctly:

1. **`Helpers.js` `sleep()`** — teleproto calls `setTimeout(...).unref()` unconditionally when
   `isUnref` is true. GramJS gates the same call behind `platform.isNode` (browser `setTimeout`
   returns a number, not a Node `Timeout` — no `.unref()`). Without the guard, teleproto's
   internal `_updateLoop` throws `setTimeout(...).unref is not a function` in the browser.
   Fixed with a `typeof timer.unref === "function"` feature-detect instead.
2. **`tl/custom/message.d.ts`** — `CustomMessage`'s declared fields omit `invertMedia`, even
   though the raw `Message` TL constructor still carries it (confirmed via
   `tl/generated/api-definitions.js`'s `argsConfig`) and teleproto's generic per-field
   constructor loop (`tl/runtime/createApi.js`) still assigns it at runtime — a `.d.ts`-only
   omission. Added an `invertMedia?: boolean` declaration in both the `MessageBaseInterface` and
   `CustomMessage` class sections (matching what GramJS's typings carried).

**Removal plan:** drop this patch (and re-run `npx patch-package teleproto` to regenerate empty)
once these are fixed in an upstream teleproto release — check `CHANGELOG`/diff `Helpers.js` and
`tl/custom/message.d.ts` on `npm install teleproto@latest` before removing.

## Structural media repair (telegramito)

After teleproto deserializes messages, **`src/telegram/messageMediaGramRepair.ts`** (`repairMessageAfterGramJs` — historical name) normalizes a few wire shapes into concrete `MessageMedia` the UI already understands (e.g. `document` + `MessageMediaEmpty` → `MessageMediaDocument`). It runs from **`toMessageList`** and forum / recent-media fetch paths. Extend there when a new TL quirk is **safe to infer** without raw buffers; a true binary-decode bug belongs in a `patch-package` patch against teleproto, not here.
