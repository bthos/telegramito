import { Api } from "telegram"
import { useTranslation } from "react-i18next"
import {
  isCustomEmojiDoc,
  isStickerDoc,
  isVideoDoc,
} from "../telegram/documentMediaKind"

export type MediaPlaceholderType =
  | "photo"
  | "video"
  | "audio"
  | "voice"
  | "attachment"
  | "sticker"

interface MediaPlaceholderProps {
  type: MediaPlaceholderType
  width?: number | string
  height?: number | string
}

/**
 * Resolve which placeholder variant to show for a given message + document.
 *
 * Decision tree order (must match test expectations):
 *   1. sticker / custom-emoji
 *   2. video (via DocumentAttributeVideo or video/* mime)
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
 * The `media-placeholder` CSS class applies a no-flash appear delay.
 */
export function MediaPlaceholder({ type, width, height }: MediaPlaceholderProps) {
  const { t } = useTranslation()
  const label = t("chat.mediaLoading")

  const style: React.CSSProperties = {}
  if (width != null) style.width = typeof width === "number" ? `${width}px` : width
  if (height != null) style.height = typeof height === "number" ? `${height}px` : height

  if (type === "sticker") {
    return (
      <div
        className="media-placeholder media-placeholder--sticker"
        role="status"
        aria-label={label}
        aria-busy="true"
        style={style}
      />
    )
  }

  if (type === "video" || type === "photo") {
    return (
      <div
        className="media-placeholder media-placeholder--visual"
        role="status"
        aria-label={label}
        aria-busy="true"
        style={style}
      />
    )
  }

  if (type === "audio" || type === "voice") {
    return (
      <div
        className="media-placeholder media-placeholder--audio"
        role="status"
        aria-label={label}
        aria-busy="true"
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
      className="media-placeholder media-placeholder--attachment"
      role="status"
      aria-label={label}
      aria-busy="true"
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
