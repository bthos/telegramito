import type { Api } from "teleproto"
import { getForumReplyToTopId } from "./forum"

/**
 * Telegram sometimes returns **sparse** message lists (notably `messages.search` with
 * `topMsgId` for forum threads). Neighbouring messages can have non-consecutive ids; we
 * reconcile small holes with `messages.getMessages` by id. The same primitives apply to any
 * UI that merges search pages with id-based recovery — forum topics are the current caller.
 *
 * **MESSAGE_HISTORY_RECONCILE_POLICY** — bump when merge/acceptance rules change so cached
 * attempt keys in the hook do not block retries.
 */
export const SEQUENTIAL_ID_GAP_MAX_SPAN = 32
export const MESSAGE_HISTORY_RECONCILE_POLICY = 4

/**
 * Large `getMessages({ ids: [...] })` batches often return {@link Api.MessageMediaUnsupported}
 * instead of real poll/media; keep chunks small (observed server behaviour).
 */
export const BULK_GET_MESSAGES_BY_IDS_CHUNK = 12

export const MEDIA_PLACEHOLDER_REFETCH_MAX_IDS = 16
export const MEDIA_PLACEHOLDER_REFETCH_MAX_ATTEMPTS = 3

export type SequentialIdGap = {
  lo: number
  hi: number
  ids: number[]
  /** Neighbour context (e.g. forum `replyToTopId`) — used to reject cross-thread noise from getMessages */
  leftThreadHint?: number
  rightThreadHint?: number
}

/** Stable cache key for one reconcile pass (must include policy version). */
export function historyReconcileAttemptKey(policy: number, lo: number, hi: number): string {
  return `${policy}:${lo}-${hi}`
}

/** Ids strictly between two neighbour message ids (exclusive of lo and hi). */
export function exclusiveIdsBetween(lo: number, hi: number): number[] {
  const out: number[] = []
  for (let id = lo + 1; id < hi; id += 1) {
    out.push(id)
  }
  return out
}

/** Split ids into chunks of at most `chunkSize` for getMessages batching. */
export function chunkIdsForGetMessages(ids: readonly number[], chunkSize: number): number[][] {
  if (chunkSize <= 0) {
    return ids.length === 0 ? [] : [[...ids]]
  }
  const out: number[][] = []
  for (let off = 0; off < ids.length; off += chunkSize) {
    out.push(ids.slice(off, off + chunkSize))
  }
  return out
}

/**
 * Detect sequential id holes in an already-sorted message list.
 * @param threadHint Extractor for optional thread id on a neighbour (forum: {@link getForumReplyToTopId}).
 */
export function findSequentialIdGapsInSortedMessages(
  sortedMessages: readonly Api.Message[],
  maxSpan: number,
  threadHint: (m: Api.Message) => number | undefined,
): SequentialIdGap[] {
  const gaps: SequentialIdGap[] = []
  for (let i = 0; i < sortedMessages.length - 1; i += 1) {
    const lo = Number(sortedMessages[i].id)
    const hi = Number(sortedMessages[i + 1].id)
    const span = hi - lo - 1
    if (span <= 0 || span > maxSpan) {
      continue
    }
    gaps.push({
      lo,
      hi,
      ids: exclusiveIdsBetween(lo, hi),
      leftThreadHint: threadHint(sortedMessages[i]),
      rightThreadHint: threadHint(sortedMessages[i + 1]),
    })
  }
  return gaps
}

/**
 * True if neighbour thread hints are compatible with `activeThreadId`
 * (either side unknown, or both match when known).
 */
export function gapThreadHintsMatchActive(
  leftThread: number | undefined,
  rightThread: number | undefined,
  activeThreadId: number,
): boolean {
  const L = leftThread == null
  const R = rightThread == null
  if (L && R) {
    return true
  }
  if (!L && leftThread !== activeThreadId) {
    return false
  }
  if (!R && rightThread !== activeThreadId) {
    return false
  }
  return true
}

export function messageAllowedForGapFetch(
  m: Api.Message,
  gaps: SequentialIdGap[],
  activeThreadId: number,
): boolean {
  const mid = Number(m.id)
  const t = getForumReplyToTopId(m)
  if (t === activeThreadId) {
    return true
  }
  if (t != null && t !== activeThreadId) {
    return false
  }
  return gaps.some(
    (g) =>
      mid > g.lo
      && mid < g.hi
      && gapThreadHintsMatchActive(g.leftThreadHint, g.rightThreadHint, activeThreadId),
  )
}

export function messageInActiveThread(m: Api.Message, activeThreadId: number): boolean {
  const t = getForumReplyToTopId(m)
  return t == null || t === activeThreadId
}

/**
 * Which message ids to re-fetch one-by-one when batch id-fetch left
 * {@link Api.MessageMediaUnsupported} (list order preserved; then attempt filter; then cap).
 */
export function mediaPlaceholderRefetchIds(
  unsupportedIdsInListOrder: readonly number[],
  attemptsById: ReadonlyMap<number, number>,
): number[] {
  return unsupportedIdsInListOrder
    .filter(
      (id) =>
        (attemptsById.get(id) ?? 0) < MEDIA_PLACEHOLDER_REFETCH_MAX_ATTEMPTS,
    )
    .slice(0, MEDIA_PLACEHOLDER_REFETCH_MAX_IDS)
}
