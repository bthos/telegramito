import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { getMessageDocument, getDocumentFileName, formatDocumentSize, documentExtensionLabel } from "../telegram/documentFile"
import { getMessageMediaTypeLabel } from "../telegram/dialogPreview"
import {
  isAnimatedDoc,
  isCustomEmojiDoc,
  isStickerDoc,
  isTgsShapedDoc,
  isRoundVideoDoc,
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
import { PhotoMediaViewer } from "./PhotoMediaViewer"
import { VideoFullViewer } from "./VideoFullViewer"
import { getVideoDurationSeconds, formatVideoDuration } from "../telegram/documentVideoMeta"
import { getAudioDurationSeconds } from "../telegram/documentAudioMeta"
import { MediaPlaceholder, resolveMediaPlaceholderType } from "./MediaPlaceholder"
import { TgProgressIndeterminate } from "./TgProgressIndeterminate"
import { VoiceMessageInline } from "./VoiceMessageInline"
import { AudioTrackInline } from "./AudioTrackInline"
import { DocumentAttachmentInline } from "./DocumentAttachmentInline"
import { StickerInline } from "./StickerInline"
import { peerKeyFromPeer } from "../telegram/peerKey"
import { useInlineThumb } from "./useInlineThumb"

import type { MediaViewerContext } from "./mediaViewerContext"

export type { MediaViewerContext } from "./mediaViewerContext"

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
  | { k: "w" } /* tap to fetch blob */
  | { k: "d" } /* load */
  | { k: "e" } /* err */
  | { k: "f" } /* filter */

/** True when {@link useBlob} would run a document/photo download (not the async fall-through → z path). */
function mediaNeedsBlobFetch(media: Api.TypeMessageMedia | undefined, d: Api.Document | null): boolean {
  if (!media) return false
  if (media.className === "MessageMediaPhoto") return true
  return media.className === "MessageMediaDocument" && d != null
}

function useBlob(
  m: Api.Message,
  c: TelegramClient | null,
  filterGifs: boolean,
): [MediaBlobState, () => void] {
  const loadRequestedRef = useRef(false)
  const fetchGenRef = useRef(0)
  const [loadNonce, setLoadNonce] = useState(0)
  const [s, setS] = useState<MediaBlobState>({ k: "w" })
  const uref = useRef<string | null>(null)
  const messageRef = useRef(m)
  messageRef.current = m
  const boundSigRef = useRef<string>("")

  const dTop = getMessageDocument(m)
  const docIdKey = dTop?.id != null ? String(dTop.id) : ""
  const mediaCn = m.media?.className ?? ""
  const peerKeyStr = peerKeyFromPeer(m.peerId)

  const requestLoad = useCallback(() => {
    loadRequestedRef.current = true
    setLoadNonce((n) => n + 1)
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
  return [s, requestLoad]
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
      data-media-state="loading"
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

function documentAttachmentLabels(
  resolved: Api.Message,
): { name: string; sizeStr: string; ext: string } | null {
  const d = getMessageDocument(resolved)
  if (!d) return null
  const name = getDocumentFileName(d) || "file"
  const sizeStr = formatDocumentSize(d.size)
  const ext = documentExtensionLabel(name)
  return { name, sizeStr, ext }
}

function DocumentAttachmentDeferredRow({
  name,
  sizeStr,
  ext,
  onActivate,
  ariaLabel,
}: {
  name: string
  sizeStr: string
  ext: string
  onActivate: () => void
  ariaLabel: string
}) {
  return (
    <div className="msg-doc-row msg-doc-row--deferred" data-media-state="preview">
      <button
        type="button"
        className="msg-doc-row__main"
        onClick={(e) => {
          e.stopPropagation()
          onActivate()
        }}
        aria-label={ariaLabel}
      >
        <span
          className={`msg-doc-row__icon ${ext === "PDF" ? "msg-doc-row__icon--pdf" : ""}`}
          aria-hidden
        >
          {ext}
        </span>
        <span className="msg-doc-row__body">
          <span className="msg-doc-row__title">{name}</span>
          {sizeStr ? <span className="msg-doc-row__sub">{sizeStr}</span> : null}
        </span>
      </button>
    </div>
  )
}

function DocumentAttachmentLoadingRow({
  name,
  sizeStr,
  hint,
  timeLabel,
}: {
  name: string
  sizeStr: string
  hint: string
  timeLabel: string | null
}) {
  return (
    <div className="msg-media msg-media--doc-fetch" data-media-state="loading">
      <div className="msg-doc-row msg-doc-row--loading">
        <div className="msg-doc-row__loading-inner">
          <div className="msg-doc-row__icon msg-doc-row__icon--busy">
            <TgProgressIndeterminate />
          </div>
          <div className="msg-doc-row__body">
            <div className="msg-doc-row__title">{name}</div>
            {sizeStr ? <div className="msg-doc-row__sub">{sizeStr}</div> : null}
          </div>
        </div>
      </div>
      <div className="media-loading-foot" role="status">
        <span className="media-loading-foot__hint">{hint}</span>
        {timeLabel ? (
          <span className="media-loading-foot__time">{timeLabel}</span>
        ) : (
          <span className="media-loading-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

/** Tap-to-load photo — `.artefacts/ux-analysis/preview/photo.html` (preview). */
function PhotoDeferredPending({
  onActivate,
  tapLabel,
  footHint,
  sentAtLabel,
  thumbDataUrl,
}: {
  onActivate: () => void
  tapLabel: string
  footHint: string
  sentAtLabel: string | null
  thumbDataUrl?: string
}) {
  return (
    <div className="msg-photo-deferred" data-media-state="preview">
      <button
        type="button"
        className="msg-photo-deferred__hit"
        aria-label={tapLabel}
        onClick={(e) => {
          e.stopPropagation()
          onActivate()
        }}
      >
        <div className="msg-photo-deferred__canvas" aria-hidden>
          {thumbDataUrl ? (
            <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
          ) : null}
          <span className="msg-photo-deferred__sun" />
          <span className="msg-photo-deferred__horizon" />
          <span className="msg-photo-deferred__ridge" />
        </div>
      </button>
      <div className="media-pending-foot" role="status">
        <span className="media-pending-foot__hint">{footHint}</span>
        {sentAtLabel ? (
          <span className="media-pending-foot__time">{sentAtLabel}</span>
        ) : (
          <span className="media-pending-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

/** Photo download in progress — same mock (loading / uploading row). */
function PhotoDeferredLoading({
  hint,
  timeLabel,
  thumbDataUrl,
}: {
  hint: string
  timeLabel: string | null
  thumbDataUrl?: string
}) {
  return (
    <div className="msg-media msg-media--photo-fetch" data-media-state="loading">
      <div className="msg-photo-deferred__canvas msg-photo-deferred__canvas--busy" aria-hidden>
        {thumbDataUrl ? (
          <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
        ) : null}
        <span className="msg-photo-deferred__sun" />
        <span className="msg-photo-deferred__horizon" />
        <span className="msg-photo-deferred__ridge" />
        <div className="msg-photo-deferred__progress">
          <TgProgressIndeterminate />
        </div>
      </div>
      <div className="media-loading-foot" role="status">
        <span className="media-loading-foot__hint">{hint}</span>
        {timeLabel ? (
          <span className="media-loading-foot__time">{timeLabel}</span>
        ) : (
          <span className="media-loading-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

/** Tap-to-load animated GIF / animated image — `.artefacts/ux-analysis/preview/gif.html`. */
function GifDeferredPending({
  onActivate,
  tapLabel,
  footHint,
  sentAtLabel,
  thumbDataUrl,
}: {
  onActivate: () => void
  tapLabel: string
  footHint: string
  sentAtLabel: string | null
  thumbDataUrl?: string
}) {
  return (
    <div className="msg-gif-deferred" data-media-state="preview">
      <button
        type="button"
        className="msg-gif-deferred__hit"
        aria-label={tapLabel}
        onClick={(e) => {
          e.stopPropagation()
          onActivate()
        }}
      >
        <div className="msg-gif-deferred__canvas" aria-hidden>
          {thumbDataUrl ? (
            <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
          ) : null}
          <span className="msg-gif-deferred__splash" />
          <span className="msg-gif-deferred__streaks" />
          <span className="msg-gif-deferred__tag">GIF</span>
        </div>
      </button>
      <div className="media-pending-foot" role="status">
        <span className="media-pending-foot__hint">{footHint}</span>
        {sentAtLabel ? (
          <span className="media-pending-foot__time">{sentAtLabel}</span>
        ) : (
          <span className="media-pending-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

function GifDeferredLoading({
  hint,
  timeLabel,
  thumbDataUrl,
}: {
  hint: string
  timeLabel: string | null
  thumbDataUrl?: string
}) {
  return (
    <div className="msg-media msg-media--gif-fetch" data-media-state="loading">
      <div className="msg-gif-deferred__canvas msg-gif-deferred__canvas--busy" aria-hidden>
        {thumbDataUrl ? (
          <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
        ) : null}
        <span className="msg-gif-deferred__splash" />
        <span className="msg-gif-deferred__streaks" />
        <span className="msg-gif-deferred__tag">GIF</span>
        <div className="msg-gif-deferred__progress">
          <TgProgressIndeterminate />
        </div>
      </div>
      <div className="media-loading-foot" role="status">
        <span className="media-loading-foot__hint">{hint}</span>
        {timeLabel ? (
          <span className="media-loading-foot__time">{timeLabel}</span>
        ) : (
          <span className="media-loading-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

/** Tap-to-load / fetching video chrome — aligns with `.artefacts/ux-analysis/preview/video.html`. */
function VideoDeferredPending({
  resolved,
  onActivate,
  tapLabel,
  footHint,
  sentAtLabel,
  thumbDataUrl,
}: {
  resolved: Api.Message
  onActivate: () => void
  tapLabel: string
  footHint: string
  sentAtLabel: string | null
  thumbDataUrl?: string
}) {
  const d = getMessageDocument(resolved)
  const round = d ? isRoundVideoDoc(d) : false
  const durSec = getVideoDurationSeconds(d)
  const durationLabel = durSec != null ? formatVideoDuration(durSec) : null
  const frameClass = round
    ? "msg-video-deferred__frame msg-video-deferred__frame--round"
    : "msg-video-deferred__frame"
  return (
    <div
      className={
        round ? "msg-video-deferred msg-video-deferred--round" : "msg-video-deferred"
      }
      data-media-state="preview"
    >
      <button
        type="button"
        className="msg-video-deferred__hit"
        aria-label={tapLabel}
        onClick={(e) => {
          e.stopPropagation()
          onActivate()
        }}
      >
        <div className={frameClass}>
          {thumbDataUrl ? (
            <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
          ) : null}
          {durationLabel ? (
            <span
              className={
                round
                  ? "msg-video-thumb__duration msg-video-thumb__duration--round"
                  : "msg-video-thumb__duration"
              }
            >
              {round ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff" aria-hidden>
                  <path d="M2 4v2h2l3 2V2L4 4z" />
                  <path d="M8 3a3 3 0 010 4" stroke="#fff" strokeWidth="1" fill="none" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff" aria-hidden>
                  <path d="M2 1l7 4-7 4z" />
                </svg>
              )}
              {durationLabel}
            </span>
          ) : null}
          {!round ? (
            <span className="msg-video-thumb-play-fab" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="#fff">
                <path d="M5 3l13 7-13 7z" />
              </svg>
            </span>
          ) : null}
        </div>
      </button>
      <div className="media-pending-foot" role="status">
        <span className="media-pending-foot__hint">{footHint}</span>
        {sentAtLabel ? (
          <span className="media-pending-foot__time">{sentAtLabel}</span>
        ) : (
          <span className="media-pending-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

function VideoDeferredLoading({
  hint,
  timeLabel,
  round = false,
  thumbDataUrl,
}: {
  hint: string
  timeLabel: string | null
  round?: boolean
  thumbDataUrl?: string
}) {
  const frameClass = round
    ? "msg-video-deferred__frame msg-video-deferred__frame--busy msg-video-deferred__frame--round"
    : "msg-video-deferred__frame msg-video-deferred__frame--busy"
  return (
    <div
      className={
        round ? "msg-media msg-media--video-fetch msg-media--video-fetch--round" : "msg-media msg-media--video-fetch"
      }
      data-media-state="loading"
    >
      <div className={frameClass}>
        {thumbDataUrl ? (
          <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
        ) : null}
        <TgProgressIndeterminate />
      </div>
      <div className="media-loading-foot" role="status">
        <span className="media-loading-foot__hint">{hint}</span>
        {timeLabel ? (
          <span className="media-loading-foot__time">{timeLabel}</span>
        ) : (
          <span className="media-loading-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

function mediaLoadingIsCompact(type: ReturnType<typeof resolveMediaPlaceholderType>): boolean {
  return type === "audio" || type === "voice"
}

function VideoInlinePlayer({
  src,
  loop,
  autoPlay,
  muted,
  playLabel,
  round,
  durationLabel,
  expandLabel,
  onExpand,
  showGifTag,
}: {
  src: string
  loop: boolean
  autoPlay: boolean
  muted: boolean
  playLabel: string
  round?: boolean
  durationLabel?: string | null
  expandLabel: string
  onExpand: () => void
  /** GIF badge (animated video). */
  showGifTag?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(autoPlay)
  const wrapClass = round ? "msg-video-wrap msg-video-wrap--round" : "msg-video-wrap"
  const showRectChrome = Boolean(durationLabel && !showGifTag)
  return (
    <div
      className={wrapClass}
      data-media-state="preview"
      onDoubleClick={(e) => {
        if (round && !showGifTag) {
          e.stopPropagation()
          onExpand()
        }
      }}
    >
      <video
        ref={ref}
        className={round ? "msg-video msg-video--round" : "msg-video"}
        src={src}
        loop={loop}
        muted={muted}
        playsInline
        autoPlay={autoPlay}
        controls={autoPlay ? false : started}
        onClick={(e) => {
          if (round && !autoPlay && !started) {
            e.stopPropagation()
            void ref.current?.play()
          }
        }}
        onPlay={() => {
          setStarted(true)
        }}
        onPause={() => {
          setStarted(false)
        }}
      />
      {showGifTag ? <span className="msg-gif-tag">GIF</span> : null}
      {showRectChrome ? (
        <span
          className={
            round ? "msg-video-thumb__duration msg-video-thumb__duration--round" : "msg-video-thumb__duration"
          }
        >
          {round ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff" aria-hidden>
              <path d="M2 4v2h2l3 2V2L4 4z" />
              <path d="M8 3a3 3 0 010 4" stroke="#fff" strokeWidth="1" fill="none" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff" aria-hidden>
              <path d="M2 1l7 4-7 4z" />
            </svg>
          )}
          {durationLabel}
        </span>
      ) : null}
      {!showGifTag && !round ? (
        <button
          type="button"
          className="msg-video-thumb__expand"
          aria-label={expandLabel}
          onClick={(e) => {
            e.stopPropagation()
            onExpand()
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
            />
          </svg>
        </button>
      ) : null}
      {!autoPlay && !started && !round ? (
        <button
          type="button"
          className="msg-video-play msg-video-thumb-play-fab"
          aria-label={playLabel}
          onClick={(e) => {
            e.stopPropagation()
            void ref.current?.play()
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            <path fill="#fff" d="M5 3l13 7-13 7z" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

export function MessageMediaView({
  message, client, noPreview, filterGifs, t, pollVoter, viewerContext,
}: {
  message: Api.Message
  client: TelegramClient | null
  noPreview: boolean
  filterGifs: boolean
  t: MessageMediaTranslateFn
  pollVoter?: { entity: unknown; onVoted: () => void }
  viewerContext?: MediaViewerContext | null
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

  const wpPreview = useWpPreview(resolved, client, noPreview)
  const [s, requestLoad] = useBlob(blobSourceMessage, client, filterGifs)
  const inlineThumb = useInlineThumb(blobSourceMessage.media)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [videoFullOpen, setVideoFullOpen] = useState(false)
  const errLabel = te("error")

  const imagePreviewUrl = s.k === "i" ? s.u : null
  const videoPreviewUrl = s.k === "v" ? s.u : null
  useEffect(() => {
    queueMicrotask(() => {
      setLightboxOpen(false)
      setVideoFullOpen(false)
    })
  }, [message.id, imagePreviewUrl, videoPreviewUrl])

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
                  viewerContext={viewerContext}
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
              viewerContext={viewerContext}
            />
          </div>
        )
      : null
    if (client && pollVoter) {
      return (
        <div className="msg-poll-with-media" data-media-state="preview">
          <MessagePollView
            media={pollMedia}
            t={t}
            client={client}
            messageId={message.id!}
            entity={pollVoter.entity}
            onVoted={pollVoter.onVoted}
          />
          {attachedBlock}
        </div>
      )
    }
    return (
      <div className="msg-poll-with-media" data-media-state="preview">
        <PollReadonly media={pollMedia} t={t} client={client} />
        {attachedBlock}
      </div>
    )
  }
  if (resolved.media?.className === "MessageMediaWebPage" && !noPreview) {
    return (
      <WebPageView
        m={resolved}
        no={noPreview}
        t={t}
        thumbUrl={wpPreview.thumbUrl}
        thumbPhase={wpPreview.thumbPhase}
        onThumbRequest={wpPreview.requestThumb}
        viewerContext={viewerContext}
      />
    )
  }
  if (isNonBlobVisualMedia(resolved.media)) {
    return <MessageMediaStatic m={resolved} t={t} />
  }
  if (s.k === "f") {
    return <div className="msg-media msg-media--filtered" role="status">{t("chat.filteredGif")}</div>
  }
  if (s.k === "w") {
    const placeholderType = resolveMediaPlaceholderType(resolved, getMessageDocument(resolved))
    const compact = mediaLoadingIsCompact(placeholderType)
    const tapLabel = te("chat.mediaTapToLoad")
    if (placeholderType === "attachment") {
      const docMeta = documentAttachmentLabels(resolved)
      if (docMeta) {
        return (
          <DocumentAttachmentDeferredRow
            name={docMeta.name}
            sizeStr={docMeta.sizeStr}
            ext={docMeta.ext}
            ariaLabel={tapLabel}
            onActivate={requestLoad}
          />
        )
      }
    }
    if (placeholderType === "video") {
      return (
        <VideoDeferredPending
          resolved={resolved}
          onActivate={requestLoad}
          tapLabel={tapLabel}
          footHint={te("chat.mediaTapToLoadHint")}
          sentAtLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
        />
      )
    }
    if (placeholderType === "gif") {
      return (
        <GifDeferredPending
          onActivate={requestLoad}
          tapLabel={tapLabel}
          footHint={te("chat.mediaTapToLoadHint")}
          sentAtLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
        />
      )
    }
    if (placeholderType === "photo") {
      return (
        <PhotoDeferredPending
          onActivate={requestLoad}
          tapLabel={tapLabel}
          footHint={te("chat.mediaTapToLoadHint")}
          sentAtLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
        />
      )
    }
    return (
      <div
        className={
          compact
            ? "msg-media msg-media--pending ds-media-pending ds-media-pending--compact"
            : "msg-media msg-media--pending ds-media-pending"
        }
        data-media-state="preview"
      >
        <button
          type="button"
          className="msg-media-pending-hit"
          aria-label={tapLabel}
          onClick={(e) => {
            e.stopPropagation()
            requestLoad()
          }}
        >
          <MediaPlaceholder type={placeholderType} shimmer={false} variant="pending" />
        </button>
        {!compact ? (
          <div className="media-pending-foot" role="status">
            <span className="media-pending-foot__hint">{te("chat.mediaTapToLoadHint")}</span>
            {viewerContext?.sentAtLabel ? (
              <span className="media-pending-foot__time">{viewerContext.sentAtLabel}</span>
            ) : (
              <span className="media-pending-foot__time" aria-hidden />
            )}
          </div>
        ) : null}
      </div>
    )
  }
  if (s.k === "d") {
    const placeholderType = resolveMediaPlaceholderType(resolved, getMessageDocument(resolved))
    const compact = mediaLoadingIsCompact(placeholderType)
    if (placeholderType === "attachment") {
      const docMeta = documentAttachmentLabels(resolved)
      if (docMeta) {
        return (
          <DocumentAttachmentLoadingRow
            name={docMeta.name}
            sizeStr={docMeta.sizeStr}
            hint={te("chat.mediaDownloadProgress")}
            timeLabel={viewerContext?.sentAtLabel ?? null}
          />
        )
      }
    }
    if (placeholderType === "video") {
      const dV = getMessageDocument(resolved)
      const roundV = dV ? isRoundVideoDoc(dV) : false
      return (
        <VideoDeferredLoading
          hint={te("chat.mediaDownloadProgress")}
          timeLabel={viewerContext?.sentAtLabel ?? null}
          round={roundV}
          thumbDataUrl={inlineThumb?.dataUrl}
        />
      )
    }
    if (placeholderType === "gif") {
      return (
        <GifDeferredLoading
          hint={te("chat.mediaDownloadProgress")}
          timeLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
        />
      )
    }
    if (placeholderType === "photo") {
      return (
        <PhotoDeferredLoading
          hint={te("chat.mediaDownloadProgress")}
          timeLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
        />
      )
    }
    return (
      <div
        className={
          compact
            ? "msg-media msg-media--loading ds-media-loading ds-media-loading--compact"
            : "msg-media msg-media--loading ds-media-loading"
        }
        data-media-state="loading"
      >
        <MediaPlaceholder type={placeholderType} shimmer />
        <TgProgressIndeterminate />
        {!compact ? (
          <div className="media-loading-foot" role="status">
            <span className="media-loading-foot__hint">{te("chat.mediaDownloadProgress")}</span>
            {viewerContext?.sentAtLabel ? (
              <span className="media-loading-foot__time">{viewerContext.sentAtLabel}</span>
            ) : (
              <span className="media-loading-foot__time" aria-hidden />
            )}
          </div>
        ) : null}
      </div>
    )
  }
  if (s.k === "e") {
    return <div className="msg-media msg-media--err" role="status" aria-label={errLabel} />
  }
  if (s.k === "i") {
    const d = getMessageDocument(resolved)
    if (d && isStickerDoc(d)) {
      return (
        <div className="msg-media msg-media--sticker" data-media-state="preview">
          <StickerInline url={s.u} doc={d} />
        </div>
      )
    }
    const peerTitle = viewerContext?.peerTitle ?? te("chat.mediaViewerPeerFallback")
    const sentAt = viewerContext?.sentAtLabel ?? ""
    const caption = viewerContext?.caption ?? ""
    return (
      <div className="msg-media msg-media--photo" data-media-state="preview">
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
          <PhotoMediaViewer
            url={s.u}
            onClose={() => {
              setLightboxOpen(false)
            }}
            labelClose={te("chat.imageViewerClose")}
            labelBackdrop={te("chat.imageViewerBackdrop")}
            peerTitle={peerTitle}
            sentAtLabel={sentAt}
            caption={caption}
          />
        ) : null}
      </div>
    )
  }
  if (s.k === "v") {
    const d = getMessageDocument(resolved)
    const round = d ? isRoundVideoDoc(d) : false
    const gifStyle = s.loop
    const durSec = getVideoDurationSeconds(d)
    const durationLabel = durSec != null ? formatVideoDuration(durSec) : null
    const peerTitle = viewerContext?.peerTitle ?? te("chat.mediaViewerPeerFallback")
    const sentAt = viewerContext?.sentAtLabel ?? ""
    const wrapClass = [
      "msg-media msg-media--video",
      gifStyle ? "msg-media--gif" : "",
      round ? "msg-media--round-video" : "",
    ].filter(Boolean).join(" ")
    return (
      <div className={wrapClass} data-media-state="preview">
        <VideoInlinePlayer
          src={s.u}
          loop={s.loop}
          autoPlay={gifStyle}
          muted
          playLabel={te("chat.playVideo")}
          round={round}
          durationLabel={gifStyle ? null : durationLabel}
          expandLabel={te("chat.expandVideo")}
          onExpand={() => setVideoFullOpen(true)}
          showGifTag={gifStyle}
        />
        {videoFullOpen ? (
          <VideoFullViewer
            src={s.u}
            loop={s.loop}
            onClose={() => setVideoFullOpen(false)}
            ariaLabel={te("chat.videoViewerDialog")}
            labelClose={te("chat.imageViewerClose")}
            title={peerTitle}
            sentAtLabel={sentAt}
            labelPlay={te("chat.videoPlay")}
            labelPause={te("chat.videoPause")}
            durationSec={durSec}
            variant={round ? "round" : "rect"}
          />
        ) : null}
      </div>
    )
  }
  if (s.k === "au") {
    const d = getMessageDocument(resolved)
    const dur = getAudioDurationSeconds(d)
    if (s.voice) {
      return (
        <div className="msg-media msg-media--audio msg-media--voice" data-media-state="preview">
          <VoiceMessageInline src={s.u} durationSec={dur} viewerContext={viewerContext} />
        </div>
      )
    }
    return (
      <div className="msg-media msg-media--audio" data-media-state="preview">
        {d ? <AudioTrackInline src={s.u} doc={d} viewerContext={viewerContext} /> : (
          <audio
            className="msg-audio"
            src={s.u}
            controls
            preload="metadata"
            aria-label={te("chat.previewAudio")}
          />
        )}
      </div>
    )
  }
  if (s.k === "at") {
    const d = getMessageDocument(resolved)
    return (
      <DocumentAttachmentInline url={s.u} name={s.name} sizeStr={s.sizeStr} doc={d} />
    )
  }
  if (s.k === "z") {
    const med = resolved.media
    if (
      med
      && med.className !== "MessageMediaEmpty"
      && !(med.className === "MessageMediaWebPage" && !noPreview)
    ) {
      return (
        <div className="msg-media msg-media--card" role="status">
          <span className="msg-media-card__muted">{getMessageMediaTypeLabel(message, t)}</span>
        </div>
      )
    }
  }
  return null
}
