import type { Api } from "telegram"
import type { ChatDatedItem } from "../ui/chatDatedItem"
import { isInboundUnreadForThread } from "../telegram/messageUnread"

export type CatchUpBoundary = {
  insertIndex: number
  boundaryTs: number
  readInboxMaxId: number
}

/** Last loaded message at or below the read horizon (for ribbon date chip). */
export function boundaryTimestampForReadHorizon(
  messages: readonly Api.Message[],
  readInboxMaxId: number,
): number | null {
  if (readInboxMaxId <= 0) {
    return null
  }
  let ts: number | null = null
  for (const m of messages) {
    const id = messageIdNum(m)
    if (id != null && id <= readInboxMaxId) {
      ts = m.date
    }
  }
  return ts
}

function messageIdNum(m: Api.Message): number | null {
  if (m.className !== "Message" || m.id == null) {
    return null
  }
  const id = typeof m.id === "number" ? m.id : Number(m.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

/**
 * Where to insert the catch-up ribbon: immediately before the first inbound-unread
 * message after {@link readInboxMaxId}. Returns null when there is no backlog.
 */
export function findCatchUpBoundary(
  datedList: readonly ChatDatedItem[],
  readInboxMaxId: number,
): CatchUpBoundary | null {
  if (readInboxMaxId <= 0 || datedList.length === 0) {
    return null
  }
  let boundaryTs: number | null = null
  for (const row of datedList) {
    if (row.kind === "msg") {
      const id = messageIdNum(row.message)
      if (id != null && id <= readInboxMaxId) {
        boundaryTs = row.message.date
      }
    }
  }
  for (let i = 0; i < datedList.length; i++) {
    const row = datedList[i]
    if (row.kind !== "msg") {
      continue
    }
    if (!isInboundUnreadForThread(row.message, readInboxMaxId)) {
      continue
    }
    const ts = boundaryTs ?? row.message.date
    return { insertIndex: i, boundaryTs: ts, readInboxMaxId }
  }
  return null
}

/** Inserts a non-interactive catch-up ribbon row at the read/unread boundary. */
export function insertCatchUpRibbon(
  datedList: readonly ChatDatedItem[],
  readInboxMaxId: number,
): ChatDatedItem[] {
  const boundary = findCatchUpBoundary(datedList, readInboxMaxId)
  if (boundary == null) {
    return [...datedList]
  }
  const ribbon: ChatDatedItem = {
    kind: "catchup",
    readInboxMaxId: boundary.readInboxMaxId,
    ts: boundary.boundaryTs,
  }
  const out = [...datedList]
  out.splice(boundary.insertIndex, 0, ribbon)
  return out
}

/** Row index of the first inbound-unread message after the read horizon. */
export function findFirstUnreadRowIndex(
  datedList: readonly ChatDatedItem[],
  readInboxMaxId: number,
): number {
  for (let i = 0; i < datedList.length; i++) {
    const row = datedList[i]
    if (row.kind === "msg" && isInboundUnreadForThread(row.message, readInboxMaxId)) {
      return i
    }
  }
  return -1
}

export function countInboundUnreadInMessages(
  messages: readonly Api.Message[],
  readInboxMaxId: number,
): number {
  let n = 0
  for (const m of messages) {
    if (isInboundUnreadForThread(m, readInboxMaxId)) {
      n += 1
    }
  }
  return n
}
