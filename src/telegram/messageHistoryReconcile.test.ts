import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import {
  MESSAGE_HISTORY_RECONCILE_POLICY,
  chunkIdsForGetMessages,
  exclusiveIdsBetween,
  findSequentialIdGapsInSortedMessages,
  gapThreadHintsMatchActive,
  historyReconcileAttemptKey,
  mediaPlaceholderRefetchIds,
  messageAllowedForGapFetch,
  messageInActiveThread,
} from "./messageHistoryReconcile"
import { getForumReplyToTopId } from "./forum"

function msg(
  id: number,
  replyToTopId: number | null | undefined,
): Api.Message {
  const replyTo = replyToTopId == null
    ? undefined
    : new Api.MessageReplyHeader({
      replyToMsgId: 1,
      replyToTopId,
    })
  return new Api.Message({
    id,
    message: "",
    date: 0,
    replyTo,
  } as never)
}

describe("messageHistoryReconcile", () => {
  it("historyReconcileAttemptKey includes policy", () => {
    expect(historyReconcileAttemptKey(4, 10, 20)).toBe("4:10-20")
  })

  it("exclusiveIdsBetween", () => {
    expect(exclusiveIdsBetween(10, 14)).toEqual([11, 12, 13])
    expect(exclusiveIdsBetween(5, 6)).toEqual([])
  })

  it("chunkIdsForGetMessages respects chunk size", () => {
    expect(chunkIdsForGetMessages([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunkIdsForGetMessages([], 12)).toEqual([])
  })

  it("gapThreadHintsMatchActive", () => {
    expect(gapThreadHintsMatchActive(undefined, undefined, 99)).toBe(true)
    expect(gapThreadHintsMatchActive(99, 99, 99)).toBe(true)
    expect(gapThreadHintsMatchActive(1, 99, 99)).toBe(false)
    expect(gapThreadHintsMatchActive(99, 2, 99)).toBe(false)
  })

  it("messageInActiveThread", () => {
    expect(messageInActiveThread(msg(1, 7), 7)).toBe(true)
    expect(messageInActiveThread(msg(1, null), 7)).toBe(true)
    expect(messageInActiveThread(msg(1, 8), 7)).toBe(false)
  })

  it("messageAllowedForGapFetch for explicit topic", () => {
    const gaps = [{ lo: 10, hi: 14, ids: [11, 12, 13], leftThreadHint: 7, rightThreadHint: 7 }]
    expect(messageAllowedForGapFetch(msg(12, 7), gaps, 7)).toBe(true)
    expect(messageAllowedForGapFetch(msg(12, 8), gaps, 7)).toBe(false)
  })

  it("messageAllowedForGapFetch for ambiguous topic inside gap span", () => {
    const gaps = [{ lo: 10, hi: 14, ids: [11, 12, 13], leftThreadHint: 7, rightThreadHint: 7 }]
    expect(messageAllowedForGapFetch(msg(12, undefined), gaps, 7)).toBe(true)
  })

  it("findSequentialIdGapsInSortedMessages skips oversized holes", () => {
    const sorted = [msg(1, 7), msg(50, 7)]
    const gaps = findSequentialIdGapsInSortedMessages(sorted, 10, getForumReplyToTopId)
    expect(gaps).toEqual([])
  })

  it("findSequentialIdGapsInSortedMessages collects small holes with hints", () => {
    const sorted = [msg(10, 7), msg(14, 7)]
    expect(findSequentialIdGapsInSortedMessages(sorted, 32, getForumReplyToTopId)).toEqual([
      {
        lo: 10,
        hi: 14,
        ids: [11, 12, 13],
        leftThreadHint: 7,
        rightThreadHint: 7,
      },
    ])
  })

  it("MESSAGE_HISTORY_RECONCILE_POLICY is stable contract version", () => {
    expect(MESSAGE_HISTORY_RECONCILE_POLICY).toBeGreaterThanOrEqual(4)
  })

  it("mediaPlaceholderRefetchIds respects attempts and max ids", () => {
    const attempts = new Map<number, number>([
      [1, 3],
      [2, 0],
      [3, 3],
    ])
    expect(mediaPlaceholderRefetchIds([1, 2, 3, 4], attempts)).toEqual([2, 4])
  })

  it("mediaPlaceholderRefetchIds preserves list order and caps", () => {
    const attempts = new Map<number, number>()
    const ids = Array.from({ length: 20 }, (_, i) => i + 1)
    expect(mediaPlaceholderRefetchIds(ids, attempts)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    )
  })

  it("mediaPlaceholderRefetchIds empty", () => {
    expect(mediaPlaceholderRefetchIds([], new Map())).toEqual([])
  })
})
