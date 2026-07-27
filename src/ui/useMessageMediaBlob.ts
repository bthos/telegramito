import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useCallback, useEffect, useRef, useState } from "react"
import { getMessageDocument, getDocumentFileName, formatDocumentSize } from "../telegram/documentFile"
import {
  isAnimatedDoc,
  isCustomEmojiDoc,
  isStickerDoc,
  isTgsShapedDoc,
  isVideoDoc,
} from "../telegram/documentMediaKind"
import { getMessageMediaPollFromMessage } from "../telegram/messagePollMedia"
import { makeBlobUrl } from "./messageMediaBlobUtils"
import { mediaNeedsBlobFetch } from "./messageMediaBlobGate"
import { peerKeyFromPeer } from "../telegram/peerKey"

export type MediaBlobState =
  | { k: "i"; u: string }
  | { k: "v"; u: string; loop: boolean }
  | { k: "au"; u: string; voice: boolean }
  | { k: "at"; u: string; name: string; sizeStr: string }
  | { k: "z" }
  | { k: "w" }
  | { k: "d" }
  | { k: "e" }
  | { k: "f" }

export function useMessageMediaBlob(
  m: Api.Message,
  c: TelegramClient | null,
  filterGifs: boolean,
): [MediaBlobState, () => void, () => void] {
  const loadRequestedRef = useRef(false)
  const fetchGenRef = useRef(0)
  const [loadNonce, setLoadNonce] = useState(0)
  const [s, setS] = useState<MediaBlobState>({ k: "w" })
  const uref = useRef<string | null>(null)
  const messageRef = useRef(m)
  const boundSigRef = useRef<string>("")

  useEffect(() => {
    messageRef.current = m
  }, [m])

  const dTop = getMessageDocument(m)
  const docIdKey = dTop?.id != null ? String(dTop.id) : ""
  const mediaCn = m.media?.className ?? ""
  const peerKeyStr = peerKeyFromPeer(m.peerId)

  const requestLoad = useCallback(() => {
    loadRequestedRef.current = true
    setLoadNonce((n) => n + 1)
  }, [])

  const cancelLoad = useCallback(() => {
    fetchGenRef.current += 1
    loadRequestedRef.current = false
    setS({ k: "w" })
  }, [])

  useEffect(() => {
    if (uref.current) {
      URL.revokeObjectURL(uref.current)
      uref.current = null
    }
    let on = true

    const msg = messageRef.current
    const mid = msg.id ?? -1
    const sig = `${peerKeyFromPeer(msg.peerId)}:${mid}`
    if (boundSigRef.current !== sig) {
      boundSigRef.current = sig
      loadRequestedRef.current = false
      fetchGenRef.current += 1
    }

    queueMicrotask(() => {
      if (!on) return
      const m0 = messageRef.current
      const media = m0.media
      const d = getMessageDocument(m0)

      if (!c) {
        setS({ k: "z" })
        return
      }
      if (
        !media
        || media.className === "MessageMediaEmpty"
        || media.className === "MessageMediaWebPage"
        || getMessageMediaPollFromMessage(m0)
      ) {
        setS({ k: "z" })
        return
      }
      if (d) {
        if (isAnimatedDoc(d) && filterGifs) {
          setS({ k: "f" })
          return
        }
        if (d.mimeType?.toLowerCase().includes("gif") && filterGifs) {
          setS({ k: "f" })
          return
        }
      }
      if (!mediaNeedsBlobFetch(media, d)) {
        setS({ k: "z" })
        return
      }
      if (!loadRequestedRef.current) {
        setS({ k: "w" })
        return
      }

      const gen = ++fetchGenRef.current
      const alive = () => on && gen === fetchGenRef.current

      setS({ k: "d" })
      void (async () => {
        const img = (buf: unknown, mt: string) => {
          const u = makeBlobUrl(buf, mt)
          if (!alive()) {
            URL.revokeObjectURL(u)
            return
          }
          uref.current = u
          setS({ k: "i", u })
        }
        const vid = (buf: unknown, mt: string, loop: boolean) => {
          const u = makeBlobUrl(buf, mt)
          if (!alive()) {
            URL.revokeObjectURL(u)
            return
          }
          uref.current = u
          setS({ k: "v", u, loop })
        }
        try {
          if (d) {
            if (isTgsShapedDoc(d) && isStickerDoc(d)) {
              const b0 = await c.downloadMedia(m0, { thumb: 0 } as { thumb: number })
              const b = b0 ?? (await c.downloadMedia(m0, {}))
              if (!alive()) return
              if (b) {
                img(b, "image/webp")
              } else {
                setS({ k: "z" })
              }
              return
            }
            if (isCustomEmojiDoc(d) || (isStickerDoc(d) && !isTgsShapedDoc(d))) {
              const b2 = await c.downloadMedia(m0, {})
              if (!alive()) return
              if (b2) {
                img(b2, d.mimeType || "image/webp")
              } else {
                setS({ k: "z" })
              }
              return
            }
            if (isAnimatedDoc(d) && d.mimeType?.startsWith("image/")) {
              const b2 = await c.downloadMedia(m0, {})
              if (!alive()) return
              if (b2) {
                img(b2, d.mimeType || "image/webp")
              } else {
                setS({ k: "e" })
              }
              return
            }
            if (isAnimatedDoc(d) && d.mimeType?.includes("video")) {
              const b2 = await c.downloadMedia(m0, {})
              if (!alive()) return
              if (b2) {
                vid(b2, d.mimeType || "video/mp4", true)
              } else {
                setS({ k: "e" })
              }
              return
            }
            {
              const mtLower = d.mimeType?.toLowerCase() ?? ""
              const hasVideoMime = mtLower.startsWith("video/")
              if (isVideoDoc(d) || (hasVideoMime && !isAnimatedDoc(d))) {
                const b2 = await c.downloadMedia(m0, {})
                if (!alive()) return
                if (b2) {
                  const mt = hasVideoMime ? (d.mimeType || "video/mp4") : "video/mp4"
                  vid(b2, mt, false)
                } else {
                  setS({ k: "e" })
                }
                return
              }
            }
            if (d.mimeType?.startsWith("image/")) {
              const b2 = await c.downloadMedia(m0, {})
              if (!alive()) return
              if (b2) {
                img(b2, d.mimeType)
              } else {
                setS({ k: "e" })
              }
              return
            }
            {
              const audioA = d.attributes?.find(
                (x) => x.className === "DocumentAttributeAudio",
              ) as Api.DocumentAttributeAudio | undefined
              if (audioA) {
                const b2 = await c.downloadMedia(m0, {})
                if (!alive()) return
                if (b2) {
                  const mt =
                    d.mimeType
                    || (audioA.voice
                      ? "audio/ogg"
                      : "audio/mpeg")
                  const u = makeBlobUrl(b2, mt)
                  if (!alive()) {
                    URL.revokeObjectURL(u)
                    return
                  }
                  uref.current = u
                  setS({ k: "au", u, voice: Boolean(audioA.voice) })
                } else {
                  setS({ k: "e" })
                }
                return
              }
            }
            {
              const b2 = await c.downloadMedia(m0, {})
              if (!alive()) return
              if (b2) {
                const mt = d.mimeType || "application/octet-stream"
                const u = makeBlobUrl(b2, mt)
                if (!alive()) {
                  URL.revokeObjectURL(u)
                  return
                }
                uref.current = u
                const n0 = getDocumentFileName(d) || "file"
                setS({
                  k: "at",
                  u,
                  name: n0,
                  sizeStr: formatDocumentSize(d.size),
                })
              } else {
                setS({ k: "e" })
              }
            }
            return
          }
          if (media.className === "MessageMediaPhoto") {
            const b2 = await c.downloadMedia(m0, {})
            if (!alive()) return
            if (b2) {
              img(b2, "image/jpeg")
            } else {
              setS({ k: "e" })
            }
            return
          }
          if (alive()) {
            setS({ k: "z" })
          }
        } catch {
          if (alive()) {
            setS({ k: "e" })
          }
        }
      })()
    })
    return () => {
      on = false
      fetchGenRef.current += 1
      if (uref.current) {
        URL.revokeObjectURL(uref.current)
        uref.current = null
      }
    }
  }, [c, filterGifs, m.id, loadNonce, mediaCn, docIdKey, peerKeyStr])
  return [s, requestLoad, cancelLoad]
}
