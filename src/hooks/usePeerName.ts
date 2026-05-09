import { useEffect, useState } from "react"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { telegramEntityDisplayName } from "../util/telegramEntityDisplayName"
import { peerKeyFromPeer } from "../telegram/peerKey"

/** Module-level cache: peerKey → display name. Session-scoped, never evicted. */
const nameCache = new Map<string, string>()

/** For tests only — clears the module-level cache between test cases. */
export function _clearCacheForTest(): void {
  nameCache.clear()
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
  const key = peerKeyFromPeer(peerId)

  const [name, setName] = useState<string>(() => {
    if (!key) return ""
    return nameCache.get(key) ?? ""
  })

  useEffect(() => {
    if (!key || client == null) return

    // Cache hit — update state synchronously, no fetch needed.
    const cached = nameCache.get(key)
    if (cached !== undefined) {
      queueMicrotask(() => {
        setName(cached)
      })
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const entity = await client.getEntity(peerId!)
        if (cancelled) return
        const resolved = telegramEntityDisplayName(entity)
        nameCache.set(key, resolved)
        setName(resolved)
      } catch {
        // Silent failure — leave state as "".
      }
    })()

    return () => {
      cancelled = true
    }
  }, [key, client, peerId])

  return name
}
