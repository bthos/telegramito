import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { withTransientRetry } from "./invokeWithTransientRetry"

export type ReactionReplierRow = {
  key: string
  name: string
  isMine: boolean
  date: number
}

function id10(x: unknown): string {
  if (x == null) {
    return ""
  }
  if (typeof (x as { toString?: (b: number) => string }).toString === "function") {
    return (x as { toString: (b: number) => string }).toString(10)
  }
  return String(x)
}

export function displayNameForPeerInLists(
  peer: Api.TypePeer,
  users: readonly Api.TypeUser[],
  chats: readonly Api.TypeChat[]
): string {
  if (peer.className === "PeerUser") {
    const want = id10((peer as Api.PeerUser).userId)
    for (const u of users) {
      if (u.className === "User") {
        const uu = u as Api.User
        if (id10(uu.id) === want) {
          const name = [uu.firstName, uu.lastName].filter(Boolean).join(" ").trim()
          if (name) {
            return name
          }
          if (uu.username) {
            return `@${uu.username}`
          }
        }
      }
    }
  }
  if (peer.className === "PeerChannel") {
    const want = id10((peer as Api.PeerChannel).channelId)
    for (const c of chats) {
      if (c.className === "Channel") {
        const ch = c as Api.Channel
        if (id10(ch.id) === want) {
          return ch.title || ch.username || `channel ${want}`
        }
      }
    }
  }
  if (peer.className === "PeerChat") {
    const want = id10((peer as Api.PeerChat).chatId)
    for (const c of chats) {
      if (c.className === "Chat") {
        const ch = c as Api.Chat
        if (id10(ch.id) === want) {
          return ch.title || `chat ${want}`
        }
      }
    }
  }
  return "—"
}

function rowKeyForPeer(peer: Api.TypePeer): string {
  if (peer.className === "PeerUser") {
    return `u-${id10((peer as Api.PeerUser).userId)}`
  }
  if (peer.className === "PeerChannel") {
    return `c-${id10((peer as Api.PeerChannel).channelId)}`
  }
  if (peer.className === "PeerChat") {
    return `g-${id10((peer as Api.PeerChat).chatId)}`
  }
  return "?"
}

export function mapReactionsList(
  res: Api.messages.MessageReactionsList
): { rows: ReactionReplierRow[]; total: number; nextOffset: string | undefined } {
  const { reactions, count, nextOffset, users, chats } = res
  const rows: ReactionReplierRow[] = []
  let i = 0
  for (const x of reactions) {
    if (x.className !== "MessagePeerReaction") {
      continue
    }
    const r = x as Api.MessagePeerReaction
    rows.push({
      key: `${i}-${rowKeyForPeer(r.peerId)}-${r.date}`,
      name: displayNameForPeerInLists(r.peerId, users, chats),
      isMine: Boolean(r.my),
      date: r.date,
    })
    i += 1
  }
  return { rows, total: count, nextOffset }
}

export async function getMessageReactionsListPage(
  client: TelegramClient,
  entity: unknown,
  messageId: number,
  reaction: Api.TypeReaction,
  options?: { offset?: string; limit?: number }
): Promise<Api.messages.MessageReactionsList> {
  const peer = await client.getInputEntity(entity as never)
  return withTransientRetry(client, () =>
    client.invoke(
      new Api.messages.GetMessageReactionsList({
        peer,
        id: messageId,
        reaction,
        limit: options?.limit ?? 100,
        offset: options?.offset,
      })
    ) as Promise<Api.messages.MessageReactionsList>
  )
}
