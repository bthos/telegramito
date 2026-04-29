import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { getMessageMediaPollFromMessage } from "./messagePollMedia"
import { resolveMessageMediaForDisplay } from "./messageMediaUnwrap"

type Tr = (key: string, options?: Record<string, string | number | undefined>) => string

type WithClass = { className: string }

function isDoc(x: unknown): x is Api.Document {
  return typeof x === "object" && x !== null && (x as WithClass).className === "Document"
}

/**
 * One-line label for a document (stickers, voice, files, video, …).
 * Exported for chat bubbles when there is no caption.
 */
export function getDocumentTypeLabel(d: Api.Document, t: Tr): string {
  for (const a of d.attributes ?? []) {
    if (a.className === "DocumentAttributeSticker") {
      return t("chat.previewSticker")
    }
    if (a.className === "DocumentAttributeCustomEmoji") {
      return t("chat.previewCustomEmoji")
    }
  }
  for (const a of d.attributes ?? []) {
    if (a.className === "DocumentAttributeVideo" && (a as Api.DocumentAttributeVideo).roundMessage) {
      return t("chat.previewVideoNote")
    }
  }
  for (const a of d.attributes ?? []) {
    if (a.className === "DocumentAttributeAudio" && (a as Api.DocumentAttributeAudio).voice) {
      return t("chat.previewVoice")
    }
  }
  for (const a of d.attributes ?? []) {
    if (a.className === "DocumentAttributeAudio" && !(a as Api.DocumentAttributeAudio).voice) {
      return t("chat.previewAudio")
    }
  }
  for (const a of d.attributes ?? []) {
    if (a.className === "DocumentAttributeAnimated") {
      return t("chat.previewGif")
    }
  }
  const mime = d.mimeType ? String(d.mimeType).toLowerCase() : ""
  if (mime.startsWith("video/")) {
    return t("chat.previewVideo")
  }
  if (mime.startsWith("audio/") || mime === "application/ogg") {
    return t("chat.previewAudio")
  }
  if (mime.startsWith("image/")) {
    return t("chat.previewPhoto")
  }
  return t("chat.previewFile")
}

/**
 * Short label for non-text message content (media type when caption is empty).
 */
export function getMessageMediaTypeLabel(m: Api.Message, t: Tr): string {
  if (m.document && isDoc(m.document) && !m.media) {
    return getDocumentTypeLabel(m.document, t)
  }
  if (getMessageMediaPollFromMessage(m)) {
    return t("chat.previewPoll")
  }
  const med = m.media
  if (med?.className === "MessageMediaPaidMedia") {
    const r = resolveMessageMediaForDisplay(m)
    if (r.media !== med) {
      return getMessageMediaTypeLabel(r, t)
    }
    return t("chat.previewPaidMedia")
  }
  if (!med || med.className === "MessageMediaEmpty") {
    if (m.document && isDoc(m.document)) {
      return getDocumentTypeLabel(m.document, t)
    }
    return t("chat.previewEmpty")
  }
  const cn = med.className
  if (cn === "MessageMediaPhoto") {
    return t("chat.previewPhoto")
  }
  if (cn === "MessageMediaDocument") {
    const raw = (med as Api.MessageMediaDocument).document
    if (isDoc(raw)) {
      return getDocumentTypeLabel(raw, t)
    }
    return t("chat.previewFile")
  }
  if (cn === "MessageMediaWebPage") {
    const txt = m.message
    if (typeof txt === "string" && txt.length > 0) {
      return txt
    }
    return t("chat.previewLink")
  }
  if (cn === "MessageMediaGeo" || cn === "MessageMediaVenue") {
    return t("chat.previewLocation")
  }
  if (cn === "MessageMediaContact") {
    return t("chat.previewContact")
  }
  if (cn === "MessageMediaStory") {
    return t("chat.previewStory")
  }
  if (cn === "MessageMediaGame") {
    return t("chat.previewGame")
  }
  if (cn === "MessageMediaInvoice") {
    return t("chat.previewInvoice")
  }
  if (cn === "MessageMediaGeoLive") {
    return t("chat.previewLocationLive")
  }
  if (cn === "MessageMediaDice") {
    return t("chat.previewDice")
  }
  if (cn === "MessageMediaGiveaway" || cn === "MessageMediaGiveawayResults") {
    return t("chat.previewGiveaway")
  }
  if (cn === "MessageMediaUnsupported") {
    return t("chat.previewUnsupported")
  }
  return t("chat.previewUnknownType", {
    type: (cn as string).replace("MessageMedia", "") || "?",
  })
}

function mediaHint(m: Api.Message, t: Tr): string {
  return getMessageMediaTypeLabel(m, t)
}

/**
 * One-line preview for a dialog row: last text or a short label for media/system.
 */
/**
 * One-line text for the composer "replying to" strip.
 */
export function getReplyToPreviewText(m: Api.Message, t: Tr, maxLength = 80): string {
  if (m.message && m.message.length > 0) {
    const line = m.message.replace(/\s+/g, " ").trim()
    return line.length > maxLength
      ? `${line.slice(0, maxLength - 1)}…`
      : line
  }
  return getMessageMediaTypeLabel(m, t)
}

export function getDialogPreviewText(d: Dialog, t: Tr, maxLength = 72): string {
  const m = d.message
  if (!m) return ""
  if (m.className === "Message") {
    if (m.message && m.message.length > 0) {
      const line = m.message.replace(/\s+/g, " ").trim()
      return line.length > maxLength ? line.slice(0, maxLength - 1) + "…" : line
    }
    return mediaHint(m, t)
  }
  if (m.className === "MessageService") {
    return t("chat.previewService")
  }
  return t("chat.previewAttachment")
}
