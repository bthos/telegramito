import { Api } from "telegram"

/**
 * Same split window as telegram-react (`MESSAGE_SPLIT_MAX_TIME_S`).
 * Consecutive messages from the same logical sender within this gap may share one visual cluster.
 */
export const MESSAGE_GROUP_MAX_GAP_SEC = 600

function peerKeyFromFromId(fromId: Api.TypePeer | undefined): string {
  if (fromId == null) {
    return ""
  }
  if (fromId.className === "PeerUser") {
    return `u:${String((fromId as Api.PeerUser).userId)}`
  }
  if (fromId.className === "PeerChannel") {
    return `c:${String((fromId as Api.PeerChannel).channelId)}`
  }
  if (fromId.className === "PeerChat") {
    return `h:${String((fromId as Api.PeerChat).chatId)}`
  }
  return ""
}

export function canGroupMessages(prev: Api.Message, cur: Api.Message): boolean {
  if (prev.className !== "Message" || cur.className !== "Message") {
    return false
  }
  if (prev.out !== cur.out) {
    return false
  }
  const pd = prev.date
  const cd = cur.date
  if (pd == null || cd == null || cd - pd > MESSAGE_GROUP_MAX_GAP_SEC) {
    return false
  }
  if (!prev.out) {
    const a = peerKeyFromFromId(prev.fromId)
    const b = peerKeyFromFromId(cur.fromId)
    if (a !== b) {
      return false
    }
  }
  return true
}

export type MessageClusterRole = "single" | "first" | "middle" | "last"

/** Parallel to `messages` array indices. */
export function computeMessageClusterRoles(messages: readonly Api.Message[]): MessageClusterRole[] {
  const n = messages.length
  const roles: MessageClusterRole[] = []
  for (let i = 0; i < n; i++) {
    const cur = messages[i]
    const prev = i > 0 ? messages[i - 1] : null
    const next = i < n - 1 ? messages[i + 1] : null
    const withPrev = prev != null && canGroupMessages(prev, cur)
    const withNext = next != null && canGroupMessages(cur, next)
    if (withPrev && withNext) {
      roles.push("middle")
    } else if (withPrev) {
      roles.push("last")
    } else if (withNext) {
      roles.push("first")
    } else {
      roles.push("single")
    }
  }
  return roles
}
