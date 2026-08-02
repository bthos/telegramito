# Rich messages

Telegram layer ≥ 228 lets senders attach an Instant-View-style **rich body**
(`RichMessage`) to a message — a structured multi-block layout similar to the
PageBlock format used by Telegram's Instant View articles. Telegramito receives
and deserializes these bodies automatically but does not yet render the full
block layout.

Instead, rich bodies are shown with a compact **inline stub** — a typographic
mark, a localized "Rich message" label, and optionally a short excerpt pulled
from the first readable text block. Every surface that can show a rich body
uses the same rule, so no message, preview, search hit, or draft row is ever
left blank.

---

## When the stub appears

The stub shows on a message when **all three** of the following are true:

1. The message has a `richMessage` field set.
2. The plain-text `message` string is empty or contains only whitespace.
3. No other media (photo, video, document, poll, etc.) already fills the
   bubble.

If any of those conditions is false, the stub is not shown:

| What the message contains | What you see |
|---|---|
| Plain text only | Plain text and formatting entities, as today |
| Plain text **and** a rich body | Plain text only — the rich body is not shown twice |
| Rich body only, no other media | Inline stub (label ± excerpt ± Open in Telegram) |
| Rich body **and** a photo / video / document (empty caption) | Media UI — no stub |
| Neither plain text nor rich body nor media | Existing empty-message fallback |

---

## Chat bubble (rich-only message)

When the stub rule fires in the chat thread, the bubble shows:

1. **A typographic glyph** (¶ or equivalent newsprint mark) beside the label —
   decorative, not read aloud by screen readers.
2. **"Rich message"** — the primary label, rendered at body-text weight. This
   is always present.
3. **A short excerpt** — optional second line, muted, showing the opening text
   from the first block of the rich body when it can be extracted quickly. If
   the rich body is large or the first block is not a plain-text block, the
   excerpt is omitted; the label alone is shown instead.
4. **"Open in Telegram"** — an optional one-tap affordance to open the same
   message in the official Telegram app for your platform where the full layout
   is rendered. This control appears only when Telegramito can construct a safe
   link to the message (typically when the peer has a known username). When no
   safe link exists, the control is omitted; the stub label remains.

The bubble timestamp and read-state tick are always visible — the stub is a
normal bubble, not an error card.

> **Why a stub and not an "Unsupported message" card?**
> Rich bodies *do* decode correctly on layer ≥ 228 — the field arrives and is
> parsed. The unsupported-media card ("Check for update") is reserved for
> types that are genuinely unknown to the client. A rich body is known; only
> its full in-app rendering is deferred. Using the unsupported card here would
> give the false impression that the app is out of date.

---

## Dialog list and Letters desk

The last-message preview line in the dialog list and on the Letters desk uses
the same rule:

- If a cheap plain excerpt is available from the rich body, the excerpt
  (truncated to the row's usual character limit, ~72 characters) is shown
  as the preview line.
- Otherwise the "Rich message" label is shown.

The preview row is never blank for a rich-only last message.

---

## Global and in-chat search

Search result rows that match a message carrying only a rich body show the
"Rich message" label (or excerpt) as the excerpt text. Because the plain-text
string is empty, the search query will usually not highlight against the
excerpt; that is expected in this release. Fake plain text is never invented
to manufacture a highlight match.

---

## Drafts

A draft that was saved with only a rich body and no plain-text string is shown
in the draft row and on the Letters desk using the rich-message label — not as
a blank row or as a generic "Attachment draft" stub. If the draft also contains
media (photo, document, etc.), the existing media preview takes precedence and
the rich label is not shown separately.

Editing a rich-only draft in the composer is not supported (see Known
limitations below).

---

## Open in Telegram

Where available, the "Open in Telegram" affordance in a rich-only bubble opens
the message in the official Telegram application so you can read the full
formatted layout — headings, embedded images, code blocks, and the rest of the
Instant-View structure.

When Telegramito cannot construct a safe link to the message (private peers
without a public username, or messages without a stable deep-link), the
affordance is omitted. The stub label and optional excerpt remain visible.

---

## Known limitations

- **No in-app rich layout.** The full `PageBlock` / Instant-View renderer is
  deferred. Only the compact stub (label and optional excerpt) is shown in
  v1. Use the official Telegram app for the complete reading experience.
- **Compose / send not supported.** Telegramito is receive-only for rich
  bodies. You cannot write or send a `RichMessage` from the app.
- **Composer editing of rich drafts not supported.** Drafts pre-filled with a
  rich body are visible via the stub label, but the composer cannot load or
  edit the rich content. Sending the draft from Telegramito will send only the
  plain-text portion (which is empty if the draft was rich-only).
- **Excerpt availability.** The short secondary excerpt is extracted without
  a full layout pass; it appears only when the first text block of the rich
  body is directly readable. Large or structurally complex rich bodies will
  show the label alone.
- **"Open in Telegram" availability.** The one-tap affordance appears only
  when a safe peer link can be constructed. It is absent for messages in
  private groups/channels without a public username.
- **Search highlighting.** Query-term highlighting against the stub excerpt
  is not guaranteed because there is no plain-text index for rich bodies.

---

*Covers `src/ui/MessageTextContent.tsx` (`MsgRichStub`), dialog preview
helpers (`dialogPreview.ts`, `dialogDraft.ts`), search excerpt helpers
(`SearchResultRow.tsx`), and i18n keys `chat.previewRichMessage`,
`chat.richMessageStubHint`, `chat.richMessageOpenInTelegram`. If stub
behavior, excerpt strategy, or the Open-in-Telegram affordance changes,
update this page to match.*
