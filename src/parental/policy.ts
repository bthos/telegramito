import type { AppMode, NightMode, ParentalSettings } from "./types"

/**
 * Parse "HH:MM" 24h to minutes from midnight. Returns null if invalid.
 */
export function parseTimeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

export function getLocalMinutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Whether "night mask" (hide all chats UI) should be active.
 * Only in Child mode. Supports ranges crossing midnight, e.g. 22:00–07:00.
 */
export function isNightListHidden(
  night: NightMode,
  now: Date,
  appMode: AppMode
): boolean {
  if (appMode === "parent") {
    return false
  }
  if (!night.enabled) {
    return false
  }
  const a = parseTimeToMinutes(night.start)
  const b = parseTimeToMinutes(night.end)
  if (a == null || b == null) return false
  const n = getLocalMinutesFromMidnight(now)
  if (a < b) return n >= a && n < b
  return n >= a || n < b
}

export type UserChatVisibilityInput = {
  isPrivate: boolean
  isContact: boolean
  peerKey: string
  allowlistIds: ReadonlySet<string>
  blockUnknownPrivate: boolean
  appMode: AppMode
}

/**
 * In child mode, hide 1-1 with unknown (non-contact, not on allowlist) if rule enabled
 * — shows a "request access" row. Parent mode: do not hide by this rule.
 * Peers the parent set to ❌ in Requests are omitted from the list entirely
 * (see `isPrivateOmittedInChildListForDeny`).
 */
export function isPrivateChatHidden(
  s: UserChatVisibilityInput
): boolean {
  if (s.appMode === "parent") return false
  if (!s.isPrivate) return false
  if (!s.blockUnknownPrivate) return false
  if (s.allowlistIds.has(s.peerKey)) return false
  if (s.isContact) return false
  return true
}

/**
 * Child + private 1-1 + parent set ❌ in Requests → do not list the chat (fully hidden;
 * this is not the same as ❔ pending, which can show the request-access row).
 */
export function isPrivateOmittedInChildListForDeny(
  appMode: AppMode,
  isPrivate: boolean,
  peerKey: string,
  deniedPeerIds: ReadonlySet<string>
): boolean {
  if (appMode !== "child") return false
  if (!isPrivate) return false
  return deniedPeerIds.has(peerKey)
}

/**
 * Hides link previews in Child when `hideLinkPreviews` is on; ignored in Parent.
 */
export function shouldHideLinkPreviews(
  settings: ParentalSettings
): boolean {
  if (settings.appMode === "parent") {
    return false
  }
  return settings.hideLinkPreviews
}

/** Strips or filters heavy GIF/animation in Child when `filterGifs` is on; ignored in Parent. */
export function shouldFilterGifs(settings: ParentalSettings): boolean {
  if (settings.appMode === "parent") {
    return false
  }
  return settings.filterGifs
}
