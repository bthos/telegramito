import type { ChatDatedItem } from "../ui/ChatMessagesVirtualList"

/** Row index of the date separator for `dayKey` (`YYYY-MM-DD`), or null if that day is not in the list. */
export function findSepRowIndexForDayKey(
  datedList: readonly ChatDatedItem[],
  dayKey: string,
): number | null {
  for (let i = 0; i < datedList.length; i++) {
    const it = datedList[i]
    if (it.kind === "sep" && it.dayKey === dayKey) {
      return i
    }
  }
  return null
}

/** Every local day (`YYYY-MM-DD`) that has at least one message in the currently loaded history. */
export function getLoadedDayKeys(datedList: readonly ChatDatedItem[]): Set<string> {
  const s = new Set<string>()
  for (const it of datedList) {
    if (it.kind === "sep") {
      s.add(it.dayKey)
    }
  }
  return s
}

/** `{ y, m, d }` with `m` 0–11 — from `YYYY-MM-DD`. */
export function parseDayKey(dayKey: string): { y: number; m: number; d: number } {
  const [ys, ms, ds] = dayKey.split("-")
  return { y: Number(ys), m: Number(ms) - 1, d: Number(ds) }
}

/** Min/max local day among loaded `datedList` date separators. */
export function getLoadedDayKeyBounds(datedList: readonly ChatDatedItem[]): {
  min: string | null
  max: string | null
} {
  let min: string | null = null
  let max: string | null = null
  for (const it of datedList) {
    if (it.kind === "sep") {
      if (min == null || it.dayKey < min) {
        min = it.dayKey
      }
      if (max == null || it.dayKey > max) {
        max = it.dayKey
      }
    }
  }
  return { min, max }
}
