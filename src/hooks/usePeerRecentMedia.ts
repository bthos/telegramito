import { useEffect, useState } from "react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"

type PeerEntity = Api.User | Api.Chat | Api.Channel

/** Module-level cache: entityId → fetched messages. Session-scoped, never evicted. */
const mediaCache = new Map<string, Api.Message[]>()

/** For tests only — clears the module-level cache between test cases. */
export function _clearMediaCacheForTest(): void {
  mediaCache.clear()
}

function entityKey(entity: PeerEntity): string {
  return String(entity.id)
}

/**
 * Fetches the 6 most recent photo/video messages for a peer.
 *
 * - Returns idle state immediately when entity or client is absent.
 * - Serves from module-level cache synchronously on cache hit.
 * - Fetches via client.getMessages with InputMessagesFilterPhotos on miss.
 * - Filters out non-Message entries (e.g. MessageService) from raw results.
 * - On error, sets error string and leaves items empty.
 */
export function usePeerRecentMedia(
  entity: PeerEntity | null | undefined,
  client: TelegramClient | null,
): { items: Api.Message[]; loading: boolean; error: string | null } {
  const key = entity != null ? entityKey(entity) : null

  const [items, setItems] = useState<Api.Message[]>(() => {
    if (!key) return []
    return mediaCache.get(key) ?? []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    if (!key || !client) return false
    return !mediaCache.has(key)
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!key || client == null || entity == null) return

    const cached = mediaCache.get(key)
    if (cached !== undefined) {
      setItems(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const raw = await client.getMessages(entity as never, {
          filter: new Api.InputMessagesFilterPhotos(),
          limit: 6,
        })
        if (cancelled) return
        const msgs = (Array.isArray(raw) ? raw : []).filter(
          (m): m is Api.Message => m != null && (m as Api.Message).className === "Message",
        )
        mediaCache.set(key, msgs)
        setItems(msgs)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Failed to load media")
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [key, client]) // eslint-disable-line react-hooks/exhaustive-deps

  return { items, loading, error }
}
