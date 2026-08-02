# Joining via invite link or username

Use the **Join invite** sheet to join a Telegram channel or group from within
Telegramito — either by pasting an invite link or entering a public username.

## Opening Join invite

The **Join invite** entry appears near the Write / New letter controls on the
Letters desk (overflow menu or sheet footer link). Tapping it opens the Join
invite sheet.

The sheet sits above the desk as a dismissible layer — close it with the ✕
button, the Escape key, a tap on the backdrop, or the system back gesture at
any time.

## Joining via an invite link

Private invite links take the form `t.me/+HASH`, `t.me/joinchat/HASH`, or
`tg://join?invite=HASH`.

1. Open the Join invite sheet.
2. Paste the link (or bare hash) into the input field.
3. Tap **Look up** — the sheet fetches the invite info and shows a preview
   with the channel / group title, member count, and a short description.
4. Tap **Join** to complete the join.
5. On success the sheet closes and you land in the new chat with the composer
   focused.

If you paste a full URL (`https://t.me/+…`) the app strips it to a hash
automatically; you do not need to trim the link first.

## Joining via a public username

Public channels and groups can also be joined by username.

1. Open the Join invite sheet.
2. Type or paste a username — either `@channelname` or a `t.me/name` URL
   (without a `+` or `joinchat` segment).
3. Tap **Look up** to resolve the username and show a preview.
4. Tap **Join**.
5. On success the sheet closes and you land in the chat.

When both a `+` invite hash and a `t.me` URL are present, the private invite
link takes priority.

## When Telegram requires an extra confirmation

Some channels or groups need a bot-guard check (CAPTCHA, terms, or approval
queue) before Telegram grants access. When this happens:

- The sheet shows: **"This chat needs a confirmation before you can join.
  Finish it in Telegram, then return here."**
- **Open in Telegram** (primary) — opens the Telegram app at the invite link
  to complete the step there.
- **Open in browser** (secondary, only if available) — opens the confirmation
  page in a new browser tab. This option appears only when Telegram supplies a
  web URL for the confirmation step; if that fetch fails the option is hidden.

After finishing the confirmation step externally, re-open the Join invite sheet
and try joining again.

The in-app Telegram WebView for guard flows is not yet implemented; the
external path is the supported route for all bot-guard / confirmation cases.

## Already a member, expired invites, and other errors

| Situation | What you see |
|-----------|--------------|
| You are already in the chat (`ChatInviteAlready`) | Sheet closes and navigates you to the existing chat. Optional brief status: "You're already in this chat." |
| Invite has expired | Inline error: "This invite has expired." with a **Try again** button so you can paste a newer link. |
| Invalid hash or username | Inline error: "That invite doesn't look valid." |
| Network or flood error | Inline error: "Couldn't join. Try again." |

Errors appear below the preview area; the sheet stays open so you can correct
the input or wait and retry.

## Create channel / New letter — unchanged

The **New letter** (compose) and **Create channel** flows are separate and are
not affected by the join / invite sheet. Those creation paths have always
returned plain `Updates` from Telegram and continue to work as before.

## Known limitations

- **In-app bot-guard WebView** — Telegramito does not run the confirmation
  WebView inline; guard flows must be completed in the Telegram app or a
  browser tab.
- **Full guard-bot matrix** — only the `Ok` and `WebView` result variants are
  handled end-to-end; rarer guard-bot outcomes fall back to a safe error
  message ("Couldn't join. Try again.") rather than a dedicated flow.
- **No clipboard auto-detect** — the sheet does not scan the clipboard on
  open; paste the link manually.
- **No QR / deep-link cold start** — joining from a `t.me` URL clicked outside
  the app (cold-start deep link) is not supported in this release; use manual
  paste.

---

*Covers `LettersJoinInviteSheet`, `JoinInvitePreview`, `JoinInviteOutcome`,
and `src/telegram/chatInviteJoinResult.ts` (unwrap helper). If join / invite
UI or the WebView fallback behaviour changes, update this page to match.*
