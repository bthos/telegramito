import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  formatDocumentSize,
  getDocumentFileName,
  safeFileDownloadName,
} from "../telegram/documentFile"
import {
  isAnimatedDoc,
  isCustomEmojiDoc,
  isStickerDoc,
  isTgsShapedDoc,
  isVideoDoc,
} from "../telegram/documentMediaKind"
import { MessagePollView } from "./MessagePollView"
import { makeBlobUrl } from "./messageMediaBlobUtils"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"
import { PollReadonly, useWpPreview, WebPageView } from "./messageMediaPollWeb"

type MediaBlobState =
  | { k: "i"; u: string }
  | { k: "v"; u: string; loop: boolean }
  | { k: "au"; u: string; voice: boolean }
  | { k: "at"; u: string; name: string; sizeStr: string }
  | { k: "z" } /* no preview */
  | { k: "d" } /* load */
  | { k: "e" } /* err */
  | { k: "f" } /* filter */

function useBlob(
  m: Api.Message,
  c: TelegramClient | null,
  filterGifs: boolean
) {
  const [s, setS] = useState<MediaBlobState>({ k: "d" })
  const uref = useRef<string | null>(null)
  const media = m.media
  const d = m.document && m.document.className === "Document" ? (m.document as Api.Document) : null

  useEffect(() => {
    if (uref.current) {
      URL.revokeObjectURL(uref.current)
      uref.current = null
    }
    if (!c) {
      setS({ k: "z" })
      return
    }
    if (!media || media.className === "MessageMediaEmpty" || media.className === "MessageMediaPoll" || media.className === "MessageMediaWebPage") {
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
    setS({ k: "d" })
    let on = true
    void (async () => {
      const img = (buf: unknown, mt: string) => {
        const u = makeBlobUrl(buf, mt)
        if (on) {
          uref.current = u
          setS({ k: "i", u })
        } else {
          URL.revokeObjectURL(u)
        }
      }
      const vid = (buf: unknown, mt: string, loop: boolean) => {
        const u = makeBlobUrl(buf, mt)
        if (on) {
          uref.current = u
          setS({ k: "v", u, loop })
        } else {
          URL.revokeObjectURL(u)
        }
      }
      try {
        if (d) {
          if (isTgsShapedDoc(d) && isStickerDoc(d)) {
            const b0 = await c.downloadMedia(m, { thumb: 0 } as { thumb: number })
            const b = b0 ?? (await c.downloadMedia(m, {}))
            if (on) {
              if (b) {
                img(b, "image/webp")
              } else {
                setS({ k: "z" })
              }
            }
            return
          }
          if (isCustomEmojiDoc(d) || (isStickerDoc(d) && !isTgsShapedDoc(d))) {
            const b2 = await c.downloadMedia(m, {})
            if (on) {
              if (b2) {
                img(b2, d.mimeType || "image/webp")
              } else {
                setS({ k: "z" })
              }
            }
            return
          }
          if (isAnimatedDoc(d) && d.mimeType?.startsWith("image/")) {
            const b2 = await c.downloadMedia(m, {})
            if (on) {
              if (b2) {
                img(b2, d.mimeType || "image/webp")
              } else {
                setS({ k: "e" })
              }
            }
            return
          }
          if (isAnimatedDoc(d) && d.mimeType?.includes("video")) {
            const b2 = await c.downloadMedia(m, {})
            if (on) {
              if (b2) {
                vid(b2, d.mimeType || "video/mp4", true)
              } else {
                setS({ k: "e" })
              }
            }
            return
          }
          if (isVideoDoc(d) && d.mimeType?.startsWith("video/")) {
            const b2 = await c.downloadMedia(m, {})
            if (on) {
              if (b2) {
                vid(b2, d.mimeType || "video/mp4", false)
              } else {
                setS({ k: "e" })
              }
            }
            return
          }
          if (d.mimeType?.startsWith("image/")) {
            const b2 = await c.downloadMedia(m, {})
            if (on) {
              if (b2) {
                img(b2, d.mimeType)
              } else {
                setS({ k: "e" })
              }
            }
            return
          }
          {
            const audioA = d.attributes?.find(
              (x) => x.className === "DocumentAttributeAudio"
            ) as Api.DocumentAttributeAudio | undefined
            if (audioA) {
              const b2 = await c.downloadMedia(m, {})
              if (on) {
                if (b2) {
                  const mt =
                    d.mimeType
                    || (audioA.voice
                      ? "audio/ogg"
                      : "audio/mpeg")
                  const u = makeBlobUrl(b2, mt)
                  uref.current = u
                  setS({ k: "au", u, voice: Boolean(audioA.voice) })
                } else {
                  setS({ k: "e" })
                }
              }
              return
            }
          }
          {
            const b2 = await c.downloadMedia(m, {})
            if (on) {
              if (b2) {
                const mt = d.mimeType || "application/octet-stream"
                const u = makeBlobUrl(b2, mt)
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
        }
        if (media.className === "MessageMediaPhoto") {
          const b2 = await c.downloadMedia(m, {})
          if (on) {
            if (b2) {
              img(b2, "image/jpeg")
            } else {
              setS({ k: "e" })
            }
          }
          return
        }
        if (on) {
          setS({ k: "z" })
        }
      } catch {
        if (on) {
          setS({ k: "e" })
        }
      }
    })()
    return () => {
      on = false
      if (uref.current) {
        URL.revokeObjectURL(uref.current)
        uref.current = null
      }
    }
  }, [c, filterGifs, media, d, m.id, m])
  return s
}

export function MessageMediaView({
  message, client, noPreview, filterGifs, t, pollVoter,
}: {
  message: Api.Message
  client: TelegramClient | null
  noPreview: boolean
  filterGifs: boolean
  t: MessageMediaTranslateFn
  pollVoter?: { entity: unknown; onVoted: () => void }
}) {
  const { t: te } = useTranslation()
  const wpT = useWpPreview(message, client, noPreview)
  const s = useBlob(message, client, filterGifs)
  const errLabel = te("error")
  if (message.media?.className === "MessageMediaPoll") {
    const pol = message.media as Api.MessageMediaPoll
    if (client && pollVoter) {
      return (
        <MessagePollView
          media={pol}
          t={t}
          client={client}
          messageId={message.id!}
          entity={pollVoter.entity}
          onVoted={pollVoter.onVoted}
        />
      )
    }
    return <PollReadonly media={pol} t={t} client={client} />
  }
  if (message.media?.className === "MessageMediaWebPage" && !noPreview) {
    return <WebPageView m={message} no={noPreview} t={t} thumb={wpT} />
  }
  if (s.k === "f") {
    return <div className="msg-media msg-media--filtered" role="status">{t("chat.filteredGif")}</div>
  }
  if (s.k === "d" || s.k === "e") {
    if (s.k === "e") {
      return <div className="msg-media msg-media--err" role="status" aria-label={errLabel} />
    }
  }
  if (s.k === "i") {
    return <div className="msg-media msg-media--photo"><img className="msg-img" src={s.u} alt="" /></div>
  }
  if (s.k === "v") {
    return (
      <div className="msg-media msg-media--video">
        <video
          className="msg-video"
          src={s.u}
          controls
          loop={s.loop}
          autoPlay={s.loop}
          muted
          playsInline
        />
      </div>
    )
  }
  if (s.k === "au") {
    return (
      <div
        className={
          s.voice
            ? "msg-media msg-media--audio msg-media--voice"
            : "msg-media msg-media--audio"
        }
      >
        <audio
          className="msg-audio"
          src={s.u}
          controls
          preload="metadata"
          aria-label={s.voice ? te("chat.previewVoice") : te("chat.previewAudio")}
        />
      </div>
    )
  }
  if (s.k === "at") {
    const dName = safeFileDownloadName(s.name)
    const aLabel = [s.name, s.sizeStr].filter(Boolean).join(" — ")
    return (
      <a
        className="msg-attachment"
        href={s.u}
        download={dName}
        target="_blank"
        rel="noopener noreferrer"
        title={te("chat.fileSaveHint")}
        aria-label={aLabel || dName}
      >
        <span className="msg-attachment__icon" aria-hidden />
        <span className="msg-attachment__body">
          <span className="msg-attachment__name">{s.name}</span>
          {s.sizeStr ? (
            <span className="msg-attachment__size">{s.sizeStr}</span>
          ) : null}
        </span>
      </a>
    )
  }
  return null
}
