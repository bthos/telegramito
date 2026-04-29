import { describe, expect, it } from "vitest"
import {
  formatDialogListTime,
  formatMessageDateSeparator,
  formatPollVoterTimestamp,
  getLocalDayKey,
  getStickyDateTsForRow,
} from "./timeFormat"

describe("getStickyDateTsForRow", () => {
  const sep = (dayKey: string, ts: number) => ({ kind: "sep" as const, dayKey, ts })
  const msg = () => ({ kind: "msg" as const, message: {} })

  it("returns sep ts at rowIndex when row is a sep", () => {
    const list = [sep("2024-01-01", 100), msg(), msg()]
    expect(getStickyDateTsForRow(list, 0)).toBe(100)
  })

  it("walks back to previous sep for a message row", () => {
    const list = [sep("2024-01-01", 100), msg(), msg()]
    expect(getStickyDateTsForRow(list, 2)).toBe(100)
  })

  it("uses newer day sep when row is on second day", () => {
    const list = [
      sep("2024-01-01", 100),
      msg(),
      sep("2024-01-02", 200),
      msg(),
    ]
    expect(getStickyDateTsForRow(list, 3)).toBe(200)
  })
})

describe("getLocalDayKey", () => {
  it("formats unix seconds as YYYY-MM-DD in local time", () => {
    const d = new Date(2026, 3, 15, 10, 0, 0) // 2026-04-15 local
    const ts = Math.floor(d.getTime() / 1000)
    expect(getLocalDayKey(ts)).toBe("2026-04-15")
  })

  it("zero-pads month and day", () => {
    const d = new Date(2026, 0, 5, 8, 0, 0) // 2026-01-05 local
    const ts = Math.floor(d.getTime() / 1000)
    expect(getLocalDayKey(ts)).toBe("2026-01-05")
  })
})

describe("formatMessageDateSeparator", () => {
  it("returns relative 'today' label for same day", () => {
    const now = new Date(2026, 3, 28, 15, 0, 0)
    const ts = Math.floor(new Date(2026, 3, 28, 9, 0, 0).getTime() / 1000)
    const s = formatMessageDateSeparator(ts, "en", now)
    expect(s.toLowerCase()).toContain("today")
  })

  it("returns relative 'yesterday' label for previous day", () => {
    const now = new Date(2026, 3, 28, 15, 0, 0)
    const ts = Math.floor(new Date(2026, 3, 27, 9, 0, 0).getTime() / 1000)
    const s = formatMessageDateSeparator(ts, "en", now)
    expect(s.toLowerCase()).toContain("yesterday")
  })

  it("returns weekday name for messages 2–6 days ago", () => {
    const now = new Date(2026, 3, 28, 15, 0, 0) // Tuesday
    const ts = Math.floor(new Date(2026, 3, 24, 9, 0, 0).getTime() / 1000) // Friday
    const s = formatMessageDateSeparator(ts, "en", now)
    expect(s.toLowerCase()).toContain("friday")
  })

  it("omits year for messages in the same year", () => {
    const now = new Date(2026, 3, 28, 15, 0, 0)
    const ts = Math.floor(new Date(2026, 0, 1, 9, 0, 0).getTime() / 1000) // Jan 1 same year
    const s = formatMessageDateSeparator(ts, "en", now)
    expect(s).not.toContain("2026")
  })

  it("includes year for messages in a different year", () => {
    const now = new Date(2026, 3, 28, 15, 0, 0)
    const ts = Math.floor(new Date(2024, 5, 10, 9, 0, 0).getTime() / 1000)
    const s = formatMessageDateSeparator(ts, "en", now)
    expect(s).toContain("2024")
  })
})

describe("formatDialogListTime", () => {
  it("shows time only when message is from today", () => {
    const now = new Date(2026, 3, 28, 17, 0, 0)
    const ts = Math.floor(new Date(2026, 3, 28, 9, 37, 0).getTime() / 1000)
    const s = formatDialogListTime(ts, "en", now)
    expect(s).toMatch(/\d{2}:\d{2}/)
    expect(s).not.toMatch(/2026/)
  })

  it("shows short date when message is from a previous day same year", () => {
    const now = new Date(2026, 3, 28, 17, 0, 0)
    const ts = Math.floor(new Date(2026, 2, 5, 9, 0, 0).getTime() / 1000)
    const s = formatDialogListTime(ts, "en", now)
    expect(s).not.toMatch(/\d{2}:\d{2}/)
    expect(s).not.toContain("2026")
  })

  it("shows year when message is from a different year", () => {
    const now = new Date(2026, 3, 28, 17, 0, 0)
    const ts = Math.floor(new Date(2023, 11, 1, 9, 0, 0).getTime() / 1000)
    const s = formatDialogListTime(ts, "en", now)
    expect(s).toContain("23")
  })
})

describe("formatPollVoterTimestamp", () => {
  it("uses time only on the same local calendar day as now", () => {
    const now = new Date(2026, 3, 28, 16, 0, 0)
    const ts = Math.floor(new Date(2026, 3, 28, 9, 37, 0).getTime() / 1000)
    const s = formatPollVoterTimestamp(ts, "en", now)
    expect(s).toMatch(/9:37|09:37/)
    expect(s).not.toMatch(/2026/)
  })

  it("includes month when not the same day", () => {
    const now = new Date(2026, 3, 28, 12, 0, 0)
    const ts = Math.floor(new Date(2026, 3, 9, 9, 37, 0).getTime() / 1000)
    const s = formatPollVoterTimestamp(ts, "en", now)
    expect(s.length).toBeGreaterThan(5)
  })
})
