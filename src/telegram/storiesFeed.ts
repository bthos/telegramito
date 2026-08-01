import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { getPeerId } from "telegram/Utils"
import { withTransientRetry } from "./invokeWithTransientRetry"

export type StoryPeerEntry = {
  peer: Api.TypePeer
  /** Marked peer id — see {@link storyPeerDialogKey}'s doc comment. */
  peerKey: string
  name: string
  isOwn: boolean
  maxReadId: number
  stories: Api.StoryItem[]
}

/**
 * Marked peer id (matches `dialogPeerKey`'s convention: `d.id.toString(10)`,
 * itself GramJS's marked id via `getPeerId(peer, true)`) — used for React keys,
 * deny-list/night-lock identity, and local read-state tracking.
 *
 * Deliberately NOT the `u:`/`c:`/`h:`-prefixed {@link import("./peerKey").peerKeyFromPeer}
 * format: that format is a different, duck-typed scheme used only where
 * `PeerAvatar`/`usePeerPhoto` need it (via `peerKeyToEntityLike`). Mixing the
 * two silently breaks deny-list/night-lock filtering with no visible error,
 * since both produce plausible-looking strings.
 */
export function storyPeerDialogKey(peer: Api.TypePeer): string {
  return getPeerId(peer, true)
}

/** Pure: a story is active strictly before its `expireDate`, inactive at/after it. */
export function isStoryActive(story: Api.StoryItem, nowSec: number): boolean {
  return story.expireDate > nowSec
}

/** AC2 — unread when any story in the peer's stack has an id past `maxReadId`. */
export function isPeerEntryUnread(entry: StoryPeerEntry): boolean {
  return entry.stories.some((s) => s.id > entry.maxReadId)
}

function newestStoryId(entry: StoryPeerEntry): number {
  return entry.stories.reduce((max, s) => Math.max(max, s.id), 0)
}

/**
 * AC13 — own first, then unread (newest story first), then read (newest story
 * first). Read/unread classification comes from {@link isPeerEntryUnread};
 * this only orders for display.
 */
export function orderStoryEntries(entries: StoryPeerEntry[]): StoryPeerEntry[] {
  const own = entries.filter((e) => e.isOwn)
  const unread = entries.filter((e) => !e.isOwn && isPeerEntryUnread(e))
  const read = entries.filter((e) => !e.isOwn && !isPeerEntryUnread(e))
  const byNewestFirst = (a: StoryPeerEntry, b: StoryPeerEntry) => newestStoryId(b) - newestStoryId(a)
  return [...own, ...unread.sort(byNewestFirst), ...read.sort(byNewestFirst)]
}

/** Telegram-style relative-age buckets: "now" / "{{n}}m" / "{{n}}h" / "{{n}}d". */
export function formatStoryAge(dateSec: number, nowSec: number): string {
  const diff = Math.max(0, nowSec - dateSec)
  if (diff < 60) return "now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function displayNameForUser(u: Api.User): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
  if (full) return full
  if (u.username) return u.username
  return "?"
}

function displayNameForChat(c: Api.Channel | Api.ChannelForbidden | Api.Chat | Api.ChatForbidden): string {
  const title = c.title
  return typeof title === "string" && title.trim() ? title.trim() : "?"
}

/**
 * Builds a `peerKey -> display name` index from `stories.AllStories`'s
 * `users`/`chats` hydration arrays, keyed by wrapping each raw entity's own id
 * in a fresh Peer object and running it through {@link storyPeerDialogKey}.
 *
 * Deliberately does NOT call `getPeerId`/`getInputPeer` directly on the raw
 * `Api.User`/`Api.Chat` records: those helpers require `accessHash` (or `min`)
 * to resolve an `InputPeer` and throw otherwise, and hydration records from
 * this endpoint frequently omit `accessHash`. Wrapping the raw numeric id in a
 * `PeerUser`/`PeerChat`/`PeerChannel` first sidesteps that entirely — the
 * marked-id math only needs the id, never the hash.
 */
function buildNameIndex(users: Api.TypeUser[], chats: Api.TypeChat[]): Map<string, string> {
  const idx = new Map<string, string>()
  for (const u of users) {
    if (u.className !== "User") continue
    const key = storyPeerDialogKey(new Api.PeerUser({ userId: u.id }))
    idx.set(key, displayNameForUser(u))
  }
  for (const c of chats) {
    if (c.className === "Channel" || c.className === "ChannelForbidden") {
      const ch = c as Api.Channel | Api.ChannelForbidden
      const key = storyPeerDialogKey(new Api.PeerChannel({ channelId: ch.id }))
      idx.set(key, displayNameForChat(ch))
    } else if (c.className === "Chat" || c.className === "ChatForbidden") {
      const ch = c as Api.Chat | Api.ChatForbidden
      const key = storyPeerDialogKey(new Api.PeerChat({ chatId: ch.id }))
      idx.set(key, displayNameForChat(ch))
    }
  }
  return idx
}

/**
 * AC1 — fetches the viewer's Stories feed. OQ4 default: always a full
 * refetch (`hidden: false`), never `state`/`next` incremental paging.
 *
 * Only peers with at least one renderable, non-expired story are eligible
 * (AC1's literal "non-expired story (`expireDate` in the future)" wording).
 * `GetAllStories` routinely returns `StoryItemSkipped`/`StoryItemDeleted`
 * placeholders alongside real `StoryItem`s — the common space-saving case,
 * not an edge case — and a genuine `StoryItem` can itself be past
 * `expireDate`. Both are filtered out below; a peer left with zero stories
 * is dropped entirely rather than surfaced as an empty, unopenable entry
 * (opening one crashes `StoryViewer`, which indexes into `stories[0]`).
 */
export async function getAllStories(client: TelegramClient): Promise<{ entries: StoryPeerEntry[] }> {
  const res = await withTransientRetry(client, () =>
    client.invoke(new Api.stories.GetAllStories({ hidden: false })),
  )
  if (res.className === "stories.AllStoriesNotModified") {
    return { entries: [] }
  }
  const nameIndex = buildNameIndex(res.users, res.chats)
  const nowSec = Math.floor(Date.now() / 1000)
  const entries: StoryPeerEntry[] = res.peerStories
    .map((ps) => {
      const peerKey = storyPeerDialogKey(ps.peer)
      const stories = ps.stories.filter(
        (s): s is Api.StoryItem => s.className === "StoryItem" && isStoryActive(s, nowSec),
      )
      // Decision Record 3: own-peer detection via StoryItem.out (every story in
      // the stack posted by the viewer) rather than threading an ownUserId prop.
      const isOwn = stories.length > 0 && stories.every((s) => s.out === true)
      return {
        peer: ps.peer,
        peerKey,
        name: nameIndex.get(peerKey) ?? "?",
        isOwn,
        maxReadId: ps.maxReadId ?? 0,
        stories,
      }
    })
    .filter((e) => e.stories.length > 0) // AC1: no renderable active story => not an eligible peer
  return { entries }
}

/** AC6 — marks stories read for `peer` up through `maxId`. */
export async function readStoriesForPeer(
  client: TelegramClient,
  peer: Api.TypePeer,
  maxId: number,
): Promise<void> {
  const inputPeer = await client.getInputEntity(peer)
  await client.invoke(new Api.stories.ReadStories({ peer: inputPeer, maxId }))
}

/** AC15 — view-count parity with official clients; no-ops for an empty id list. */
export async function incrementStoryViews(
  client: TelegramClient,
  peer: Api.TypePeer,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return
  const inputPeer = await client.getInputEntity(peer)
  await client.invoke(new Api.stories.IncrementStoryViews({ peer: inputPeer, id: ids }))
}
