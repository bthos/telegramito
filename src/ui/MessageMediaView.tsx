import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { getMessageDocument, getDocumentFileName, formatDocumentSize, safeFileDownloadName } from "../telegram/documentFile"
import {
  isAnimatedDoc,
  isCustomEmojiDoc,
  isStickerDoc,
  isTgsShapedDoc,
  isVideoDoc,
} from "../telegram/documentMediaKind"
import { getMessageMediaPollFromMessage } from "../telegram/messagePollMedia"
import { MessagePollView } from "./MessagePollView"
import { makeBlobUrl } from "./messageMediaBlobUtils"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"
import { PollReadonly, useWpPreview, WebPageView } from "./messageMediaPollWeb"
import {
  isNonBlobVisualMedia,
  listPaidBundleSlots,
  resolveMessageMediaForDisplay,
  shouldRenderPaidBundleBlock,
} from "../telegram/messageMediaUnwrap"
import { MessageMediaStatic } from "./MessageMediaStatic"
import { ImageLightbox } from "./ImageLightbox"
import { MediaPlaceholder, resolveMediaPlaceholderType } from "./MediaPlaceholder"
import { TgProgressIndeterminate } from "./TgProgressIndeterminate"

function messageWithReplacedMedia(
  base: Api.Message,
  media: Api.TypeMessageMedia,
): Api.Message {
  return Object.assign(
    Object.create(Object.getPrototypeOf(base)),
    base,
    { media },
  ) as Api.Message
}

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
  const d = getMessageDocument(m)

  useEffect(() => {
    if (uref.current) {
      URL.revokeObjectURL(uref.current)
      uref.current = null
    }
    if (!c) {
      setS({ k: "z" })
      return
    }
    if (
      !media
      || media.className === "MessageMediaEmpty"
      || media.className === "MessageMediaWebPage"
      || getMessageMediaPollFromMessage(m)
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
          {
            const mtLower = d.mimeType?.toLowerCase() ?? ""
            const hasVideoMime = mtLower.startsWith("video/")
            /** TL often omits or mislabels mime; trust DocumentAttributeVideo or a video/* mime. */
            if (isVideoDoc(d) || (hasVideoMime && !isAnimatedDoc(d))) {
              const b2 = await c.downloadMedia(m, {})
              if (on) {
                if (b2) {
                  const mt = hasVideoMime ? (d.mimeType || "video/mp4") : "video/mp4"
                  vid(b2, mt, false)
                } else {
                  setS({ k: "e" })
                }
              }
              return
            }
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
  }, [c, filterGifs, media, d, m])
  return s
}

function PaidBundlePreviewRow({
  preview,
  te,
}: {
  preview: Api.MessageExtendedMediaPreview
  te: (key: string, options?: Record<string, string | number | undefined>) => string
}) {
  const w = preview.w
  const h = preview.h
  const dur = preview.videoDuration
  const hasAspect = typeof w === "number" && typeof h === "number" && w > 0 && h > 0
  return (
    <div
      className="msg-paid-slot msg-paid-slot--preview placeholder--shimmer"
      role="status"
      aria-busy="true"
      aria-label={te("chat.paidBundleLockedPreviewAria")}
      data-has-ar={hasAspect ? "1" : undefined}
      style={
        hasAspect
          ? ({ "--msg-paid-ar": `${w} / ${h}` } as CSSProperties)
          : undefined
      }
    >
      <span className="msg-media-card__muted">
        {te("chat.paidBundleLockedPreview", {
          w: w != null ? String(w) : "—",
          h: h != null ? String(h) : "—",
        })}
      </span>
      {dur != null && dur > 0 ? (
        <span className="msg-media-card__muted">
          {te("chat.paidBundleVideoDuration", { s: String(dur) })}
        </span>
      ) : null}
    </div>
  )
}

function mediaLoadingIsCompact(type: ReturnType<typeof resolveMediaPlaceholderType>): boolean {
  return type === "audio" || type === "voice"
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
  const paidBundleSlots = useMemo(() => {
    if (message.media?.className !== "MessageMediaPaidMedia") {
      return null
    }
    return listPaidBundleSlots(message.media as Api.MessageMediaPaidMedia)
  }, [message])

  const renderPaidAsBundle = Boolean(
    paidBundleSlots && shouldRenderPaidBundleBlock(paidBundleSlots),
  )

  const resolved = useMemo(() => {
    if (
      paidBundleSlots != null
      && paidBundleSlots.length === 1
      && paidBundleSlots[0].kind === "full"
      && !renderPaidAsBundle
    ) {
      return { ...message, media: paidBundleSlots[0].media } as Api.Message
    }
    return resolveMessageMediaForDisplay(message)
  }, [message, paidBundleSlots, renderPaidAsBundle])

  const blobSourceMessage = useMemo(() => {
    if (renderPaidAsBundle) {
      return {
        ...message,
        media: { className: "MessageMediaEmpty" } as Api.MessageMediaEmpty,
      } as Api.Message
    }
    if (
      paidBundleSlots != null
      && paidBundleSlots.length === 1
      && paidBundleSlots[0].kind === "full"
    ) {
      return { ...message, media: paidBundleSlots[0].media } as Api.Message
    }
    return resolveMessageMediaForDisplay(message)
  }, [message, paidBundleSlots, renderPaidAsBundle])

  const wpT = useWpPreview(resolved, client, noPreview)
  const s = useBlob(blobSourceMessage, client, filterGifs)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const errLabel = te("error")

  const imagePreviewUrl = s.k === "i" ? s.u : null
  useEffect(() => {
    setLightboxOpen(false)
  }, [message.id, imagePreviewUrl])

  if (renderPaidAsBundle && paidBundleSlots) {
    return (
      <div
        className="msg-paid-bundle"
        role="group"
        aria-label={te("chat.paidBundleGroupAria")}
      >
        {paidBundleSlots.map((slot, i) =>
          slot.kind === "preview"
            ? (
                <PaidBundlePreviewRow key={i} preview={slot.preview} te={te} />
              )
            : (
                <MessageMediaView
                  key={i}
                  message={
                    Object.assign(
                      Object.create(Object.getPrototypeOf(message)),
                      message,
                      { media: slot.media },
                    ) as Api.Message
                  }
                  client={client}
                  noPreview={noPreview}
                  filterGifs={filterGifs}
                  t={t}
                  pollVoter={pollVoter}
                />
              ),
        )}
      </div>
    )
  }

  const pollMedia = getMessageMediaPollFromMessage(resolved)
  if (pollMedia) {
    const attached = pollMedia.attachedMedia
    const attachedBlock = attached != null
      ? (
          <div
            className="msg-poll-attached"
            role="group"
            aria-label={te("chat.pollAttachedMediaAria")}
          >
            <MessageMediaView
              message={messageWithReplacedMedia(message, attached)}
              client={client}
              noPreview={noPreview}
              filterGifs={filterGifs}
              t={t}
              pollVoter={pollVoter}
            />
          </div>
        )
      : null
    if (client && pollVoter) {
      return (
        <>
          <MessagePollView
            media={pollMedia}
            t={t}
            client={client}
            messageId={message.id!}
            entity={pollVoter.entity}
            onVoted={pollVoter.onVoted}
          />
          {attachedBlock}
        </>
      )
    }
    return (
      <>
        <PollReadonly media={pollMedia} t={t} client={client} />
        {attachedBlock}
      </>
    )
  }
  if (resolved.media?.className === "MessageMediaWebPage" && !noPreview) {
    return <WebPageView m={resolved} no={noPreview} t={t} thumb={wpT} />
  }
  if (isNonBlobVisualMedia(resolved.media)) {
    return <MessageMediaStatic m={resolved} t={t} />
  }
  if (s.k === "f") {
    return <div className="msg-media msg-media--filtered" role="status">{t("chat.filteredGif")}</div>
  }
  if (s.k === "d") {
    const placeholderType = resolveMediaPlaceholderType(resolved, getMessageDocument(resolved))
    const compact = mediaLoadingIsCompact(placeholderType)
    return (
      <div
        className={
          compact
            ? "msg-media msg-media--loading ds-media-loading ds-media-loading--compact"
            : "msg-media msg-media--loading ds-media-loading"
        }
      >
        <MediaPlaceholder type={placeholderType} shimmer />
        <TgProgressIndeterminate />
      </div>
    )
  }
  if (s.k === "e") {
    return <div className="msg-media msg-media--err" role="status" aria-label={errLabel} />
  }
  if (s.k === "i") {
    return (
      <div className="msg-media msg-media--photo">
        <button
          type="button"
          className="msg-img-link"
          title={te("chat.openPhoto")}
          aria-label={te("chat.openPhoto")}
          onClick={() => {
            setLightboxOpen(true)
          }}
        >
          <img className="msg-img" src={s.u} alt="" draggable={false} />
        </button>
        {lightboxOpen ? (
          <ImageLightbox
            url={s.u}
            onClose={() => {
              setLightboxOpen(false)
            }}
            labelClose={te("chat.imageViewerClose")}
            labelBackdrop={te("chat.imageViewerBackdrop")}
          />
        ) : null}
      </div>
    )
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
