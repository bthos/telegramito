import { Api } from "telegram"
import { getMessageDocument } from "./documentFile"
import { isCustomEmojiDoc, isRoundVideoDoc, isStickerDoc } from "./documentMediaKind"

/** Message-bubble media box cap — mirrors `.msg-img`'s CSS clamp (app.css). */
const MAX_WIDTH_PX = 320
const MAX_HEIGHT_PX = 288
/** Sticker/custom-emoji box cap — mirrors `.msg-sticker-img`'s CSS clamp (media-states.css). */
const MAX_STICKER_PX = 140

export interface MediaBoxDimensions {
  width: number
  height: number
}

function pickLargestPhotoSize(
  sizes: readonly Api.TypePhotoSize[] | undefined,
): { width: number; height: number } | null {
  let best: { width: number; height: number } | null = null
  for (const s of sizes ?? []) {
    const w = (s as { w?: number }).w
    const h = (s as { h?: number }).h
    if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
      if (!best || w * h > best.width * best.height) {
        best = { width: w, height: h }
      }
    }
  }
  return best
}

function clampToBox(width: number, height: number, maxW: number, maxH: number): MediaBoxDimensions {
  const aspect = height / width
  let w = Math.min(width, maxW)
  let h = Math.round(w * aspect)
  if (h > maxH) {
    h = maxH
    w = Math.round(h / aspect)
  }
  return { width: Math.max(1, w), height: Math.max(1, h) }
}

function clampToMessageBox(width: number, height: number): MediaBoxDimensions {
  return clampToBox(width, height, MAX_WIDTH_PX, MAX_HEIGHT_PX)
}

function clampToStickerBox(width: number, height: number): MediaBoxDimensions {
  return clampToBox(width, height, MAX_STICKER_PX, MAX_STICKER_PX)
}

/**
 * Final on-screen box for a message's photo/video/sticker, computed from
 * dimensions already present in the Telegram API response (`photo.sizes` /
 * `DocumentAttributeVideo` / `DocumentAttributeImageSize`) — mirrors Telegram
 * Web's own media-sizing approach, so placeholder/download/loaded states can
 * all reserve the same box up front instead of shifting once bytes decode.
 * Stickers and custom emoji clamp to a smaller box (matches `.msg-sticker-img`);
 * everything else clamps to the message-bubble box. Returns `null` for round
 * video notes (fixed circle elsewhere) and media with no usable size metadata.
 */
export function getMediaBoxDimensions(resolved: Api.Message): MediaBoxDimensions | null {
  const doc = getMessageDocument(resolved)
  if (doc && !isRoundVideoDoc(doc)) {
    const clamp = (isStickerDoc(doc) || isCustomEmojiDoc(doc)) ? clampToStickerBox : clampToMessageBox
    const videoAttr = doc.attributes?.find(
      (a): a is Api.DocumentAttributeVideo => a.className === "DocumentAttributeVideo",
    )
    if (videoAttr && videoAttr.w > 0 && videoAttr.h > 0) {
      return clamp(videoAttr.w, videoAttr.h)
    }
    const imgAttr = doc.attributes?.find(
      (a): a is Api.DocumentAttributeImageSize => a.className === "DocumentAttributeImageSize",
    )
    if (imgAttr && imgAttr.w > 0 && imgAttr.h > 0) {
      return clamp(imgAttr.w, imgAttr.h)
    }
  }
  if (resolved.media?.className === "MessageMediaPhoto") {
    const photo = (resolved.media as Api.MessageMediaPhoto).photo
    if (photo?.className === "Photo") {
      const best = pickLargestPhotoSize(photo.sizes)
      if (best) {
        return clampToMessageBox(best.width, best.height)
      }
    }
  }
  return null
}

/** CSS custom properties reserving `dims`'s box — `undefined` when unknown (falls back to CSS defaults). */
export function mediaBoxStyleVars(
  dims: MediaBoxDimensions | null,
): Record<"--msg-media-w" | "--msg-media-ar", string> | undefined {
  if (!dims) {
    return undefined
  }
  return {
    "--msg-media-w": `${dims.width}px`,
    "--msg-media-ar": `${dims.width} / ${dims.height}`,
  }
}
