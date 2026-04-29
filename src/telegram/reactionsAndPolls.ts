import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { Buffer } from "buffer"

/**
 * Telegram answers {@link Api.messages.SendReaction} with {@link Api.TypeUpdates}; when present,
 * {@link Api.UpdateMessageReactions} carries authoritative counters — faster than `getMessages`.
 */
function extractReactionsFromSendResult(
  result: unknown,
  msgId: number,
): Api.TypeMessageReactions | null {
  if (result == null || typeof result !== "object") {
    return null
  }
  const r = result as { className?: string }

  const match = (u: Api.TypeUpdate): Api.TypeMessageReactions | null => {
    if (u.className !== "UpdateMessageReactions") {
      return null
    }
    const ur = u as Api.UpdateMessageReactions
    if (Number(ur.msgId) !== msgId) {
      return null
    }
    return ur.reactions
  }

  if (r.className === "Updates" || r.className === "UpdatesCombined") {
    for (const u of (result as Api.Updates).updates) {
      const found = match(u)
      if (found != null) {
        return found
      }
    }
    return null
  }
  if (r.className === "UpdateShort") {
    return match((result as Api.UpdateShort).update)
  }
  return null
}

/**
 * @param entity Chat / user (same as in `getMessages` for the dialog)
 * @param reactions Reactions the current user should have; empty = clear
 * @returns Updated `MessageReactions` from `UpdateMessageReactions` when the server includes it, else `null` (refetch the message)
 */
export async function setMessageReactions(
  client: TelegramClient,
  entity: unknown,
  messageId: number,
  reactions: readonly Api.TypeReaction[]
): Promise<Api.TypeMessageReactions | null> {
  const peer = await client.getInputEntity(entity as never)
  if (reactions.length === 0) {
    const res = await client.invoke(
      new Api.messages.SendReaction({
        peer,
        msgId: messageId,
        reaction: [new Api.ReactionEmpty()],
      })
    )
    return extractReactionsFromSendResult(res, messageId)
  }
  const res = await client.invoke(
    new Api.messages.SendReaction({
      peer,
      msgId: messageId,
      reaction: [...reactions] as Api.TypeReaction[],
    })
  )
  return extractReactionsFromSendResult(res, messageId)
}

function toBuffer(b: unknown): Buffer {
  if (Buffer.isBuffer(b)) {
    return b
  }
  if (b instanceof Uint8Array) {
    return Buffer.from(b)
  }
  if (b && ArrayBuffer.isView(b)) {
    return Buffer.from(b.buffer as ArrayBuffer, b.byteOffset, b.byteLength)
  }
  return Buffer.alloc(0)
}

export async function sendPollVote(
  client: TelegramClient,
  entity: unknown,
  messageId: number,
  options: readonly unknown[]
): Promise<unknown> {
  const peer = await client.getInputEntity(entity as never)
  const opts = options.map((x) => toBuffer(x))
  return client.invoke(
    new Api.messages.SendVote({
      peer,
      msgId: messageId,
      options: opts,
    })
  )
}
