import { generateRandomBigInt } from "telegram/Helpers"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Entity } from "telegram/define"
import { getInputChannel, getPeerId } from "telegram/Utils"

/** Forum supergroup: topics enabled and not the “as single chat” layout. */
export function isForumWithSubchats(
  entity: Entity | undefined
): entity is Api.Channel {
  if (entity == null) return false
  if (typeof entity !== "object" || !("className" in entity)) return false
  if (entity.className !== "Channel") return false
  const c = entity as Api.Channel
  if (!c.megagroup || !c.forum) return false
  const v = c as Api.Channel & { viewForumAsMessages?: boolean }
  if (v.viewForumAsMessages) return false
  return true
}

/**
 * @returns Active forum topics (drops deleted stubs).
 */
export async function listForumTopics(
  client: TelegramClient,
  entity: Entity
): Promise<Api.ForumTopic[]> {
  const ch = getInputChannel(entity) as unknown as Api.TypeEntityLike
  if (ch instanceof Api.InputChannelEmpty) {
    return []
  }
  const res = await client.invoke(
    new Api.channels.GetForumTopics({
      channel: ch,
      offsetDate: 0,
      offsetId: 0,
      offsetTopic: 0,
      limit: 100,
    })
  )
  if (res.className !== "messages.ForumTopics") {
    return []
  }
  const out: Api.ForumTopic[] = []
  for (const t of res.topics) {
    if (t.className === "ForumTopic") {
      out.push(t)
    }
  }
  return out
}

/**
 * Message history for one forum thread (subchat). Plain `getMessages` is not
 * enough when topics are shown as tabs in Telegram; use `messages.search`
 * with `topMsgId` = forum topic id.
 * @param olderThanId  If set, returns messages *older* than this id (pagination toward history).
 */
export async function getForumThreadMessages(
  client: TelegramClient,
  entity: Entity,
  topicId: number,
  limit: number,
  olderThanId: number = 0
): Promise<Api.Message[]> {
  const inputPeer = await client.getInputEntity(entity)
  // First page: offset 0, maxDate 0. “Older” pages: same pattern as GramJS
  // _MessagesIter._updateOffset for Search (offset from last + maxDate: -1),
  // otherwise the server often returns an empty set.
  const isContinuation = olderThanId > 0
  const res = await client.invoke(
    new Api.messages.Search({
      peer: inputPeer,
      q: "",
      filter: new Api.InputMessagesFilterEmpty(),
      topMsgId: topicId,
      minDate: 0,
      maxDate: isContinuation ? -1 : 0,
      offsetId: isContinuation ? olderThanId : 0,
      addOffset: 0,
      limit,
      maxId: 0,
      minId: 0,
      hash: generateRandomBigInt(),
    })
  )
  if (res.className === "messages.MessagesNotModified" || !("messages" in res)) {
    return []
  }
  const entities = new Map<string, Entity>()
  for (const u of res.users) {
    try {
      entities.set(getPeerId(u), u as unknown as Entity)
    } catch {
      /* ignore */
    }
  }
  for (const c of res.chats) {
    try {
      entities.set(getPeerId(c), c as unknown as Entity)
    } catch {
      /* ignore */
    }
  }
  const out: Api.Message[] = []
  for (const m of res.messages) {
    if (m.className !== "Message") continue
    const msg = m as Api.Message
    try {
      // GramJS: hydrate entities for getSender / media (see iterMessages)
      const fin = (msg as { _finishInit?: (a: unknown, b: Map<string, Entity>, c: unknown) => void })._finishInit
      fin?.(client, entities, inputPeer)
    } catch {
      /* still show raw */
    }
    out.push(msg)
  }
  return out.sort((a, b) => a.date - b.date)
}

/**
 * New message inside a forum topic. Uses `InputReplyToMessage` with
 * `topMsgId` = topic id, and `replyToMsgId` of the message being answered when set.
 */
export async function sendInForumThread(
  client: TelegramClient,
  entity: Entity,
  text: string,
  topicId: number,
  replyToMessageId?: number
): Promise<Api.TypeUpdates> {
  const peer = await client.getInputEntity(entity)
  const rid =
    typeof replyToMessageId === "number" && replyToMessageId > 0
      ? replyToMessageId
      : 0
  return client.invoke(
    new Api.messages.SendMessage({
      peer,
      message: text,
      randomId: generateRandomBigInt(),
      replyTo: new Api.InputReplyToMessage({
        replyToMsgId: rid,
        topMsgId: topicId,
      }),
    })
  )
}

export function defaultForumTopicId(topics: Api.ForumTopic[]): number | null {
  if (topics.length === 0) return null
  const general = topics.find((t) => t.id === 1)
  if (general) return general.id
  return topics[0]?.id ?? null
}

export function forumTopicLabel(t: Api.ForumTopic): string {
  return t.title || `#${t.id}`
}

/** Short unread suffix for use in a native <select> (badges are not available per option). */
export function formatTopicUnreadSuffix(topic: Api.ForumTopic, empty = ""): string {
  const n = topic.unreadCount ?? 0
  if (n <= 0) {
    return empty
  }
  return n > 99 ? "  (99+)" : `  (${n})`
}
