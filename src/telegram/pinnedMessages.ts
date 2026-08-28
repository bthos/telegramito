import { generateRandomBigInt } from "teleproto/Helpers"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import type { Entity } from "teleproto/define"
import { getPeerId } from "teleproto/Utils"
import { compareMessagesChronological } from "./messageList"
import { repairMessageAfterGramJs } from "./messageMediaGramRepair"

export const PINNED_MESSAGES_PAGE_SIZE = 40

/**
 * Pinned messages for a chat (or a forum topic when `topicId` is set). Mirrors
 * `forum.ts:getForumThreadMessages` field-for-field, swapping the filter to
 * `InputMessagesFilterPinned`. Hydrates results (`_finishInit` + `repairMessageAfterGramJs`)
 * since the pinned banner renders a text preview and the result set is small (<= page size).
 * @returns Pinned messages, newest-first.
 */
export async function getPinnedMessages(
  client: TelegramClient,
  entity: Entity,
  topicId?: number,
  limit: number = PINNED_MESSAGES_PAGE_SIZE,
): Promise<Api.Message[]> {
  const inputPeer = await client.getInputEntity(entity)
  const res = await client.invoke(
    new Api.messages.Search({
      peer: inputPeer,
      q: "",
      filter: new Api.InputMessagesFilterPinned(),
      topMsgId: topicId,
      minDate: 0,
      maxDate: 0,
      offsetId: 0,
      addOffset: 0,
      limit,
      maxId: 0,
      minId: 0,
      hash: generateRandomBigInt(),
    }),
  )
  if (res.className === "messages.MessagesNotModified" || !("messages" in res)) {
    return []
  }
  const entities = new Map<string, Entity>()
  for (const u of res.users) {
    try { entities.set(getPeerId(u), u as unknown as Entity) } catch { /* ignore */ }
  }
  for (const c of res.chats) {
    try { entities.set(getPeerId(c), c as unknown as Entity) } catch { /* ignore */ }
  }
  const out: Api.Message[] = []
  for (const m of res.messages) {
    if (m.className !== "Message") continue
    const msg = m as Api.Message
    try {
      const fin = (msg as { _finishInit?: (a: unknown, b: Map<string, Entity>, c: unknown) => void })._finishInit
      fin?.(client, entities, inputPeer)
    } catch { /* still show raw */ }
    out.push(repairMessageAfterGramJs(msg))
  }
  out.sort(compareMessagesChronological).reverse()
  return out
}

/** Pure cycling helper for the pinned banner pointer. Wraps; safe for length 0/1. */
export function nextPinnedIndex(current: number, length: number): number {
  if (length <= 0) return 0
  return (current + 1) % length
}
