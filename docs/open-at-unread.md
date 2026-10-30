# Opening a chat at its first unread message

Opening a chat that has unread messages lands on the first unread one, like Telegram, instead of
jumping to the bottom. A divider ("You paused here · date") marks the read/unread boundary and
stays in place for the whole visit, even while messages are being marked read. A chat with nothing
unread opens at the latest message as before.

## Behaviour

- **Landing.** The first page is fetched around the read horizon (`readInboxMaxId`): about 20
  read messages above the boundary and up to 40 unread below it. The divider is scrolled to the top
  of the transcript. If few messages are unread, the position is clamped by the end of the chat.
- **Paging.** Scrolling down loads newer pages until the live tail; scrolling up loads older ones.
  The "jump to latest" button reloads the live tail and scrolls to the bottom.
- **Read receipts follow the screen.** Messages are marked read up to the last one actually in the
  viewport (debounced), not up to the last one loaded. Reaching the live tail keeps the old
  "read to the latest" behaviour. Nothing is marked read before the landing position is settled.
- **Channels and supergroups** are marked read with `channels.ReadHistory`; `messages.ReadHistory`
  rejects those peers (`PEER_ID_INVALID`), so their unread state never used to persist.
- **Forum topics** use the topic's own `readInboxMaxId` / `unreadCount`.
- **Jumps win.** Opening a chat to a specific message (search result, day mail, co-reading link)
  skips this behaviour.

## Where it lives

| Piece | File |
|---|---|
| Frozen read horizon per `convKey`, wiring | `src/ui/ChatView.tsx` |
| Initial around-unread page | `src/hooks/useChatMessages.ts` (`openAtUnreadReadMaxRef`) |
| Landing scroll | `src/hooks/useOpenAtFirstUnread.ts` |
| Viewport-based read id | `src/hooks/useViewportMaxMessageId.ts` |
| Divider row | `src/util/threadCatchUp.ts` |

## Reaction picker (related)

Reaction artwork is kept in the browser Cache API (`reaction-icons-v1`, keyed by document id), so
after the first run the picker paints from disk instead of downloading ~75 icons on every page load
(which also trips Telegram's media flood limit). Until an icon is available the picker shows the
native emoji, so the grid is never blank. The popover uses the Letters glass skin (`letters.css`);
message actions (reply, forward, co-reading, pin/unpin) carry icons from `ChatChromeIcons.tsx`.

## Loading animation

The boot screen (`BootLoading`) shows the app mark broadcasting radio waves — thin rings spreading
outward and fading (`.app-boot__wave` in `app.css`). With `prefers-reduced-motion` the rings are
static.
