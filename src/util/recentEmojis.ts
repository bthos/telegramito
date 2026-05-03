export const RECENT_EMOJI_STORAGE_KEY = "telegramito:recentEmoji"

export const MAX_RECENT_EMOJI = 24

/** Reads localStorage key; returns [] on missing or invalid JSON. */
export function loadRecentEmojis(): string[] {
  if (typeof localStorage === "undefined") {
    return []
  }
  try {
    const raw = localStorage.getItem(RECENT_EMOJI_STORAGE_KEY)
    if (raw == null || raw === "") {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    const out: string[] = []
    for (const x of parsed) {
      if (typeof x === "string" && x.length > 0) {
        out.push(x)
      }
    }
    return out
  } catch {
    return []
  }
}

/** Prepends emoji, dedupes, caps at MAX_RECENT_EMOJI, persists; returns new array. */
export function saveRecentEmoji(emoji: string, current: string[]): string[] {
  const deduped = current.filter((e) => e !== emoji)
  const next = [emoji, ...deduped].slice(0, MAX_RECENT_EMOJI)
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* quota / private mode */
    }
  }
  return next
}
