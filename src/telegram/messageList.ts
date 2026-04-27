import { Api } from "telegram"

export const CHAT_PAGE_SIZE = 50

/**
 * Smallest message id in a batch. For channel/supergroup history, ids are
 * (almost) time-monotonic, so the API "older than" offset must use min id, not
 * the first list item when sorting by `date` (rare id/date inversions can mis-order).
 */
export function minMessageId(msgs: Api.Message[]): number | undefined {
  const ids = msgs.map((m) => m.id).filter((x): x is number => x != null)
  if (ids.length === 0) {
    return undefined
  }
  return Math.min(...ids)
}

/** Deduplicate by `id` and order by `date` ascending. */
export function uniqueMessagesSort(msgs: Api.Message[]): Api.Message[] {
  const m = new Map<number, Api.Message>()
  for (const x of msgs) {
    if (x == null || x.id == null) continue
    m.set(x.id, x)
  }
  return [...m.values()].sort((a, b) => a.date - b.date)
}

export function toMessageList(r: unknown): Api.Message[] {
  const arr = (Array.isArray(r) ? r : Array.from(r as Iterable<Api.TypeMessage>)) as Api.TypeMessage[]
  return uniqueMessagesSort(
    arr.filter((x): x is Api.Message => x != null && x.className === "Message")
  )
}

/**
 * Re-fetch of the newest page merged into a longer list: keep messages older than
 * the oldest id in the fresh "head" batch so infinite scroll state is preserved.
 */
export function mergeHeadWithTail(prev: Api.Message[], headBatch: Api.Message[]): Api.Message[] {
  if (headBatch.length === 0) {
    return uniqueMessagesSort(prev)
  }
  const head = uniqueMessagesSort(headBatch)
  const headIds = head.map((m) => m.id).filter((x): x is number => x != null)
  if (headIds.length === 0) {
    return uniqueMessagesSort(prev)
  }
  const minId = Math.min(...headIds)
  const keep = prev.filter((m) => m.id != null && m.id < minId)
  return uniqueMessagesSort([...keep, ...head])
}
