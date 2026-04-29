/** `ts` — Unix time in **seconds** (Telegram), `locale` — BCP-47, e.g. `en` or `be`. */
export function formatMessageTime(ts: number, locale: string): string {
  return new Date(ts * 1000).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/** Last date separator at or above `rowIndex` (for sticky header while scrolling). */
export function getStickyDateTsForRow(
  datedList: readonly { kind: string; ts?: number }[],
  rowIndex: number,
): number | null {
  if (datedList.length === 0 || rowIndex < 0) {
    return null
  }
  const idx = Math.min(rowIndex, datedList.length - 1)
  for (let i = idx; i >= 0; i--) {
    const it = datedList[i]
    if (it.kind === "sep" && typeof it.ts === "number") {
      return it.ts
    }
  }
  return null
}

/** Local calendar day key for grouping: `YYYY-MM-DD`. */
export function getLocalDayKey(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Shown on the date separator line between day groups in the chat
 * (today / yesterday, then long-form dates via `Intl`).
 */
export function formatMessageDateSeparator(
  unixSec: number,
  locale: string,
  now: Date = new Date()
): string {
  const day = new Date(unixSec * 1000)
  const startMsg = startOfLocalDay(day)
  const startRef = startOfLocalDay(now)
  const diffDays = Math.round((startRef - startMsg) / 86_400_000)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (diffDays === 0) {
    return rtf.format(0, "day")
  }
  if (diffDays === 1) {
    return rtf.format(-1, "day")
  }
  if (diffDays < 0) {
    return day.toLocaleDateString(locale, { dateStyle: "long" })
  }
  if (diffDays < 7) {
    return day.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  }
  if (day.getFullYear() === now.getFullYear()) {
    return day.toLocaleDateString(locale, { day: "numeric", month: "long" })
  }
  return day.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
}

/** Poll voters / reaction repliers rows — readable datetime, aligned with chat (24h). */
export function formatPollVoterTimestamp(unixSec: number, locale: string, now = new Date()): string {
  if (unixSec <= 0) {
    return ""
  }
  const d = new Date(unixSec * 1000)
  try {
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startVote = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    if (startVote === startToday) {
      return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })
    }
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleString(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    }
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return ""
  }
}

/** Tooltip for voter/replier time (full date + time). */
export function pollVoterTimestampTitle(unixSec: number, locale: string): string {
  if (unixSec <= 0) {
    return ""
  }
  try {
    return new Date(unixSec * 1000).toLocaleString(locale, {
      dateStyle: "full",
      timeStyle: "short",
      hour12: false,
    })
  } catch {
    return ""
  }
}

/** For chat list: time if today, else short date. */
export function formatDialogListTime(ts: number, locale: string, now = new Date()): string {
  const d = new Date(ts * 1000)
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (d >= startToday) {
    return formatMessageTime(ts, locale)
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" })
  }
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "2-digit" })
}
