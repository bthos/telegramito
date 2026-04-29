import { Api } from "telegram"
import { getMessageDocument } from "./documentFile"

type Media = Api.TypeMessageMedia

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
    if (em.className !== "MessageExtendedMedia") {
      continue
    }
    const inner = (em as Api.MessageExtendedMedia).media
    if (inner != null && inner.className !== "MessageMediaEmpty") {
      out.push(inner)
    }
  }
  return out
}

/**
 * Replaces top-level `MessageMediaPaidMedia` with the first inner media row (poll preferred),
 * for preview labels and download routing.
 */
export function resolveMessageMediaForDisplay(m: Api.Message): Api.Message {
  const med = m.media
  if (med?.className !== "MessageMediaPaidMedia") {
    return m
  }
  const raw = med as Api.MessageMediaPaidMedia
  const inners = collectPaidInnerMedias(raw)
  if (inners.length === 0) {
    return m
  }
  const poll = inners.find((x) => x.className === "MessageMediaPoll")
  const pick = poll ?? inners[0]
  return { ...m, media: pick } as Api.Message
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
  ) {
    return true
  }
  if (cn === "MessageMediaUnsupported" || cn === "MessageMediaEmpty") {
    return true
  }
  return false
}
