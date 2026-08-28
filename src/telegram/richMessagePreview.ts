import { Api } from "teleproto"
import { toPlainText } from "teleproto/richMessage"

/**
 * rich-messages-render (Layer 228): a `Message` / `DraftMessage` can carry an
 * Instant-View-style `richMessage` block tree while leaving plain `message`
 * empty. teleproto deserializes and can render it (`teleproto/richMessage`),
 * but Telegramito's text surfaces treat such a body as blank. These pure
 * helpers detect the "rich-only" case and produce an honest one-line preview
 * (bounded excerpt, else a localized label) — v1 renders no PageBlock layout.
 */

type Tr = (key: string, options?: Record<string, string | number | undefined>) => string

/** Narrow a `TypeRichMessage` to the concrete renderable `RichMessage`. */
export function isRichMessage(x: unknown): x is Api.RichMessage {
  return x instanceof Api.RichMessage
}

/**
 * True when the message/draft has a renderable `richMessage` and no plain text
 * of its own. Media, when present, still supplies the bubble — callers that
 * care about that check media separately (the matrix in `ux-design.md`).
 */
export function isRichOnly(o: {
  message?: string | null
  richMessage?: unknown
}): boolean {
  const plain = typeof o.message === "string" ? o.message.trim() : ""
  return plain.length === 0 && isRichMessage(o.richMessage)
}

/**
 * Bounded plain-text excerpt from the first few blocks of a rich body.
 * `toPlainText` walks the whole tree, so list/preview callers pass a small
 * `maxBlocks` to stay O(small) on every paint (spec §"Excerpt rules").
 * Returns `null` on empty content or any error — never throws.
 */
export function richMessageExcerpt(
  rm: unknown,
  maxLen = 120,
  maxBlocks = 3,
): string | null {
  if (!isRichMessage(rm)) {
    return null
  }
  try {
    const blocks = Array.isArray(rm.blocks) ? rm.blocks.slice(0, maxBlocks) : []
    if (blocks.length === 0) {
      return null
    }
    const text = toPlainText(blocks).replace(/\s+/g, " ").trim()
    if (!text) {
      return null
    }
    return text.length > maxLen ? `${text.slice(0, maxLen - 1).trimEnd()}…` : text
  } catch {
    return null
  }
}

/**
 * Single preview string for list / search / draft rows: a cheap excerpt when
 * one is available, otherwise the localized rich-message label. Never blank.
 */
export function richMessagePreviewLine(rm: unknown, t: Tr, maxLen = 72): string {
  return richMessageExcerpt(rm, maxLen) ?? t("chat.previewRichMessage")
}
