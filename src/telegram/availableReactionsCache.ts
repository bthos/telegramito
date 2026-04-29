import { Api } from "telegram"
import type { TelegramClient } from "telegram"

type Cache = {
  hash: number
  list: Api.AvailableReaction[]
}

let cache: Cache | null = null

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
 * Fetches global available reactions (user / default set) with `hash` cache.
 */
export async function getAvailableReactionsForClient(client: TelegramClient): Promise<Api.AvailableReaction[]> {
  const hash = cache?.hash ?? 0
  const r = await client.invoke(new Api.messages.GetAvailableReactions({ hash }))
  if (r.className === "messages.AvailableReactionsNotModified") {
    return cache?.list ?? []
  }
  if (r.className === "messages.AvailableReactions") {
    cache = { hash: r.hash, list: r.reactions }
    return r.reactions
  }
  return []
}
