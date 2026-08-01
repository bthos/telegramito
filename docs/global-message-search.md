# Global message search

Telegramito has two complementary ways to search. You can search across all your chats at once from
the masthead — this is **global search**, described here. Or you can search within the chat you
already have open using the in-chat search icon in the thread header — described at the end of this
page.

## Searching across all chats (Passages)

Type anything into the search field at the top of the letters panel. While you type, two things
happen in parallel:

- **Dialog filter** — Correspondents, Groups, and Channels are narrowed to names that match your
  query. This works instantly, with no server round-trip.
- **Global search** — Telegramito searches message history across all your chats and shows the hits
  in a **§ Passages** section that appears above Correspondents in the sidebar.

Passages groups results by chat. Each chat cluster shows up to three matching excerpts, with a
count of how many matches were found in that chat on the current page. The words you searched for
are shown in **bold** wherever they appear in each excerpt, even when the server matched them as
separate words rather than a literal phrase.

### Navigating Passages

| Action | Result |
|---|---|
| Tap a passage row | Opens that chat and jumps straight to that message |
| Tap "See all in this chat →" | Opens in-chat search in that chat, pre-filled with your query, so you can page through all hits in that thread |
| Tap the **§ Passages** accordion header | Collapses or expands the section (tap again to toggle) |

### Cross-chat jump

When you tap a passage row, Telegramito switches to the chat the message belongs to and scrolls to
it. The message flashes briefly to confirm where you landed. This works regardless of which chat
you had open before — you don't need to open the destination chat first.

If a specific result can't be opened (for example, a chat that can't be loaded at the moment), that
row shows an inline "Couldn't open this chat" note while the rest of your results remain usable.

### Passages states

| What you see | What it means |
|---|---|
| Passages section absent | Query is shorter than two characters — start typing to activate it |
| Spinner next to "Passages" | Search is in progress |
| Grouped clusters | Results found; each cluster is one chat with matching messages |
| "No passages found for "{{query}}"" | Search completed, no matches across your history |
| "Couldn't search your letters." + **Retry** | A temporary error; tap Retry without re-typing |

### Excerpt highlighting

When you search for more than one word, every matched word is bolded in the excerpt, not just the
first one. The excerpt window is anchored on where the earliest match appears in the message, so
the context around the match is always visible — a leading `…` indicates that earlier text in the
message has been trimmed. If the server matched a message via a synonym or language variant that
isn't a literal substring of your query, that excerpt is shown without highlighting (this is a
server-side match the app can't independently detect).

---

## Searching within the open chat

A search icon appears in the thread header, to the left of the info button. Tapping it opens
in-chat search, which searches only the thread you're currently reading.

| In-chat search feature | How to reach it |
|---|---|
| Search the open chat | Tap the search icon (🔍) in the thread header |
| Navigate between results | Use the up/down arrows in the search bar |
| Close in-chat search | Tap the × in the search bar, or press Escape |

In-chat search is the right tool when you already know which chat your message is in and want to
page through all its matches. Global search (Passages) is the right tool when you're not sure which
chat a message is in.

> **Forum chats:** The search icon is always visible in forum chat headers. If you haven't opened a
> specific topic yet, tapping it shows a reminder to open a topic first — the search itself is per
> topic, not per forum.

---

## Groups and Channels when search finds no matches

When an active search query matches zero Groups or zero Channels, those sections stay visible with
an empty-state notice rather than disappearing. Two variants:

- **"No groups match "{{query}}""** — you have groups, but none match the current query.
- **"No groups yet"** — you haven't joined any groups yet (shown when the search field is empty too).

The same applies to Channels.

---

## Known limitations

- **Global search scope** — Passages searches the history available through Telegram's global
  search API. Very old messages in large chats may not surface if Telegram's index hasn't retained
  them.
- **Stemming and synonyms** — Telegram's server matches words flexibly (plural forms, related
  stems), but excerpt highlighting only bolds literal substring matches. A result that matched on a
  stemmed variant will appear in Passages without any bold.
- **Jump precision** — The jump lands on the correct message by id. If the initial scroll position
  is noticeably off before settling, that's a known scroll-timing issue being investigated
  separately (see deferred issue DD-001).
- **Passages are not persistent** — clearing the search field (or shortening it below two
  characters) removes the Passages section. Your results are not saved between sessions.

---

*Global search is implemented via `useGlobalMessageSearch` (new hook calling
`Api.messages.SearchGlobal`) surfaced as a "Passages" accordion section in `ChatsListPanel.tsx`.
Result clicks use `handleJumpToDialogMessage` in `useMainShellPassages.ts` / `useMainShellDialogSelection.ts`. The direct in-chat search icon lives in `ChatView.tsx`'s Letters thread
header. Per-word excerpt highlighting is in `SearchResultRow.tsx`. If search or jump behaviour
changes, update this page to match.*
