import { Api } from "telegram"

export function isStickerDoc(d: Api.Document): boolean {
  return d.attributes?.some((a) => a.className === "DocumentAttributeSticker") ?? false
}

export function isAnimatedDoc(d: Api.Document): boolean {
  return d.attributes?.some((a) => a.className === "DocumentAttributeAnimated") ?? false
}

export function isCustomEmojiDoc(d: Api.Document): boolean {
  return d.attributes?.some((a) => a.className === "DocumentAttributeCustomEmoji") ?? false
}

export function isVideoDoc(d: Api.Document): boolean {
  return d.attributes?.some((a) => a.className === "DocumentAttributeVideo") ?? false
}

export function isTgsShapedDoc(d: Api.Document): boolean {
  const m = d.mimeType?.toLowerCase() ?? ""
  if (m === "application/x-tgsticker" || m === "image/webm") {
    return true
  }
  if (isStickerDoc(d) && m && !m.includes("webp") && m !== "image/webp") {
    return true
  }
  return false
}
