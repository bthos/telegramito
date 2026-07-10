import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { NightMode } from "../parental/types"
import { getPeerInfo, isPrivateUserDialog } from "../telegram/dialogUtils"
import { getLocalDayKey } from "./timeFormat"
import { getLocalMinutesFromMidnight, parseTimeToMinutes } from "../parental/policy"

export type MobileShellTab = "letters" | "dayMail" | "circles" | "desk"

/** Local calendar day key `YYYY-MM-DD`. */
export function localCalendarDayKey(d: Date = new Date()): string {
  return getLocalDayKey(Math.floor(d.getTime() / 1000))
}

/**
 * First open of the calendar day → day mail; later opens → letters.
 * Returns null when morning ritual is disabled or not applicable.
 */
export function resolveMorningMobileTab(opts: {
  enabled: boolean
  lastMorningDayMailDate: string | null
  today?: string
}): MobileShellTab | null {
  if (!opts.enabled) {
    return null
  }
  const today = opts.today ?? localCalendarDayKey()
  if (opts.lastMorningDayMailDate === today) {
    return "letters"
  }
  return "dayMail"
}

function isMinuteInRange(n: number, start: number, end: number): boolean {
  if (start < end) {
    return n >= start && n < end
  }
  return n >= start || n < end
}

/** Evening edition: one hour before night lock through the night window. */
export function isInEveningEditionPeriod(night: NightMode, now: Date): boolean {
  if (!night.enabled) {
    return false
  }
  const a = parseTimeToMinutes(night.start)
  const b = parseTimeToMinutes(night.end)
  if (a == null || b == null) {
    return false
  }
  const n = getLocalMinutesFromMidnight(now)
  const preStart = (a - 60 + 1440) % 1440
  const inPreLock =
    preStart < a ? n >= preStart && n < a : n >= preStart || n < a
  const inNight = isMinuteInRange(n, a, b)
  return inPreLock || inNight
}

/** Minutes until night lock starts; null when lock is active or night mode off. */
export function minutesUntilNightLock(night: NightMode, now: Date): number | null {
  if (!night.enabled) {
    return null
  }
  const a = parseTimeToMinutes(night.start)
  const b = parseTimeToMinutes(night.end)
  if (a == null || b == null) {
    return null
  }
  const n = getLocalMinutesFromMidnight(now)
  if (isMinuteInRange(n, a, b)) {
    return null
  }
  let diff = a - n
  if (diff <= 0) {
    diff += 1440
  }
  if (diff > 60) {
    return null
  }
  return diff
}

export type EveningSummary = {
  wroteToday: { key: string; name: string }[]
  awaitingReply: { key: string; name: string }[]
}

function isMessageFromToday(m: Api.Message, now: Date): boolean {
  const ts = typeof m.date === "number" ? m.date : 0
  if (ts <= 0) {
    return false
  }
  return getLocalDayKey(ts) === getLocalDayKey(Math.floor(now.getTime() / 1000))
}

/** Heuristic day-end summary from loaded dialog list (chats only). */
export function buildEveningSummary(dialogs: Dialog[], now: Date = new Date()): EveningSummary {
  const wroteToday: { key: string; name: string }[] = []
  const awaitingReply: { key: string; name: string }[] = []
  const wroteKeys = new Set<string>()

  for (const d of dialogs) {
    if (!isPrivateUserDialog(d)) {
      continue
    }
    const m = d.message
    if (m?.className !== "Message") {
      continue
    }
    const msg = m as Api.Message
    if (!isMessageFromToday(msg, now)) {
      continue
    }
    const { key, name } = getPeerInfo(d)
    if (msg.out) {
      awaitingReply.push({ key, name })
    } else if (!wroteKeys.has(key)) {
      wroteKeys.add(key)
      wroteToday.push({ key, name })
    }
  }

  return { wroteToday, awaitingReply }
}
