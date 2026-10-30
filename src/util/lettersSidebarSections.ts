/**
 * Pure Letters sidebar accordion section helpers for search
 * (Chats + Global search + Passages, plus AC6 Groups/Channels always visible).
 */

export type LettersSidebarSection =
  | "chats"
  | "global"
  | "messages"
  | "correspondents"
  | "groups"
  | "channels"

export type EmptyKind = "none" | "neverHad" | "filtered"

/** Telegram's server-side searches (public peers, message history) need two characters. */
export function passagesEligible(query: string): boolean {
  return query.trim().length >= 2
}

/** The «Chats» section is a local filter, so a single character already works. */
export function chatsEligible(query: string): boolean {
  return query.trim().length >= 1
}

/**
 * Stable sidebar section order for Letters mode. While searching, the result sections come
 * first in Telegram Web K order: Chats, Global search, then message hits (Passages).
 * Groups/Channels are always included (AC6) regardless of filtered dialog counts.
 */
export function buildLettersSidebarSectionsOrdered(opts: {
  lettersMode: boolean
  query: string
}): LettersSidebarSection[] {
  if (!opts.lettersMode) {
    return ["correspondents"]
  }
  const list: LettersSidebarSection[] = []
  if (chatsEligible(opts.query)) {
    list.push("chats")
  }
  if (passagesEligible(opts.query)) {
    list.push("global", "messages")
  }
  list.push("correspondents", "groups", "channels")
  return list
}

/**
 * Rising-edge only: when the search sections appear, open the first one (`"chats"`).
 * Otherwise keep `current` if still available, else first ordered section.
 */
export function nextOpenSectionOnQueryChange(opts: {
  prevEligible: boolean
  nextEligible: boolean
  current: LettersSidebarSection
  ordered: readonly LettersSidebarSection[]
}): LettersSidebarSection {
  if (!opts.prevEligible && opts.nextEligible && opts.ordered.includes("chats")) {
    return "chats"
  }
  if (opts.ordered.includes(opts.current)) {
    return opts.current
  }
  return opts.ordered[0] ?? "correspondents"
}

/**
 * Which empty-state copy to show inside Groups or Channels.
 * `unfilteredCount` = count before search filter (session total for that bucket).
 * `filteredCount` = count after dialog-name search filter.
 */
export function sidebarEmptyKind(opts: {
  searchActive: boolean
  unfilteredCount: number
  filteredCount: number
}): EmptyKind {
  if (opts.filteredCount > 0) {
    return "none"
  }
  if (opts.searchActive && opts.unfilteredCount > 0) {
    return "filtered"
  }
  return "neverHad"
}

export function cycleNextSection(
  current: LettersSidebarSection,
  available: readonly LettersSidebarSection[],
): LettersSidebarSection {
  const idx = available.indexOf(current)
  if (idx < 0 || available.length === 0) {
    return available[0] ?? "correspondents"
  }
  return available[(idx + 1) % available.length]!
}
