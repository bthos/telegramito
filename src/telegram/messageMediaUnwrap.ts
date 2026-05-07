import { Api } from "telegram"
import { getMessageDocument } from "./documentFile"

type Media = Api.TypeMessageMedia

/** Nested invoice / paid bundles can chain several layers (poll preference inside each paid layer). */
const MAX_MEDIA_UNWRAP_DEPTH = 24

/**
 * Inner {@link Api.TypeMessageMedia} from one {@link Api.MessageExtendedMedia} slot.
 * Skips {@link Api.MessageExtendedMediaPreview} rows (no full media yet).
 */
export function innerMediaFromExtendedMediaSlot(
  em: Api.TypeMessageExtendedMedia | undefined | null,
): Media | null {
  if (!em || em.className !== "MessageExtendedMedia") {
    return null
  }
  const inner = (em as Api.MessageExtendedMedia).media
  if (inner != null && inner.className !== "MessageMediaEmpty") {
    return inner
  }
  return null
}

/**
 * For {@link Api.MessageMediaPaidMedia}, pick the first inner `MessageExtendedMedia.media` row.
 * Prefers {@link Api.MessageMediaPoll} when present so it stays aligned with
 * {@link getMessageMediaPollFromMessage}.
 */
export function collectPaidInnerMedias(
  med: Api.MessageMediaPaidMedia | undefined,
): Media[] {
  if (!med?.extendedMedia) {
    return []
  }
  const out: Media[] = []
  for (const em of med.extendedMedia) {
    const inner = innerMediaFromExtendedMediaSlot(em)
    if (inner) {
      out.push(inner)
    }
  }
  return out
}

function unwrapPaidLayerPickInner(pm: Api.MessageMediaPaidMedia): Media | null {
  const inners = collectPaidInnerMedias(pm)
  if (inners.length === 0) {
    return null
  }
  const poll = inners.find((x) => x.className === "MessageMediaPoll")
  return poll ?? inners[0]
}

/**
 * Unwrap one invoice or paid-media layer (poll wins inside a paid bundle).
 */
export function unwrapMessageMediaOnce(m: Api.Message): Api.Message | null {
  const med = m.media
  if (!med) {
    return null
  }
  if (med.className === "MessageMediaInvoice") {
    const inner = innerMediaFromExtendedMediaSlot((med as Api.MessageMediaInvoice).extendedMedia)
    if (!inner) {
      return null
    }
    return { ...m, media: inner } as Api.Message
  }
  if (med.className === "MessageMediaPaidMedia") {
    const inner = unwrapPaidLayerPickInner(med as Api.MessageMediaPaidMedia)
    if (!inner) {
      return null
    }
    return { ...m, media: inner } as Api.Message
  }
  return null
}

/**
 * Fully unwrap {@link Api.MessageMediaInvoice} chains and nested {@link Api.MessageMediaPaidMedia}
 * until a concrete leaf media (photo, document, poll, geo, …).
 */
export function deepResolveSingleMedia(media: Api.TypeMessageMedia): Api.TypeMessageMedia {
  let cur: Api.TypeMessageMedia = media
  for (let i = 0; i < MAX_MEDIA_UNWRAP_DEPTH; i++) {
    if (cur.className === "MessageMediaInvoice") {
      const inner = innerMediaFromExtendedMediaSlot((cur as Api.MessageMediaInvoice).extendedMedia)
      if (!inner) {
        break
      }
      cur = inner
      continue
    }
    if (cur.className === "MessageMediaPaidMedia") {
      const inner = unwrapPaidLayerPickInner(cur as Api.MessageMediaPaidMedia)
      if (!inner) {
        break
      }
      cur = inner
      continue
    }
    break
  }
  return cur
}

export type PaidBundleSlot =
  | { kind: "full"; media: Api.TypeMessageMedia }
  | { kind: "preview"; preview: Api.MessageExtendedMediaPreview }

/**
 * Ordered slots inside {@link Api.MessageMediaPaidMedia}: full media rows and locked preview rows.
 * Each full slot is {@link deepResolveSingleMedia}'d so invoice / nested paid wrappers render as leaf types.
 */
export function listPaidBundleSlots(pm: Api.MessageMediaPaidMedia): PaidBundleSlot[] {
  const out: PaidBundleSlot[] = []
  for (const em of pm.extendedMedia ?? []) {
    if (em.className === "MessageExtendedMediaPreview") {
      out.push({ kind: "preview", preview: em as Api.MessageExtendedMediaPreview })
      continue
    }
    if (em.className === "MessageExtendedMedia") {
      const raw = (em as Api.MessageExtendedMedia).media
      if (raw != null && raw.className !== "MessageMediaEmpty") {
        out.push({ kind: "full", media: deepResolveSingleMedia(raw) })
      }
    }
  }
  return out
}

/**
 * When true, render all slots (multiple media and/or preview rows). Otherwise one leaf is enough.
 */
export function shouldRenderPaidBundleBlock(slots: readonly PaidBundleSlot[]): boolean {
  const nFull = slots.filter((s) => s.kind === "full").length
  const nPrev = slots.filter((s) => s.kind === "preview").length
  if (nFull === 0 && nPrev > 0) {
    return true
  }
  if (nFull > 1) {
    return true
  }
  return nFull >= 1 && nPrev >= 1
}

/**
 * Replaces top-level `MessageMediaPaidMedia` or invoice extended slot with inner media (poll preferred for bundles),
 * for preview labels and download routing. Repeats until a non-wrapper leaf or max depth.
 */
export function resolveMessageMediaForDisplay(m: Api.Message): Api.Message {
  let cur: Api.Message = m
  for (let i = 0; i < MAX_MEDIA_UNWRAP_DEPTH; i++) {
    const next = unwrapMessageMediaOnce(cur)
    if (!next) {
      break
    }
    cur = next
  }
  return cur
}

/**
 * Resolves a document the same way as the visible/download path: paid → inner
 * `MessageMediaDocument` when present.
 */
export function getMessageDocumentResolved(m: Api.Message): ReturnType<typeof getMessageDocument> {
  return getMessageDocument(resolveMessageMediaForDisplay(m))
}

export function mapsUrlFromGeoPoint(geo: Api.TypeGeoPoint): string | null {
  if (geo.className !== "GeoPoint") {
    return null
  }
  const g = geo as Api.GeoPoint
  const lat = typeof g.lat === "number" ? g.lat : Number(g.lat)
  const long = typeof g.long === "number" ? g.long : Number(g.long)
  if (!Number.isFinite(lat) || !Number.isFinite(long)) {
    return null
  }
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${long}#map=16/${lat}/${long}`
}

/**
 * @returns `true` if the bubble is handled by {@link import("../ui/MessageMediaStatic").MessageMediaStatic}
 *     rather than by blob / attachment pipeline.
 */
export function isNonBlobVisualMedia(
  m: Media | null | undefined,
): boolean {
  if (!m) {
    return false
  }
  const cn = m.className
  if (cn === "MessageMediaGeo" || cn === "MessageMediaVenue" || cn === "MessageMediaGeoLive") {
    return true
  }
  if (
    cn === "MessageMediaContact"
    || cn === "MessageMediaGame"
    || cn === "MessageMediaInvoice"
    || cn === "MessageMediaDice"
    || cn === "MessageMediaStory"
    || cn === "MessageMediaGiveaway"
    || cn === "MessageMediaGiveawayResults"
    || cn === "MessageMediaPaidMedia"
    || cn === "MessageMediaToDo"
    || cn === "MessageMediaVideoStream"
  ) {
    return true
  }
  if (cn === "MessageMediaUnsupported" || cn === "MessageMediaEmpty") {
    return true
  }
  return false
}
