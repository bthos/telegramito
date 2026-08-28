import { useEffect, useState } from "react"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { repairMessageAfterGramJs } from "../telegram/messageMediaGramRepair"

type PeerEntity = Api.User | Api.Chat | Api.Channel

/** The four shared-media tabs in the ChatContextPanel. */
export type MediaTab = "photos" | "videos" | "files" | "links"

/** Limits per tab: grids use 6 (visual cell count), lists use 20. */
const TAB_LIMIT: Record<MediaTab, number> = {
  photos: 6,
  videos: 6,
  files: 20,
  links: 20,
}

function tabFilter(tab: MediaTab): Api.TypeMessagesFilter {
  switch (tab) {
    case "photos":
      return new Api.InputMessagesFilterPhotos()
    case "videos":
      return new Api.InputMessagesFilterVideo()
    case "files":
      return new Api.InputMessagesFilterDocument()
    case "links":
      return new Api.InputMessagesFilterUrl()
  }
}

/** Module-level cache keyed by `entityId:tab`. Session-scoped, never evicted. */
const sharedMediaCache = new Map<string, Api.Message[]>()

/** For tests only — clears the module-level cache between test cases. */
export function _clearSharedMediaCacheForTest(): void {
  sharedMediaCache.clear()
}

function cacheKey(entityId: string, tab: MediaTab): string {
  return `${entityId}:${tab}`
}

function entityId(entity: PeerEntity): string {
  return String(entity.id)
}

/**
 * Fetches recent messages for a peer filtered by the given media tab.
 *
 * - Returns idle state immediately when entity or client is absent.
 * - Serves from module-level cache synchronously on cache hit.
 * - Fetches via `client.getMessages` with the appropriate filter on miss.
 * - Filters out non-Message entries (e.g. MessageService) from raw results.
 * - On error, sets error string and leaves items empty.
 * - Cache is isolated per entity+tab combination.
 */
export function usePeerSharedMedia(
  entity: PeerEntity | null | undefined,
  client: TelegramClient | null,
  tab: MediaTab,
): { items: Api.Message[]; loading: boolean; error: string | null } {
  const eid = entity != null ? entityId(entity) : null
  const key = eid != null ? cacheKey(eid, tab) : null

  const [items, setItems] = useState<Api.Message[]>(() => {
    if (!key) return []
    return sharedMediaCache.get(key) ?? []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    if (!key || !client) return false
    return !sharedMediaCache.has(key)
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!key || client == null || entity == null) return

    const cached = sharedMediaCache.get(key)
    if (cached !== undefined) {
      queueMicrotask(() => {
        setItems(cached)
        setLoading(false)
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const raw = await client.getMessages(entity as never, {
            filter: tabFilter(tab),
            limit: TAB_LIMIT[tab],
          })
          if (cancelled) return
          const msgs = (Array.isArray(raw) ? raw : [])
            .filter(
              (m): m is Api.Message =>
                m != null && (m as Api.Message).className === "Message",
            )
            .map(repairMessageAfterGramJs)
          sharedMediaCache.set(key, msgs)
          setItems(msgs)
        } catch (e) {
          if (cancelled) return
          setError(e instanceof Error ? e.message : "Failed to load media")
          setItems([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    })

    return () => {
      cancelled = true
    }
  }, [key, client, entity, tab])

  return { items, loading, error }
}
