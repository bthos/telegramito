# Pinned messages

Any message in a chat can be pinned so it stays easy to find — a banner at the top of the chat
keeps a link to it, even as new messages arrive underneath.

## Pinning and unpinning

Tap a message to open its action menu — the same menu used for Reply and Forward. If the message
isn't pinned yet, the menu shows **Pin**; if it's already pinned, it shows **Unpin** instead. The
menu closes as soon as you tap either one.

Pinning is silent: the other person (or the group/channel) is not notified that a message was
pinned. There's currently no option to pin with a notification.

### Permission is enforced by the server, not the app

In private chats, either side can pin. In groups and channels, pinning requires pin rights — the
app doesn't check this ahead of time, it just tries the pin and lets Telegram's servers decide. If
you don't have the rights, you'll see an error toast and the pin won't take effect. This is
expected behavior in restricted groups/channels, not a bug.

## The pinned banner

Once a chat has at least one pinned message, a banner appears at the top of the chat, above the
messages, showing a one-line preview of the currently referenced pinned message. If nothing is
pinned, no banner appears.

| Action | Result |
|---|---|
| Tap the banner | Jumps to and highlights that pinned message in the chat |
| Tap the banner (with multiple pins) | Jumps to the current one, then advances to the next |
| Tap the `×` | Dismisses the banner for this viewing only |

### Multiple pinned messages

When more than one message is pinned, the banner also shows a count, e.g. **"3 pinned"**. Each tap
jumps to the message the banner is currently showing, then cycles the banner to the next pinned
message (newest to oldest, wrapping back to the newest after the last one). With exactly one pinned
message, no count is shown — the banner just jumps to it.

There's no separate "view all pinned messages" list yet; cycling through the banner is the way to
reach any of them.

### Dismissing is per-session only

The `×` on the banner hides it for as long as you're looking at that chat. It is **not**
remembered — closing and reopening the chat (or switching away and back) brings the banner back if
messages are still pinned. There's no persisted "don't show me this pin again" yet.

### Forum topics

In a forum shown as separate topic threads, the banner reflects only the pins of the topic you have
open, not pins from other topics in the same forum.

## Known limitations

- No live update while the chat is open — if someone else pins or unpins a message while you're
  looking at the thread, the banner won't reflect it until you reopen the chat or the topic (or you
  pin/unpin something yourself).
- No "pin for me only" — a pin is always a real pin, visible to the pin rights model the chat/group
  already has.
- No dedicated pinned-messages list screen — see "Multiple pinned messages" above.

---

*Implemented via `client.pinMessage`/`client.unpinMessage` in `src/telegram/pinnedMessages.ts`, the
`usePinnedMessages` hook, and `PinnedMessageBanner` rendered from `ChatView.tsx`. The Pin/Unpin
action lives in `src/ui/MessageReactionPicker.tsx` alongside Reply/Forward. If pin/unpin behavior
changes, update this page to match.*
