# Back button navigation

On Android — whether Telegramito is installed as a standalone app or open in a mobile browser
tab — and in desktop browsers, the Back button (hardware key, edge-swipe gesture, or browser Back)
navigates *within* the app instead of immediately closing or leaving it. Whatever is currently on
top — a photo or video viewer, an emoji picker, a menu, a panel, an open chat — closes first, one
thing at a time, in the reverse order it was opened. Once nothing is left open, Back on desktop
focuses the search field; on phones it starts to exit the app, asking for confirmation first.

## What Back closes, one press at a time

Each press closes exactly one thing: whatever was opened most recently. If several things are open
at once, Back peels them off in reverse order, like a stack.

| Currently open | What one Back press does |
|---|---|
| Photo/video viewer (lightbox, full-screen media) | Closes the viewer, returns to the chat |
| Emoji picker, attachment menu, reaction picker, date-jump calendar, poll-voters list, reaction-repliers list, chat info panel | Closes that popover/panel, returns to what was beneath it |
| PIN prompt | Closes the prompt |
| A sheet (e.g. the letters desk sheet, day-mail slide-over) | Closes the sheet |
| Expanded search (masthead search bar, or search inside a chat) | Collapses the search bar |
| An open chat | Returns to the chat list |
| Settings or Requests | Returns to the Chats tab |

**Example:** if you have a chat open and pop the emoji picker on top of it, the first Back press
closes the emoji picker only — you're still in the chat. The next Back press closes the chat and
returns you to the chat list.

Closing something with Back has exactly the same effect as closing it any other way (tapping its
close button, tapping outside it, or pressing Escape on desktop) — nothing is lost: scroll position,
whatever you'd typed in the message box, and your selected chat are all preserved.

## Back at the root

Once you're back at the chat list with nothing else open, what Back does depends on the device.

**Desktop browsers** (the masthead search field is on screen): Back focuses the search field, as in
Telegram Web K. It never leaves the app and never shows a message, however many times you press it.

**Phones and narrow windows** (no desktop search field): Back doesn't exit right away. The first
press shows a brief message:

> Press Back again to exit

Pressing Back again within about two seconds exits. If you wait longer than that — or do anything
else instead, like tapping into the chat list or opening a chat — the message goes away and the next
Back press starts over from "press again to confirm," rather than exiting immediately.

This message reuses the app's existing lightweight status-message style (the same look as the
"message sending, tap to cancel" note that appears while sending a message) — it's not a new kind
of pop-up.

## Where this applies

This works identically everywhere Telegramito runs on Android or desktop for layers (everything in
the table above). Only the root behaviour differs, as described in "Back at the root":

- Installed as a standalone app on the phone: press Back again to exit
- Open in a mobile browser tab: press Back again to exit
- Open in a desktop browser: Back focuses search

There's no difference in how layers close between these — the same rules apply regardless of device
or window size.

## Known limitation: iOS

iOS doesn't give web apps a hardware or gesture Back button to intercept the way Android and
desktop browsers do, so none of the above applies there. iOS users see no change in behavior.

---

*Implemented in `src/hooks/useHardwareBack.ts` (`installHardwareBackRoot`, `useHardwareBackLayer`)
and wired into `src/ui/MainShell.tsx`. If future changes to back-navigation behavior diverge from
this description, update this page to match.*
