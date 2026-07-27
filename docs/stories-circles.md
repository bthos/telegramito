# Circles — Stories

On mobile (phone-width screens), the **Circles** tab in the bottom tab bar shows Stories: a
corkboard of postcards for the contacts who currently have an active story, and a full-screen
viewer when you tap one. This tab is mobile-only — there's no separate desktop or tablet layout
to learn, since the tab itself doesn't appear above phone width.

Circles is **view-only** in this release. You can watch stories from your contacts, but you
can't post, edit, or delete a story of your own, and you can't react or reply to someone else's.

The groups and channels the Circles tab used to show haven't gone away — they now live inside
the **Letters** tab, in its own expandable section, exactly where they were reachable before.

## The corkboard

Each contact with an active story is pinned to the board as a small postcard: a pin at the top,
their photo below it, and their name underneath. The photo itself tells you, at a glance,
whether there's something new to watch:

| Postcard | Meaning |
|---|---|
| Full-color photo, with a small dot next to the name | **Unread** — this person has at least one story you haven't seen yet. |
| Sun-faded (desaturated) photo, no dot | **Fully read** — you've already watched everything they've posted in the last 24 hours. |
| Neutral pin, no dot, no color treatment | **Your own** active story, if you have one. Shown for reference only — there's no "add a story" affordance here, and your postcard never takes on the unread/read look above, since read state doesn't apply to your own content. |

Your own story, when you have one, always appears first on the board. After that, contacts with
something unread come before contacts you've already caught up on.

Watching a story doesn't create a third, "partially seen" look — a contact's postcard stays
full-color until you've watched everything they've posted. If you step away partway through
someone's stories, reopening their postcard picks up right where you left off rather than
starting over; reopening one you've already fully watched replays it from the beginning.

If none of your contacts currently have an active story, the board shows a short note instead of
a blank screen ("No stories yet — nobody's pinned one to the board.").

## Story Viewer

Tapping a postcard opens the story full-screen. A thin segmented bar across the top shows how
many stories that person has and how far you are through them; it fills in as each story plays.

### Navigating

| Gesture | What happens |
|---|---|
| Tap the right ~65% of the screen | Go to the next story. At the end of someone's stories, moves on to the next person. |
| Tap the left ~35% of the screen | Go back one story. At the very first story of that person, jumps to the previous person's last story. At the very first story of the very first person, nothing happens. |
| Right / Left arrow keys | Same as tapping the right / left zone — full keyboard parity, no swipe required. |
| Tap ✕ or press Escape | Close the viewer and return to the corkboard. |
| Swipe left / right | *Not yet available.* Jumping straight to another person by swiping is planned but not shipped in this release — the tap zones (or arrow keys) reach the same stories today, just one step at a time. |
| Swipe down | *Not yet available.* Closing by swiping down is planned but not shipped — use ✕ or Escape instead. |

### Auto-advance

You don't have to tap through every story manually — in this release, **every story, photo or
video, plays for a fixed ~5 seconds and then advances automatically.** Video does not yet play to
its natural length before advancing; that's a planned follow-up, not current behavior, so a
longer video may be cut short by the timer.

### Marking as read

Watching a story marks it read. Once you've seen everything a contact has posted — whether by
closing the viewer or advancing past their last story — their postcard's photo fades to its
sun-faded "read" look and the dot next to their name disappears. Your own postcard is the
exception: it never carries a dot or a read/unread state to update.

## What's not here yet

- **Posting a story of your own** isn't supported — Circles is watch-only.
- **Reactions and replies** to someone else's story aren't available.
- **Story archives / highlights** (older or pinned stories beyond the current 24-hour window)
  aren't shown.
- **Swiping** — left/right to jump between people, or down to close the viewer — isn't shipped
  yet; the tap zones, arrow keys, ✕, and Escape cover the same ground for now.
- **Video playing to its natural length** before advancing — video currently uses the same fixed
  ~5 second timer as photos (see Auto-advance above).

## Parental controls and night mode

Stories follow the same night-lock and child-mode rules as the rest of Letters:

- **Night mode:** while night-lock is active, the corkboard doesn't fetch or show any stories at
  all — you'll see the same kind of locked notice used elsewhere in Letters, and nothing already
  fetched is held onto in the meantime. The board returns automatically once night-lock lifts.
- **Child mode:** if a contact's stories are restricted in child mode, that person's postcard is
  silently left off the board — there's no "N hidden" note anywhere. If they were the only
  person with an active story, the board simply shows the same empty message as when nobody has
  stories at all, so there's no way to tell "no one has stories" apart from "someone was
  filtered out."

---

*This feature is built and shipped: `src/ui/StoriesRailStrip.tsx` (the corkboard),
`src/ui/StoryViewer.tsx` (the full-screen viewer), and `src/hooks/useStoriesFeed.ts` (data
fetch, read-state, and night-lock/child-mode gating). Documented against
`.tlk/features/2026-07-25-letters-circles-stories-tab/tech-plan.md` and the shipped source. If a
later pass adds natural-duration video playback or swipe gestures (see the two Known Gaps
above), update this page to match rather than leaving it stale.*
