import { useEffect, useState } from "react"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { telegramEntityDisplayName } from "../util/telegramEntityDisplayName"
import { peerKeyFromPeer } from "../telegram/peerKey"

/** Module-level cache: peerKey → display name. Session-scoped, never evicted. */
const nameCache = new Map<string, string>()

/** Peer keys queued for the next microtask flush, and how to resolve each once it lands. */
let pendingBatch: Map<string, { peerId: Api.TypePeer; resolve: (name: string) => void }> | null = null
let pendingClient: TelegramClient | null = null

/** Keys with a resolution queued or already dispatched — new callers join instead of refetching. */
const inFlight = new Map<string, Promise<string>>()

/**
 * Resolves every peer queued since the last flush in one `client.getEntity([...])`
 * round-trip. Message rows mount in bursts (e.g. jumping to an old message expands
 * the mounted window by dozens of rows at once); without batching, each row's
 * cache miss fired its own single-id `users.GetUsers` call and a burst of ~70
 * simultaneous calls hits Telegram's flood-wait limit on that method almost
 * immediately, stalling the transcript.
 */
function flushBatch(): void {
  const batch = pendingBatch
  const client = pendingClient
  pendingBatch = null
  pendingClient = null
  if (!batch || !client || batch.size === 0) {
    return
  }
  const entries = Array.from(batch.entries())
  void (async () => {
    try {
      const resolved = await client.getEntity(entries.map(([, e]) => e.peerId))
      const list = Array.isArray(resolved) ? resolved : [resolved]
      entries.forEach(([key, entry], i) => {
        const name = telegramEntityDisplayName(list[i])
        nameCache.set(key, name)
        entry.resolve(name)
      })
    } catch {
      for (const [, entry] of entries) {
        entry.resolve("")
      }
    } finally {
      for (const [key] of entries) {
        inFlight.delete(key)
      }
    }
  })()
}

function resolvePeerName(
  key: string,
  peerId: Api.TypePeer,
  client: TelegramClient,
): Promise<string> {
  const existing = inFlight.get(key)
  if (existing) {
    return existing
  }
  const promise = new Promise<string>((resolve) => {
    if (!pendingBatch) {
      pendingBatch = new Map()
      pendingClient = client
      queueMicrotask(flushBatch)
    }
    pendingBatch.set(key, { peerId, resolve })
  })
  inFlight.set(key, promise)
  return promise
}

/** For tests only — clears the module-level cache between test cases. */
export function _clearCacheForTest(): void {
  nameCache.clear()
  inFlight.clear()
  pendingBatch = null
  pendingClient = null
}

/**
 * Resolves the display name for a Telegram peer.
 *
 * - Returns `""` immediately when `peerId` is undefined or `client` is null.
 * - Hits the module-level cache synchronously on first render to avoid flash.
 * - Cache misses join a microtask-batched `client.getEntity([...])` call (see
 *   {@link resolvePeerName}) shared with every other peer requested in the same tick.
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
        const resolved = await resolvePeerName(key, peerId!, client)
        if (cancelled) return
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
