import type { Api } from "teleproto"

export function getDocumentAttributeAudio(
  d: Api.Document | null,
): Api.DocumentAttributeAudio | null {
  if (d == null) {
    return null
  }
  const a = d.attributes?.find(
    (x) => x.className === "DocumentAttributeAudio",
  ) as Api.DocumentAttributeAudio | undefined
  return a ?? null
}

/** Duration in seconds from {@link Api.DocumentAttributeAudio}, if present. */
export function getAudioDurationSeconds(d: Api.Document | null): number | null {
  const a = getDocumentAttributeAudio(d)
  if (a == null || a.duration == null) {
    return null
  }
  const n = Number(a.duration)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function getAudioTrackMeta(d: Api.Document | null): {
  title: string
  performer: string
} {
  const a = getDocumentAttributeAudio(d)
  const title = (a?.title && String(a.title).trim()) || ""
  const performer = (a?.performer && String(a.performer).trim()) || ""
  return { title, performer }
}
