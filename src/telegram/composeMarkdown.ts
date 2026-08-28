import { Api } from "teleproto"
import { MarkdownParser } from "teleproto/extensions/markdown"

export type ParsedCompose = {
  /** Input text with the markdown delimiters stripped. */
  message: string
  /** Formatting entities, offsets relative to the stripped `message`. */
  entities: Api.TypeMessageEntity[]
}

/**
 * Parse compose-box markdown with teleproto's built-in {@link MarkdownParser},
 * but only when the parse is **lossless** — it produced at least one entity AND
 * re-inserting the delimiters (`MarkdownParser.unparse`) reproduces the exact
 * input. Unmatched or ambiguous delimiters (`"a**b"`, one stray backtick, a
 * `` ` `` inside a word) make `MarkdownParser.parse` silently drop characters,
 * so in those cases this returns `null` and the caller sends the text verbatim.
 * User input is never mangled.
 *
 * Delimiter set is teleproto-native and intentionally small:
 * `**bold**`, `__italic__`, `~~strike~~`, `` `code` ``, ` ```pre``` `.
 * `[text](url)` links, `||spoiler||` and `@mention` are **not** parsed in this
 * mode (no delimiters for them) — see `docs/migrate-teleproto.md`.
 */
export function parseComposeMarkdown(text: string): ParsedCompose | null {
  if (!text || !/[*_~`]/.test(text)) {
    return null
  }
  let message: string
  let entities: Api.TypeMessageEntity[]
  try {
    ;[message, entities] = MarkdownParser.parse(text)
  } catch {
    return null
  }
  if (!entities.length) {
    return null
  }
  if (MarkdownParser.unparse(message, entities) !== text) {
    return null
  }
  return { message, entities }
}
