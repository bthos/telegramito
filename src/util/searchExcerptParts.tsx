import type { ReactNode } from "react"

/**
 * Split a search query into highlight tokens (whitespace-separated, non-empty).
 */
export function searchQueryTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

type MatchSpan = { start: number; end: number }

function findTokenSpans(textLower: string, tokens: readonly string[]): MatchSpan[] {
  const spans: MatchSpan[] = []
  for (const token of tokens) {
    const tl = token.toLowerCase()
    if (!tl) continue
    let from = 0
    while (from < textLower.length) {
      const i = textLower.indexOf(tl, from)
      if (i < 0) break
      spans.push({ start: i, end: i + tl.length })
      from = i + tl.length
    }
  }
  spans.sort((a, b) => a.start - b.start || a.end - b.end)
  return spans
}

function mergeSpans(spans: readonly MatchSpan[]): MatchSpan[] {
  if (spans.length === 0) return []
  const out: MatchSpan[] = [{ ...spans[0]! }]
  for (let i = 1; i < spans.length; i++) {
    const cur = spans[i]!
    const last = out[out.length - 1]!
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      out.push({ ...cur })
    }
  }
  return out
}

/**
 * Build an ~maxLen excerpt window anchored on the earliest query-token match in
 * `text`, bolding every token occurrence inside that window (AC5 / UX D6).
 *
 * If no literal token appears, falls back to a plain head-of-message window
 * (Telegram may have matched via stemming we cannot detect client-side).
 */
export function searchExcerptParts(
  text: string,
  query: string,
  maxLen: number,
): ReactNode {
  const tokens = searchQueryTokens(query)
  if (text.length === 0) {
    return text
  }

  const lower = text.toLowerCase()
  const spans = tokens.length > 0 ? findTokenSpans(lower, tokens) : []
  const earliest = spans[0]?.start ?? 0

  // Reserve one character of the maxLen budget per ellipsis (matches prior
  // SearchResultRow truncation: slice(0, maxLen-1)+'…').
  let windowStart = 0
  let contentBudget = maxLen
  if (spans.length > 0) {
    const idealStart = Math.max(0, earliest - Math.floor(maxLen / 4))
    windowStart = idealStart
  }
  const willLead = windowStart > 0
  if (willLead) contentBudget -= 1
  // Provisional end; adjust if we need a trailing ellipsis.
  let windowEnd = Math.min(text.length, windowStart + contentBudget)
  const willTrail = windowEnd < text.length
  if (willTrail) {
    contentBudget = maxLen - (willLead ? 1 : 0) - 1
    windowEnd = Math.min(text.length, windowStart + Math.max(0, contentBudget))
  }
  if (spans.length > 0 && windowEnd - windowStart < contentBudget && windowStart > 0) {
    windowStart = Math.max(0, windowEnd - contentBudget)
  }

  const slice = text.slice(windowStart, windowEnd)
  const leadingEllipsis = windowStart > 0
  const trailingEllipsis = windowEnd < text.length
  const display =
    (leadingEllipsis ? "…" : "") +
    slice +
    (trailingEllipsis ? "…" : "")
  if (spans.length === 0 || tokens.length === 0) {
    return display
  }

  // Remap spans into the display string (account for leading …).
  const displayOffset = leadingEllipsis ? 1 : 0
  const localSpans = mergeSpans(
    spans
      .map((s) => ({
        start: s.start - windowStart + displayOffset,
        end: s.end - windowStart + displayOffset,
      }))
      .filter((s) => s.end > displayOffset && s.start < displayOffset + slice.length)
      .map((s) => ({
        start: Math.max(displayOffset, s.start),
        end: Math.min(displayOffset + slice.length, s.end),
      }))
      .filter((s) => s.start < s.end),
  )

  if (localSpans.length === 0) {
    return display
  }

  const parts: ReactNode[] = []
  let cursor = 0
  for (let i = 0; i < localSpans.length; i++) {
    const sp = localSpans[i]!
    if (cursor < sp.start) {
      parts.push(display.slice(cursor, sp.start))
    }
    parts.push(<strong key={`h-${i}`}>{display.slice(sp.start, sp.end)}</strong>)
    cursor = sp.end
  }
  if (cursor < display.length) {
    parts.push(display.slice(cursor))
  }
  return <>{parts}</>
}
