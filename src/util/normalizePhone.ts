const MIN_DIGITS = 5
const MAX_DIGITS = 15 // E.164

/**
 * Turns what a user typed into the `+<digits>` form Telegram expects, or `null` when it can't be a
 * phone number. Separators people commonly type (spaces, dashes, dots, parentheses) are dropped;
 * anything else (letters, stray symbols, a `+` that isn't leading) is rejected.
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-.()]/g, "")
  const m = /^\+?(\d+)$/.exec(compact)
  if (!m) return null
  const digits = m[1]
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null
  return `+${digits}`
}
