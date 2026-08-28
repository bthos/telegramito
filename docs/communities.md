# Communities

Telegram layer ≥ 228 introduces a new dialog type called a **Community** —
a grouping entity that links related channels and chats together under a shared
identity. Communities are distinct from ordinary channels and group chats and
have their own dialog row type (`DialogCommunity`).

## Appearance on the Letters desk

### Communities accordion

When your account has at least one community, a **Communities** accordion
appears in the main Letters list — after Correspondents and before Groups and
Channels. The accordion is **hidden entirely when there are no community rows**;
no empty state or placeholder is shown.

Communities are not a separate filter chip in the Letters chip bar and are not
reachable from Settings alone. They appear organically in the main list as
dialogs arrive from `getDialogs`.

> **Dormant until delivered.** The accordion becomes visible only when a
> `DialogCommunity` row (with a resolvable `Community` or `CommunityForbidden`
> entity) arrives through the normal dialog page fetch. Telegramito never
> initiates a background `getJoinedCommunities` poll or any speculative
> communities fetch.

### Community stub rows

Each community appears as a **stub row** inside the accordion. The row shows:

- A community glyph avatar (a static home / cluster mark — not a profile photo,
  because `DialogCommunity` carries no classic peer reference)
- The community's title, or `Community {id}` as a fallback when the title is
  unavailable
- A **"Community"** badge that visually distinguishes the row from regular
  letters, group chats, and channels
- A **mute glyph** when `DialogCommunity.notifySettings` indicates the community
  is muted (see [Mute state](#mute-state) below)

Community rows are **excluded from Groups and Channels** filters. They do not
appear in any filtered view that means "group" or "channel" — only in the
Communities accordion (and in the unfiltered list fallback).

Row press **opens the Community limitation sheet**; it does not select a
ChatView dialog or set a chat as active.

### Mute state

When the server signals that a community's notifications are muted, a small mute
glyph appears to the left of the Community badge. Community rows carry **no
unread count** — `DialogCommunity` does not provide classic unread semantics, so
no unread badge is shown in MVP.

## Opening a community

Tapping a community row always opens a **Community limitation sheet** — never a
chat message thread.

### What the sheet shows

1. **Community title** (or fallback/forbidden label) and the "Community" badge
   as context.
2. **Honest copy** explaining that communities are not fully supported in
   Telegramito yet and directing you to the official Telegram app.
3. **Linked spaces** — a read-only list of linked channels/groups, shown only
   when those peers are already present in the locally-loaded dialog or entity
   store. No speculative network fetch is made to obtain this list; if the peers
   are not local, the section is omitted.
4. **Open in Telegram** — the primary call-to-action. This opens Telegram Web
   (or a `tg://` deep link when a verified community deep-link is available) in
   a new tab / external browser.
5. **Close / drag-dismiss** — sheet dismisses via the close button, a swipe
   down, or Escape (keyboard); focus returns to the row.

### `CommunityForbidden` rows

If the entity arrived as `CommunityForbidden` (access restricted), the sheet
title reads "Unavailable community" and the body notes that access may be
limited. The same Open in Telegram CTA is shown.

### What the sheet does not do

- It does not fetch `communityFull` or call `communities.*` APIs in MVP.
- It does not allow linked-peer rows to open a chat unless that peer is already
  accessible as an ordinary dialog (and even then, the sheet keeps linked-peer
  rows non-interactive in MVP).
- It does not replace or push a ChatView.

## "Member of" profile hint

When a contact's profile resolves a `linkedCommunityId` and the matching
community entity is already loaded, a **"Member of {Community title}"** hint
appears in the user's profile or context panel. Tapping the hint opens the same
Community limitation sheet for that community.

The hint is **omitted entirely** when the entity is not locally available — no
speculative fetch is triggered.

## What is not supported yet

Telegramito's MVP covers honest display only. The following are deferred
(AC-C8):

- Browsing or navigating into linked channels and chats from the sheet
- Creating a new community
- Joining or leaving a community from within the app
- Managing participant permissions or peer-link approvals
- Community-scoped search (`messages.searchGlobal` with `community` flag)
- Folder organization by community (`dialogPeerCommunity`)

For any of these actions, use the **official Telegram app**.

## Limitations summary

| Area | Limitation |
|------|------------|
| **Stub rows only** | Community rows show title + badge; full community browsing is not available. |
| **Linked peers — local only** | The linked-peer list in the sheet shows only peers already in the local entity store. No communityFull fetch is made. If no local peers, the section is absent. |
| **No unread count** | Community dialogs carry no classic unread semantics; no badge count is shown. |
| **No community chip** | Communities appear in the main-list accordion, not as a filter chip in the Letters chip bar. |
| **Linked-peer rows non-interactive** | Peers listed in the sheet cannot be opened from there in MVP. |
| **No create / join / manage** | Community management is out of scope until AC-C8 is scheduled. |

---

*Covers `TelegramContext` dialog state, `dialogUtils.ts`, and teleproto's
`client/dialogs.js` (`node_modules/teleproto`). OQ-C1 closed as (b)-first hybrid;
OQ-C2 closed as main-list accordion; OQ-C3 closed as dormant-until-delivered.
If community row appearance, the open-behavior, or the profile hint changes,
update this page to match.*
