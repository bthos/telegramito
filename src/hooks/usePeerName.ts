import { useEffect, useState } from "react"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"

/** Module-level cache: peerKey → display name. Session-scoped, never evicted. */
const nameCache = new Map<string, string>()

/** For tests only — clears the module-level cache between test cases. */
export function _clearCacheForTest(): void {
  nameCache.clear()
}

function peerKey(peerId: Api.TypePeer | undefined): string {
  if (peerId == null) return ""
  if (peerId.className === "PeerUser") {
    return `u:${String((peerId as Api.PeerUser).userId)}`
  }
  if (peerId.className === "PeerChannel") {
    return `c:${String((peerId as Api.PeerChannel).channelId)}`
  }
  if (peerId.className === "PeerChat") {
    return `h:${String((peerId as Api.PeerChat).chatId)}`
  }
  return ""
}

function extractName(entity: unknown): string {
  if (entity == null || typeof entity !== "object") return ""
  const e = entity as Record<string, unknown>
  // User: prefer firstName + lastName
  if (typeof e.firstName === "string" || typeof e.lastName === "string") {
    const parts = [e.firstName, e.lastName]
      .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    return parts.join(" ")
  }
  // Channel / Chat: title
  if (typeof e.title === "string" && e.title.trim() !== "") {
    return e.title.trim()
  }
  // Fallback: username
  if (typeof e.username === "string" && e.username.trim() !== "") {
    return e.username.trim()
  }
  return ""
}

/**
 * Resolves the display name for a Telegram peer.
 *
 * - Returns `""` immediately when `peerId` is undefined or `client` is null.
 * - Hits the module-level cache synchronously on first render to avoid flash.
 * - Fetches via `client.getEntity()` on cache miss; stores result in cache.
 * - On error, silently returns `""` — no throw, no layout shift.
 */
export function usePeerName(
  peerId: Api.TypePeer | undefined,
  client: TelegramClient | null,
): string {
  const key = peerKey(peerId)

  const [name, setName] = useState<string>(() => {
    if (!key) return ""
    return nameCache.get(key) ?? ""
  })

  useEffect(() => {
    if (!key || client == null) return

    // Cache hit — update state synchronously, no fetch needed.
    const cached = nameCache.get(key)
    if (cached !== undefined) {
      setName(cached)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const entity = await client.getEntity(peerId!)
        if (cancelled) return
        const resolved = extractName(entity)
        nameCache.set(key, resolved)
        setName(resolved)
      } catch {
        // Silent failure — leave state as "".
      }
    })()

    return () => {
      cancelled = true
    }
  }, [key, client]) // eslint-disable-line react-hooks/exhaustive-deps

  return name
}
