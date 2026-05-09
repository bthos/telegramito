import { Api } from "telegram"
import { useTranslation } from "react-i18next"
import { getDocumentFileName } from "../telegram/documentFile"
import {
  isAnimatedDoc,
  isCustomEmojiDoc,
  isStickerDoc,
  isVideoDoc,
} from "../telegram/documentMediaKind"

export type MediaPlaceholderType =
  | "photo"
  | "video"
  | "gif"
  | "audio"
  | "voice"
  | "attachment"
  | "sticker"

interface MediaPlaceholderProps {
  type: MediaPlaceholderType
  width?: number | string
  height?: number | string
  /** Shimmer skeleton (DS-07). Default true. */
  shimmer?: boolean
  /**
   * `pending` — tap-to-load shell inside a control; decorative only (matches UX preview column, not loading skeleton).
   */
  variant?: "default" | "pending"
}

/**
 * Resolve which placeholder variant to show for a given message + document.
 *
 * Decision tree order (must match test expectations):
 *   1. sticker / custom-emoji
 *   2. video (via DocumentAttributeVideo or video/* mime)
 *   2b. video via filename .mp4/.webm/.mov/.m4v when mime is vague
 *   2c. animated (DocumentAttributeAnimated), non-video → gif (gif.html)
 *   3. image/* mime → photo
 *   4. audio with voice=true → voice
 *   5. audio (non-voice) → audio
 *   6. any other document → attachment
 *   7. MessageMediaPhoto (no document) → photo
 *   8. fallback → photo
 */
export function resolveMediaPlaceholderType(
  resolved: Api.Message,
  d: Api.Document | null,
): MediaPlaceholderType {
  if (d != null) {
    // Branch 1: sticker or custom emoji
    if (isStickerDoc(d) || isCustomEmojiDoc(d)) {
      return "sticker"
    }

    // Branch 2: video
    const mimeLower = d.mimeType?.toLowerCase() ?? ""
    if (isVideoDoc(d) || mimeLower.startsWith("video/")) {
      return "video"
    }

    const fn = getDocumentFileName(d)?.toLowerCase() ?? ""
    if (/\.(mp4|webm|mov|m4v)$/.test(fn)) {
      return "video"
    }

    // Branch 2c: animated image / GIF-as-image (not classified as video above)
    if (isAnimatedDoc(d)) {
      return "gif"
    }

    // Branch 3: photo via image mime
    if (d.mimeType?.startsWith("image/")) {
      return "photo"
    }

    // Branch 4 / 5: audio
    const audioAttr = d.attributes?.find(
      (a) => a.className === "DocumentAttributeAudio",
    ) as Api.DocumentAttributeAudio | undefined
    if (audioAttr) {
      return audioAttr.voice ? "voice" : "audio"
    }

    // Branch 6: generic document
    return "attachment"
  }

  // Branch 7: no document — MessageMediaPhoto
  if (resolved.media?.className === "MessageMediaPhoto") {
    return "photo"
  }

  // Branch 8: safe fallback
  return "photo"
}

/**
 * Pure presentational skeleton placeholder for in-flight media blobs.
 *
 * Variants: photo, video, sticker, audio, voice, attachment.
 * All carry `role="status"`, `aria-busy="true"`, and a translated aria-label.
 * Optional `placeholder--shimmer` via `shimmer` (default true).
 */
export function MediaPlaceholder({
  type,
  width,
  height,
  shimmer = true,
  variant = "default",
}: MediaPlaceholderProps) {
  const { t } = useTranslation()
  const label = t("chat.mediaLoading")
  const pending = variant === "pending"
  const shimmerClass = shimmer ? " placeholder--shimmer" : ""
  const pendingClass = pending ? " media-placeholder--pending" : ""
  const rootAttrs = pending
    ? { role: "presentation" as const, "aria-hidden": true as const }
    : { role: "status" as const, "aria-label": label, "aria-busy": true as const }

  const style: React.CSSProperties = {}
  if (width != null) style.width = typeof width === "number" ? `${width}px` : width
  if (height != null) style.height = typeof height === "number" ? `${height}px` : height

  if (type === "sticker") {
    return (
      <div
        className={`media-placeholder media-placeholder--sticker${pendingClass}${shimmerClass}`}
        {...rootAttrs}
        style={style}
      />
    )
  }

  if (type === "video") {
    return (
      <div
        className={`media-placeholder media-placeholder--visual media-placeholder--video${pendingClass}${shimmerClass}`}
        {...rootAttrs}
        style={style}
      >
        {!pending ? <span className="media-placeholder__video-play-hint" aria-hidden="true" /> : null}
        {pending ? <span className="media-placeholder__video-play-center" aria-hidden="true" /> : null}
      </div>
    )
  }

  if (type === "gif") {
    return (
      <div
        className={`media-placeholder media-placeholder--visual media-placeholder--gif${pendingClass}${shimmerClass}`}
        {...rootAttrs}
        style={style}
      >
        <span className="media-placeholder__gif-splash" aria-hidden="true" />
        <span className="media-placeholder__gif-streaks" aria-hidden="true" />
        <span className="media-placeholder__gif-tag" aria-hidden="true">
          GIF
        </span>
      </div>
    )
  }

  if (type === "photo") {
    return (
      <div
        className={`media-placeholder media-placeholder--visual${pendingClass}${shimmerClass}`}
        {...rootAttrs}
        style={style}
      />
    )
  }

  if (type === "audio" || type === "voice") {
    return (
      <div
        className={`media-placeholder media-placeholder--audio${pendingClass}${shimmerClass}`}
        {...rootAttrs}
        style={style}
      >
        <div className="media-placeholder__avatar" aria-hidden="true" />
        <div className="media-placeholder__waveform" aria-hidden="true" />
      </div>
    )
  }

  // type === "attachment"
  return (
    <div
      className={`media-placeholder media-placeholder--attachment${pendingClass}${shimmerClass}`}
      {...rootAttrs}
      style={style}
    >
      <div className="media-placeholder__icon" aria-hidden="true" />
      <div className="media-placeholder__text" aria-hidden="true">
        <div className="media-placeholder__text-line media-placeholder__text-line--wide" />
        <div className="media-placeholder__text-line media-placeholder__text-line--narrow" />
      </div>
    </div>
  )
}

export default MediaPlaceholder
