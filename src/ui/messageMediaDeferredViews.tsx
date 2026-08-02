import { Api } from "telegram"
import { useRef, useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { getMessageDocument, getDocumentFileName, formatDocumentSize, documentExtensionLabel } from "../telegram/documentFile"
import { isRoundVideoDoc } from "../telegram/documentMediaKind"
import { getAudioTrackMeta } from "../telegram/documentAudioMeta"
import { getVideoDurationSeconds, formatVideoDuration } from "../telegram/documentVideoMeta"
import { resolveMediaPlaceholderType } from "./MediaPlaceholder"
import { TgProgressIndeterminate } from "./TgProgressIndeterminate"

export function PaidBundlePreviewRow({
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

export function documentAttachmentLabels(
  resolved: Api.Message,
): { name: string; sizeStr: string; ext: string } | null {
  const d = getMessageDocument(resolved)
  if (!d) return null
  const name = getDocumentFileName(d) || "file"
  const sizeStr = formatDocumentSize(d.size)
  const ext = documentExtensionLabel(name)
  return { name, sizeStr, ext }
}

export function DocumentAttachmentDeferredRow({
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

export function AudioTrackLoadingRow({
  doc,
  hint,
  onCancel,
  cancelLabel,
}: {
  doc: Api.Document
  hint: string
  onCancel?: () => void
  cancelLabel?: string
}) {
  const { t } = useTranslation()
  const { title, performer } = getAudioTrackMeta(doc)
  const displayTitle = title || t("chat.previewAudio")
  const line2 = performer || ""

  return (
    <div className="msg-audio-track msg-audio-track--loading" data-media-state="loading">
      <span className="msg-audio-track__cover msg-audio-track__cover--busy" aria-hidden>
        <TgProgressIndeterminate onCancel={onCancel} cancelLabel={cancelLabel} />
      </span>
      <span className="msg-audio-track__text">
        <span className="msg-audio-track__title">{displayTitle}</span>
        <span className="msg-audio-track__sub msg-audio-track__sub--progress">
          {line2 ? `${line2} · ` : ""}
          {hint}
        </span>
      </span>
    </div>
  )
}

export function DocumentAttachmentLoadingRow({
  name,
  sizeStr,
  hint,
  timeLabel,
  onCancel,
  cancelLabel,
}: {
  name: string
  sizeStr: string
  hint: string
  timeLabel: string | null
  onCancel?: () => void
  cancelLabel?: string
}) {
  const subLine = [sizeStr, hint].filter(Boolean).join(sizeStr && hint ? " · " : "")
  return (
    <div className="msg-media msg-media--doc-fetch" data-media-state="loading">
      <div className="msg-doc-row msg-doc-row--loading">
        <div className="msg-doc-row__loading-inner">
          <div className="msg-doc-row__icon msg-doc-row__icon--busy">
            <TgProgressIndeterminate onCancel={onCancel} cancelLabel={cancelLabel} />
          </div>
          <div className="msg-doc-row__body">
            <div className="msg-doc-row__title">{name}</div>
            {subLine ? <div className="msg-doc-row__sub">{subLine}</div> : null}
          </div>
        </div>
      </div>
      <div className="media-loading-foot" role="status">
        <span className="media-loading-foot__hint" aria-hidden />
        {timeLabel ? (
          <span className="media-loading-foot__time">{timeLabel}</span>
        ) : (
          <span className="media-loading-foot__time" aria-hidden />
        )}
      </div>
    </div>
  )
}

/** Tap-to-load photo — `design-system/preview/photo.html` (preview). */
export function PhotoDeferredPending({
  onActivate,
  tapLabel,
  footHint,
  sentAtLabel,
  thumbDataUrl,
  style,
}: {
  onActivate: () => void
  tapLabel: string
  footHint: string
  sentAtLabel: string | null
  thumbDataUrl?: string
  style?: CSSProperties
}) {
  return (
    <div className="msg-photo-deferred" data-media-state="preview" style={style}>
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
export function PhotoDeferredLoading({
  hint,
  timeLabel,
  thumbDataUrl,
  onCancel,
  cancelLabel,
  style,
}: {
  hint: string
  timeLabel: string | null
  thumbDataUrl?: string
  onCancel?: () => void
  cancelLabel?: string
  style?: CSSProperties
}) {
  return (
    <div className="msg-media msg-media--photo-fetch" data-media-state="loading" style={style}>
      <div className="msg-photo-deferred__canvas msg-photo-deferred__canvas--busy" aria-hidden>
        {thumbDataUrl ? (
          <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
        ) : null}
        <span className="msg-photo-deferred__sun" />
        <span className="msg-photo-deferred__horizon" />
        <span className="msg-photo-deferred__ridge" />
        <div className="msg-photo-deferred__progress">
          <TgProgressIndeterminate onCancel={onCancel} cancelLabel={cancelLabel} />
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

/** Tap-to-load animated GIF / animated image — `design-system/preview/gif.html`. */
export function GifDeferredPending({
  onActivate,
  tapLabel,
  footHint,
  sentAtLabel,
  thumbDataUrl,
  style,
}: {
  onActivate: () => void
  tapLabel: string
  footHint: string
  sentAtLabel: string | null
  thumbDataUrl?: string
  style?: CSSProperties
}) {
  return (
    <div className="msg-gif-deferred" data-media-state="preview" style={style}>
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

export function GifDeferredLoading({
  hint,
  timeLabel,
  thumbDataUrl,
  onCancel,
  cancelLabel,
  style,
}: {
  hint: string
  timeLabel: string | null
  thumbDataUrl?: string
  onCancel?: () => void
  cancelLabel?: string
  style?: CSSProperties
}) {
  return (
    <div className="msg-media msg-media--gif-fetch" data-media-state="loading" style={style}>
      <div className="msg-gif-deferred__canvas msg-gif-deferred__canvas--busy" aria-hidden>
        {thumbDataUrl ? (
          <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
        ) : null}
        <span className="msg-gif-deferred__splash" />
        <span className="msg-gif-deferred__streaks" />
        <span className="msg-gif-deferred__tag">GIF</span>
        <div className="msg-gif-deferred__progress">
          <TgProgressIndeterminate onCancel={onCancel} cancelLabel={cancelLabel} />
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

/** Tap-to-load / fetching video chrome — aligns with `design-system/preview/video.html`. */
export function VideoDeferredPending({
  resolved,
  onActivate,
  tapLabel,
  footHint,
  sentAtLabel,
  thumbDataUrl,
  style,
}: {
  resolved: Api.Message
  onActivate: () => void
  tapLabel: string
  footHint: string
  sentAtLabel: string | null
  thumbDataUrl?: string
  style?: CSSProperties
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
      style={style}
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

export function VideoDeferredLoading({
  hint,
  timeLabel,
  round = false,
  thumbDataUrl,
  durationLabel,
  sizeStr,
  onCancel,
  cancelLabel,
  style,
}: {
  hint: string
  timeLabel: string | null
  round?: boolean
  thumbDataUrl?: string
  durationLabel?: string | null
  sizeStr?: string | null
  onCancel?: () => void
  cancelLabel?: string
  style?: CSSProperties
}) {
  const frameClass = round
    ? "msg-video-deferred__frame msg-video-deferred__frame--busy msg-video-deferred__frame--round"
    : "msg-video-deferred__frame msg-video-deferred__frame--busy"
  const pillLabel = [durationLabel, sizeStr].filter(Boolean).join(durationLabel && sizeStr ? " · " : "")
  return (
    <div
      className={
        round ? "msg-media msg-media--video-fetch msg-media--video-fetch--round" : "msg-media msg-media--video-fetch"
      }
      data-media-state="loading"
      style={style}
    >
      <div className={frameClass}>
        {thumbDataUrl ? (
          <img src={thumbDataUrl} className="msg-media-stripped-thumb" aria-hidden alt="" />
        ) : null}
        {pillLabel ? (
          <span
            className={
              round
                ? "msg-video-thumb__duration msg-video-thumb__duration--round"
                : "msg-video-thumb__duration"
            }
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff" aria-hidden>
              <path d="M2 1l7 4-7 4z" />
            </svg>
            {pillLabel}
          </span>
        ) : null}
        <TgProgressIndeterminate onCancel={onCancel} cancelLabel={cancelLabel} />
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

export function mediaLoadingIsCompact(type: ReturnType<typeof resolveMediaPlaceholderType>): boolean {
  return type === "audio" || type === "voice"
}

export function VideoInlinePlayer({
  src,
  loop,
  autoPlay,
  muted,
  playLabel,
  round,
  durationLabel,
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
        if (!showGifTag) {
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
