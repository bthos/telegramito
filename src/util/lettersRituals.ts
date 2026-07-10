import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { NightMode } from "../parental/types"
import {
  getPeerInfo,
  isBroadcastChannelDialog,
  isLettersSidebarChannelListDialog,
  isPrivateUserDialog,
} from "../telegram/dialogUtils"
import { toMessageList } from "../telegram/messageList"
import { getLocalDayKey } from "./timeFormat"
import { getLocalMinutesFromMidnight, parseTimeToMinutes } from "../parental/policy"

/** Max peers to fetch history for per evening render (Tier 2). */
export const TIER2_AWAITING_PEER_CAP = 5

/** Short outbound at or below this length may be a closing phrase (AC-U3). */
export const CLOSING_OUTBOUND_MAX_LEN = 48

/** Curated ru/en/es closings — extend via open question in spec. */
export const DEFAULT_CLOSING_PHRASES = [
  "ok",
  "okay",
  "k",
  "thanks",
  "thank you",
  "thx",
  "ty",
  "ок",
  "окей",
  "спасибо",
  "спс",
  "хорошо",
  "добре",
  "понял",
  "поняла",
  "ясно",
  "gracias",
  "vale",
  "bien",
] as const

let eveningTier2FetchCount = 0

/** Dev / test hook: GramJS history fetches issued by Tier 2 this session. */
export function getEveningTier2FetchCount(): number {
  return eveningTier2FetchCount
}

/** For tests only. */
export function _resetEveningTier2FetchCountForTest(): void {
  eveningTier2FetchCount = 0
}

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
  /** Channels and bulletin peers with an inbound post today (dialog preview). */
  broadcastToday: { key: string; name: string }[]
  /** Broadcast / channel peers the user posted to today. */
  postedToChannelsToday: { key: string; name: string }[]
}

/** Circles tab channels + bulletin strip — excludes groups and private chats. */
export function isEveningSummaryChannelDialog(d: Dialog): boolean {
  return isBroadcastChannelDialog(d) || isLettersSidebarChannelListDialog(d)
}

function isMessageFromToday(m: Api.Message, now: Date): boolean {
  const ts = typeof m.date === "number" ? m.date : 0
  if (ts <= 0) {
    return false
  }
  return getLocalDayKey(ts) === getLocalDayKey(Math.floor(now.getTime() / 1000))
}

function outboundText(msg: Api.Message): string {
  return typeof msg.message === "string" ? msg.message.trim() : ""
}

/** Terminal outbound: short, no question mark, closing phrase or `.` / emoji-only (AC-U3). */
export function isClosingOutbound(msg: Api.Message): boolean {
  if (!msg.out) {
    return false
  }
  const text = outboundText(msg)
  if (text.length === 0 || text.length > CLOSING_OUTBOUND_MAX_LEN) {
    return false
  }
  if (text.includes("?")) {
    return false
  }
  const lower = text.toLowerCase().replace(/[!.,…]+$/u, "")
  if ((DEFAULT_CLOSING_PHRASES as readonly string[]).includes(lower)) {
    return true
  }
  if (text.endsWith(".")) {
    return true
  }
  return /^[\p{Extended_Pictographic}\s]+$/u.test(text)
}

type AwaitingVerdict = boolean | null

/**
 * When thread messages are available: true = still awaiting, false = cleared, null = insufficient data.
 */
export function peerAwaitingFromThreadMessages(
  messages: readonly Api.Message[],
  now: Date,
  closingPhraseFilter = true,
): AwaitingVerdict {
  const todayMsgs = messages.filter(
    (m) => m.className === "Message" && isMessageFromToday(m as Api.Message, now),
  ) as Api.Message[]
  if (todayMsgs.length === 0) {
    return null
  }
  const sorted = [...todayMsgs].sort((a, b) => a.date - b.date || a.id - b.id)
  let lastOutbound: Api.Message | undefined
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i]!.out) {
      lastOutbound = sorted[i]
      break
    }
  }
  if (!lastOutbound) {
    return null
  }
  if (closingPhraseFilter && isClosingOutbound(lastOutbound)) {
    return false
  }
  const lastOutTs = lastOutbound.date
  const inboundAfter = sorted.some((m) => !m.out && m.date > lastOutTs)
  return inboundAfter ? false : true
}

export type EveningSummaryOpts = {
  /** Tier 1: in-memory messages for peers opened this session. */
  getThreadMessages?: (peerKey: string) => readonly Api.Message[] | undefined
  closingPhraseFilter?: boolean
}

function resolvePrivateAwaiting(
  peerKey: string,
  previewMsg: Api.Message,
  now: Date,
  opts?: EveningSummaryOpts,
): boolean {
  const closingPhraseFilter = opts?.closingPhraseFilter !== false
  if (closingPhraseFilter && isClosingOutbound(previewMsg)) {
    return false
  }
  const cached = opts?.getThreadMessages?.(peerKey)
  if (cached && cached.length > 0) {
    const verdict = peerAwaitingFromThreadMessages(cached, now, closingPhraseFilter)
    if (verdict === false) {
      return false
    }
    if (verdict === true) {
      return true
    }
  }
  return previewMsg.out === true
}

/** Heuristic day-end summary from loaded dialog list (private + channels/bulletins). */
export function buildEveningSummary(
  dialogs: Dialog[],
  now: Date = new Date(),
  opts?: EveningSummaryOpts,
): EveningSummary {
  const wroteToday: { key: string; name: string }[] = []
  const awaitingReply: { key: string; name: string }[] = []
  const broadcastToday: { key: string; name: string }[] = []
  const postedToChannelsToday: { key: string; name: string }[] = []
  const wroteKeys = new Set<string>()
  const broadcastKeys = new Set<string>()
  const postedKeys = new Set<string>()

  for (const d of dialogs) {
    const m = d.message
    if (m?.className !== "Message") {
      continue
    }
    const msg = m as Api.Message
    if (!isMessageFromToday(msg, now)) {
      continue
    }
    const { key, name } = getPeerInfo(d)
    if (isPrivateUserDialog(d)) {
      if (msg.out) {
        if (resolvePrivateAwaiting(key, msg, now, opts)) {
          awaitingReply.push({ key, name })
        }
      } else if (!wroteKeys.has(key)) {
        wroteKeys.add(key)
        wroteToday.push({ key, name })
      }
    } else if (isEveningSummaryChannelDialog(d)) {
      if (msg.out) {
        if (!postedKeys.has(key)) {
          postedKeys.add(key)
          postedToChannelsToday.push({ key, name })
        }
      } else if (!broadcastKeys.has(key)) {
        broadcastKeys.add(key)
        broadcastToday.push({ key, name })
      }
    }
  }

  return { wroteToday, awaitingReply, broadcastToday, postedToChannelsToday }
}

/**
 * Tier 2: for peers still awaiting after Tier 1, fetch recent history (capped) and re-check.
 * No-op when `enabled` is false or client is missing.
 */
export async function refineAwaitingReplyTier2(
  summary: EveningSummary,
  dialogs: Dialog[],
  client: TelegramClient | null | undefined,
  now: Date = new Date(),
  opts?: { enabled?: boolean; onFetch?: (count: number) => void },
): Promise<EveningSummary> {
  if (!opts?.enabled || !client || summary.awaitingReply.length === 0) {
    return summary
  }
  const dialogByKey = new Map(dialogs.map((d) => [getPeerInfo(d).key, d]))
  const stillAwaiting = [...summary.awaitingReply]
  let fetchCount = 0
  const peersToCheck = summary.awaitingReply.slice(0, TIER2_AWAITING_PEER_CAP)

  for (const peer of peersToCheck) {
    const d = dialogByKey.get(peer.key)
    if (!d?.entity) {
      continue
    }
    fetchCount++
    eveningTier2FetchCount++
    try {
      const raw = await client.getMessages(d.entity as never, { limit: 50 })
      const messages = toMessageList(raw)
      const verdict = peerAwaitingFromThreadMessages(messages, now, true)
      if (verdict === false) {
        const idx = stillAwaiting.findIndex((x) => x.key === peer.key)
        if (idx >= 0) {
          stillAwaiting.splice(idx, 1)
        }
      }
    } catch {
      // Keep Tier 1 / Tier 0 verdict on fetch failure.
    }
  }

  opts.onFetch?.(fetchCount)
  return { ...summary, awaitingReply: stillAwaiting }
}
