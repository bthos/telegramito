import type { Api } from "telegram"

/**
 * Video duration from {@link Api.DocumentAttributeVideo} (seconds), if present.
 */
export function getVideoDurationSeconds(d: Api.Document | null): number | null {
  if (d == null) {
    return null
  }
  const a = d.attributes?.find(
    (x) => x.className === "DocumentAttributeVideo",
  ) as Api.DocumentAttributeVideo | undefined
  if (a == null || a.duration == null) {
    return null
  }
  const n = Number(a.duration)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function formatVideoDuration(totalSec: number): string {
  const s = Math.floor(Math.max(0, totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}
