import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Entity } from "telegram/define"
import { withTransientRetry } from "./invokeWithTransientRetry"

/** Highest numeric message id in the batch (for read receipts). */
export function maxMessageIdInBatch(messages: readonly Api.Message[]): number | undefined {
  let max = 0
  for (const m of messages) {
    if (m.className !== "Message" || m.id == null) {
      continue
    }
    const id = typeof m.id === "number" ? m.id : Number(m.id)
    if (!Number.isFinite(id) || id <= 0) {
      continue
    }
    if (id > max) {
      max = id
    }
  }
  return max > 0 ? max : undefined
}

/**
 * Id to send as `read_max_id` / `max_id` when marking read.
 * For forum threads, merges {@link Api.ForumTopic.topMessage} so we still clear server unreads
 * when the local message list has not yet loaded the latest row (common with search/history gaps).
 */
export function readMaxIdForMarkRead(
  messages: readonly Api.Message[],
  opts: { isForum: boolean; topic: Api.ForumTopic | undefined },
): number | undefined {
  const fromList = maxMessageIdInBatch(messages)
  if (opts.isForum && opts.topic != null) {
    const top = opts.topic.topMessage
    if (typeof top === "number" && top > 0) {
      const merged = Math.max(fromList ?? 0, top)
      return merged > 0 ? merged : undefined
    }
  }
  return fromList
}

/**
 * Marks chat / forum topic history as read up to {@link maxId} (Telegram MTProto).
 * Forum supergroups with topics require {@link messages.ReadDiscussion}.
 */
export async function markChatReadUpTo(
  client: TelegramClient,
  entity: Entity,
  maxId: number,
  opts: { isForum: boolean; topicId: number | null },
): Promise<void> {
  if (maxId <= 0) {
    return
  }
  await withTransientRetry(client, async () => {
    const peer = await client.getInputEntity(entity)
    if (opts.isForum && opts.topicId != null) {
      await client.invoke(
        new Api.messages.ReadDiscussion({
          peer,
          msgId: opts.topicId,
          readMaxId: maxId,
        })
      )
      return
    }
    await client.invoke(
      new Api.messages.ReadHistory({
        peer,
        maxId,
      })
    )
  })
}
