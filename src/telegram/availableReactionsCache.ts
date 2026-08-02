import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { getReactionStaticIconObjectUrl } from "./customEmojiCache"

type Cache = {
  hash: number
  list: Api.AvailableReaction[]
}

let cache: Cache | null = null
let inFlight: Promise<Api.AvailableReaction[]> | null = null

/** Drops server cache (e.g. on sign-out) so the next session refetches. */
export function clearAvailableReactionsCache(): void {
  cache = null
  inFlight = null
}

/** In-memory list from the last successful fetch (may be empty before first load). */
export function peekAvailableReactionsCache(): Api.AvailableReaction[] {
  return cache?.list ?? []
}

export function filterActiveAvailableReactions(
  raw: readonly Api.AvailableReaction[],
): Api.AvailableReaction[] {
  return raw.filter(
    (x): x is Api.AvailableReaction => x.className === "AvailableReaction" && !x.inactive,
  )
}

function docToReaction(d: Api.TypeDocument | undefined, fallbackEmoji: string): Api.TypeReaction {
  if (d && d.className === "Document") {
    const doc = d as Api.Document
    const isCustom = doc.attributes?.some((a) => a.className === "DocumentAttributeCustomEmoji")
    if (isCustom && doc.id != null) {
      return new Api.ReactionCustomEmoji({ documentId: doc.id })
    }
  }
  return new Api.ReactionEmoji({ emoticon: fallbackEmoji })
}

/**
 * Maps a server `availableReaction#` to the `reaction` TL object for `messages.sendReaction`.
 * Prefers `ReactionCustomEmoji` when the static icon is a custom-emoji document.
 */
export function availableEntryToTypeReaction(item: Api.AvailableReaction): Api.TypeReaction {
  if (item.className !== "AvailableReaction") {
    return new Api.ReactionEmoji({ emoticon: item.reaction || " " })
  }
  return docToReaction(item.staticIcon, item.reaction)
}

/** Same asset priority as the reaction picker (hero / 3D-style when present). */
export function pickReactionDisplayDocument(
  item: Api.AvailableReaction,
): Api.TypeDocument | undefined {
  if (item.className !== "AvailableReaction") {
    return undefined
  }
  const c = item.centerIcon
  if (c && c.className === "Document" && (c as Api.Document).id != null) {
    return c
  }
  return item.staticIcon
}

/**
 * Fetches global available reactions (user / default set), cached for the session.
 *
 * `MessageReactionsView` calls this from every message row's mount effect. Rows
 * mount in bursts (e.g. jumping to an old message expands the visible window by
 * dozens of rows at once), so a cache hit short-circuits before the network and
 * concurrent misses join a single in-flight request — otherwise a burst of ~70
 * simultaneous `messages.GetAvailableReactions` calls hits Telegram's flood-wait
 * limit on that method almost immediately, stalling the transcript.
 */
export function getAvailableReactionsForClient(client: TelegramClient): Promise<Api.AvailableReaction[]> {
  if (cache) {
    return Promise.resolve(cache.list)
  }
  if (inFlight) {
    return inFlight
  }
  inFlight = (async () => {
    try {
      const r = await client.invoke(new Api.messages.GetAvailableReactions({ hash: 0 }))
      if (r.className === "messages.AvailableReactions") {
        cache = { hash: r.hash, list: r.reactions }
        return r.reactions
      }
      return []
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

const PREFETCH_REACTION_ICON_CONCURRENCY = 14

/**
 * Warms {@link getAvailableReactionsForClient} plus reaction picker artwork so the popup opens
 * without waiting on MTProto + dozens of sequential icon resolves.
 */
export async function prefetchAvailableReactionsAssets(client: TelegramClient): Promise<void> {
  try {
    const list = await getAvailableReactionsForClient(client)
    const active = filterActiveAvailableReactions(list)
    const docs: Api.Document[] = []
    const seen = new Set<string>()
    for (const item of active) {
      const d = pickReactionDisplayDocument(item)
      if (d?.className !== "Document") {
        continue
      }
      const id = (d as Api.Document).id
      if (id == null) {
        continue
      }
      const k = String(id)
      if (seen.has(k)) {
        continue
      }
      seen.add(k)
      docs.push(d as Api.Document)
    }
    for (let i = 0; i < docs.length; i += PREFETCH_REACTION_ICON_CONCURRENCY) {
      const slice = docs.slice(i, i + PREFETCH_REACTION_ICON_CONCURRENCY)
      await Promise.all(slice.map((doc) => getReactionStaticIconObjectUrl(client, doc)))
    }
  } catch {
    /* best-effort */
  }
}
