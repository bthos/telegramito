import { useEffect, useState } from "react"
import { Buffer } from "buffer"
import type { TelegramClient } from "telegram"
import { downloadProfilePhoto } from "telegram/client/downloads"
import { peerKeyToEntityLike } from "../telegram/peerKeyToEntityLike"

const urlCache = new Map<string, string | null>()
const inFlight = new Map<string, Promise<string | null>>()

let unloadHookRegistered = false

function revokeAllCachedUrls(): void {
  for (const url of urlCache.values()) {
    if (url) URL.revokeObjectURL(url)
  }
  urlCache.clear()
  inFlight.clear()
}

function registerRevokeOnUnload(): void {
  if (typeof window === "undefined" || unloadHookRegistered) return
  unloadHookRegistered = true
  window.addEventListener("beforeunload", revokeAllCachedUrls)
}

/** Tests — clears caches and revokes blob URLs. */
export function _clearPeerPhotoCachesForTest(): void {
  revokeAllCachedUrls()
  unloadHookRegistered = false
}

async function fetchPeerPhotoUrl(
  peerId: string,
  client: TelegramClient,
): Promise<string | null> {
  const entityLike = peerKeyToEntityLike(peerId)
  if (entityLike == null) {
    urlCache.set(peerId, null)
    return null
  }
  try {
    const buf = await downloadProfilePhoto(client, entityLike, {})
    if (buf == null) {
      urlCache.set(peerId, null)
      return null
    }
    if (typeof buf === "string") {
      urlCache.set(peerId, null)
      return null
    }
    const raw = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as Uint8Array)
    if (raw.length === 0) {
      urlCache.set(peerId, null)
      return null
    }
    const blob = new Blob([new Uint8Array(raw)], { type: "image/jpeg" })
    const url = URL.createObjectURL(blob)
    urlCache.set(peerId, url)
    registerRevokeOnUnload()
    return url
  } catch {
    urlCache.set(peerId, null)
    return null
  }
}

function loadPhoto(peerId: string, client: TelegramClient): Promise<string | null> {
  const existing = inFlight.get(peerId)
  if (existing) return existing

  const p = fetchPeerPhotoUrl(peerId, client).finally(() => {
    inFlight.delete(peerId)
  })
  inFlight.set(peerId, p)
  return p
}

/**
 * Returns an object URL for the peer's profile photo, or `null` while loading / on failure / no photo.
 * Results are cached per `peerId` for the browser session; failures cache as `null`.
 */
export function usePeerPhoto(
  peerId: string | null,
  client: TelegramClient | null | undefined,
): string | null {
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (!peerId || !client) return null
    if (urlCache.has(peerId)) return urlCache.get(peerId) ?? null
    return null
  })

  useEffect(() => {
    if (!peerId || !client) {
      setPhotoUrl(null)
      return
    }

    if (urlCache.has(peerId)) {
      setPhotoUrl(urlCache.get(peerId) ?? null)
      return
    }

    let cancelled = false
    void loadPhoto(peerId, client).then((url) => {
      if (cancelled) return
      setPhotoUrl(url)
    })

    return () => {
      cancelled = true
    }
  }, [peerId, client])

  return photoUrl
}
