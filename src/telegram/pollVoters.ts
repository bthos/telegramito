import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { Buffer } from "buffer"
import { withTransientRetry } from "./invokeWithTransientRetry"
import { displayNameForPeerInLists } from "./reactionRepliers"

export type PollVoterRow = {
  key: string
  name: string
  date: number
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

function id10(x: unknown): string {
  if (x == null) {
    return ""
  }
  if (typeof (x as { toString?: (base: number) => string }).toString === "function") {
    return (x as { toString: (base: number) => string }).toString(10)
  }
  return String(x)
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

export function mapPollVotesList(
  res: Api.messages.VotesList
): { rows: PollVoterRow[]; total: number; nextOffset: string | undefined } {
  const { votes, count, nextOffset, users, chats } = res
  const rows: PollVoterRow[] = []
  let i = 0
  for (const v of votes) {
    if (v.className === "MessagePeerVote") {
      const m = v as Api.MessagePeerVote
      rows.push({
        key: `${i}-${rowKeyForPeer(m.peer)}-${m.date}`,
        name: displayNameForPeerInLists(m.peer, users, chats),
        date: m.date,
      })
    } else if (v.className === "MessagePeerVoteInputOption") {
      const m = v as Api.MessagePeerVoteInputOption
      rows.push({
        key: `${i}-${rowKeyForPeer(m.peer)}-${m.date}`,
        name: displayNameForPeerInLists(m.peer, users, chats),
        date: m.date,
      })
    } else if (v.className === "MessagePeerVoteMultiple") {
      const m = v as Api.MessagePeerVoteMultiple
      rows.push({
        key: `${i}-${rowKeyForPeer(m.peer)}-${m.date}`,
        name: displayNameForPeerInLists(m.peer, users, chats),
        date: m.date,
      })
    }
    i += 1
  }
  return { rows, total: count, nextOffset }
}

export async function getPollVotesPage(
  client: TelegramClient,
  entity: unknown,
  messageId: number,
  option: unknown,
  options?: { offset?: string; limit?: number }
): Promise<Api.messages.VotesList> {
  const peer = await client.getInputEntity(entity as never)
  return withTransientRetry(client, () =>
    client.invoke(
      new Api.messages.GetPollVotes({
        peer,
        id: messageId,
        option: toBuffer(option),
        limit: options?.limit ?? 50,
        offset: options?.offset,
      })
    ) as Promise<Api.messages.VotesList>
  )
}
