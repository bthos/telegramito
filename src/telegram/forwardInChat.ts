import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { generateRandomBigInt } from "telegram/Helpers"
import { withTransientRetry } from "./invokeWithTransientRetry"

/**
 * Forwards a message to the current chat. In forum supergroups, `topicId` targets the thread
 * (same as the active subchat).
 */
export async function forwardMessageInCurrentChat(
  client: TelegramClient,
  entity: unknown,
  message: Api.Message,
  topicId: number | null
): Promise<unknown> {
  const id = message.id
  if (id == null) {
    throw new Error("message has no id")
  }
  if (topicId != null) {
    const toPeer = await client.getInputEntity(entity as never)
    return withTransientRetry(client, () =>
      client.invoke(
        new Api.messages.ForwardMessages({
          fromPeer: toPeer,
          toPeer: toPeer,
          id: [id],
          randomId: [generateRandomBigInt()],
          topMsgId: topicId,
        })
      )
    )
  }
  return withTransientRetry(client, () =>
    client.forwardMessages(entity as never, { messages: [id], fromPeer: entity as never })
  )
}
