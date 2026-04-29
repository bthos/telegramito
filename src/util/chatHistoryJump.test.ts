import { describe, expect, it } from "vitest"
import type { ChatDatedItem } from "../ui/ChatMessagesVirtualList"
import {
  findSepRowIndexForDayKey,
  getLoadedDayKeyBounds,
  getLoadedDayKeys,
  parseDayKey,
} from "./chatHistoryJump"

describe("chatHistoryJump", () => {
  it("parseDayKey", () => {
    expect(parseDayKey("2026-03-15")).toEqual({ y: 2026, m: 2, d: 15 })
  })

  it("getLoadedDayKeys collects sep dayKeys only", () => {
    const list = [
      { kind: "sep", dayKey: "2026-03-01", ts: 0 },
      { kind: "msg", message: {} },
      { kind: "sep", dayKey: "2026-04-03", ts: 0 },
    ] as unknown as ChatDatedItem[]
    expect(getLoadedDayKeys(list)).toEqual(new Set(["2026-03-01", "2026-04-03"]))
  })

  it("findSepRowIndexForDayKey returns correct row index", () => {
    const list = [
      { kind: "sep", dayKey: "2026-03-01", ts: 0 },
      { kind: "msg", message: {} },
      { kind: "sep", dayKey: "2026-04-03", ts: 0 },
    ] as unknown as ChatDatedItem[]
    expect(findSepRowIndexForDayKey(list, "2026-03-01")).toBe(0)
    expect(findSepRowIndexForDayKey(list, "2026-04-03")).toBe(2)
  })

  it("findSepRowIndexForDayKey returns null when day not loaded", () => {
    const list = [
      { kind: "sep", dayKey: "2026-03-01", ts: 0 },
    ] as unknown as ChatDatedItem[]
    expect(findSepRowIndexForDayKey(list, "2025-01-01")).toBeNull()
  })

  it("getLoadedDayKeyBounds returns min and max day keys", () => {
    const list = [
      { kind: "sep", dayKey: "2026-03-01", ts: 0 },
      { kind: "msg", message: {} },
      { kind: "sep", dayKey: "2026-04-03", ts: 0 },
    ] as unknown as ChatDatedItem[]
    expect(getLoadedDayKeyBounds(list)).toEqual({ min: "2026-03-01", max: "2026-04-03" })
  })

  it("getLoadedDayKeyBounds returns nulls for empty list", () => {
    expect(getLoadedDayKeyBounds([])).toEqual({ min: null, max: null })
  })
})
