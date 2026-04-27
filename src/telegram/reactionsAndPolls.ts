import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { Buffer } from "buffer"

/**
 * @param entity Chat / user (same as in `getMessages` for the dialog)
 * @param reactions Reactions the current user should have; empty = clear
 */
export async function setMessageReactions(
  client: TelegramClient,
  entity: unknown,
  messageId: number,
  reactions: readonly Api.TypeReaction[]
): Promise<unknown> {
  const peer = await client.getInputEntity(entity as never)
  if (reactions.length === 0) {
    return client.invoke(
      new Api.messages.SendReaction({
        peer,
        msgId: messageId,
        reaction: [new Api.ReactionEmpty()],
      })
    )
  }
  return client.invoke(
    new Api.messages.SendReaction({
      peer,
      msgId: messageId,
      reaction: [...reactions] as Api.TypeReaction[],
    })
  )
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
