import type { Api } from "telegram"
import { peerKeyFromPeer } from "../telegram/peerKey"

/** One row in the dated chat transcript (separator or message). Shared by scroll helpers and ChatView. */
export type ChatDatedItem =
  | { kind: "sep"; dayKey: string; ts: number }
  | { kind: "msg"; message: Api.Message }

/** Stable key for height cache / React keys (matches ChatView `key` convention). */
export function chatDatedRowKey(item: ChatDatedItem): string {
  if (item.kind === "sep") {
    return `sep-${item.dayKey}`
  }
  return `msg-${peerKeyFromPeer(item.message.peerId)}-${item.message.id}`
}
