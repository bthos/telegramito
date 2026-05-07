# npm patches (`patch-package`)

Use only for **urgent** fixes to a dependency before the change lands in `vendor/gramjs`
(or upstream). Each file in this directory should map to one focused patch.

- Add a patch: `npx patch-package <package-name>` after editing files under `node_modules/`.
- Every patch must reference a **tracking issue** (this repo or gram-js) and a **removal plan**
  (e.g. “remove after submodule bump ≥ …”).
- Prefer fixing **source in `vendor/gramjs`** and running `npm run rebuild:telegram` instead of
  long-lived patches here.

## Structural media repair (telegramito)

After GramJS deserializes messages, **`src/telegram/messageMediaGramRepair.ts`** (`repairMessageAfterGramJs`) normalizes a few wire shapes into concrete `MessageMedia` the UI already understands (e.g. `document` + `MessageMediaEmpty` → `MessageMediaDocument`). It runs from **`toMessageList`** and forum / recent-media fetch paths. Extend there when a new TL quirk is **safe to infer** without raw buffers; keep binary fixes in the submodule.
