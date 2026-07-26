# Circles — Stories

On mobile (phone-width screens), the **Circles** tab in the bottom tab bar shows Stories: a
horizontal strip of circular rings for the contacts who currently have an active story, and a
full-screen viewer when you tap one. This tab is mobile-only — there's no separate desktop or
tablet layout to learn, since the tab itself doesn't appear above phone width.

Circles is **view-only** in this release. You can watch stories from your contacts, but you
can't post, edit, or delete a story of your own, and you can't react or reply to someone else's.

The groups and channels the Circles tab used to show haven't gone away — they now live inside
the **Letters** tab, in its own expandable section, exactly where they were reachable before.

## Ring strip

Each ring in the strip is a contact's avatar with a colored outline around it. The outline tells
you, at a glance, whether there's something new to watch:

| Ring | Meaning |
|---|---|
| Gradient ring (warm terracotta-to-gold) | **Unread** — this person has at least one story you haven't seen yet. |
| Thin, muted ring | **Fully read** — you've already watched everything they've posted in the last 24 hours. |
| Plain, neutral ring | **Your own** active story, if you have one. It's shown for reference only — there's no "add a story" button here, and your own ring never turns into the unread/read colors above, since read state doesn't apply to your own content. |

Your own story, when you have one, always appears first in the strip. After that, contacts with
something unread come before contacts you've already caught up on.

Watching a story doesn't create a third, "partially seen" ring state — a contact's ring stays in
the unread (gradient) state until you've watched everything they've posted. If you step away
partway through someone's stories, reopening their ring picks up right where you left off rather
than starting over; opening a ring you've already fully watched replays it from the beginning.

If none of your contacts currently have an active story, the tab shows a short empty message
instead of a blank screen.

## Story Viewer

Tapping a ring opens the story full-screen. A thin progress bar across the top shows how many
stories that person has and how far you are through them; it fills in as each story plays.

### Navigating

| Gesture | What happens |
|---|---|
| Tap the right ~65% of the screen | Go to the next story. At the end of someone's stories, moves on to the next person. |
| Tap the left ~35% of the screen | Go back one story. At the very first story of that person, jumps to the previous person's last story. |
| Swipe left / right | Jump straight to the next or previous person, skipping ahead of any stories still left in the current person's stack. |
| Swipe down, tap ✕, or press Escape | Close the viewer and return to the ring strip. |

### Auto-advance

You don't have to tap through every story manually:

- **Photo stories** play for 5 seconds, then advance automatically.
- **Video stories** play to the end, with sound, before advancing — they're never cut short by a
  timer.

### Marking as read

Watching a story marks it read. The ring updates from the unread gradient to the muted "read"
style once you close the viewer (or once you've moved past every story that person has). Your
own story is the exception — it never has a read/unread state to update.

## What's not here yet

- **Posting a story of your own** isn't supported — Circles is watch-only.
- **Reactions and replies** to someone else's story aren't available.
- **Story archives / highlights** (older or pinned stories beyond the current 24-hour window)
  aren't shown.

## A note on parental controls / night mode

This app's night-lock and child-mode restrictions are expected to apply to Stories the same way
they already apply elsewhere in Letters — a locked notice in place of the strip during night
mode, and other contacts' rings simply not appearing if they're restricted. This part of the
behavior is still pending explicit sign-off and may be refined before it ships; treat it as the
intended direction rather than a finalized guarantee.

---

*Documented from `.tlk/features/2026-07-25-letters-circles-stories-tab/spec.md` and
`ux-design.md` ahead of implementation. Once built, this feature is expected to live in
`src/ui/StoriesRailStrip.tsx`, `src/ui/StoryViewer.tsx`, and `src/hooks/useStoriesFeed.ts`
(component names per the UX design's component hierarchy) — if the shipped behavior diverges
from what's described here, update this page to match rather than leaving both around.*
