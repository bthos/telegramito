import { describe, expect, it } from "vitest"
import {
  isNightListHidden,
  isPrivateChatHidden,
  isPrivateOmittedInChildListForDeny,
  parseTimeToMinutes,
} from "./policy"

describe("parseTimeToMinutes", () => {
  it("parses valid 24h times", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0)
    expect(parseTimeToMinutes("9:30")).toBe(9 * 60 + 30)
    expect(parseTimeToMinutes("23:59")).toBe(23 * 60 + 59)
  })
  it("rejects invalid", () => {
    expect(parseTimeToMinutes("24:00")).toBeNull()
    expect(parseTimeToMinutes("12:60")).toBeNull()
  })
})

describe("isNightListHidden", () => {
  it("is false when night disabled (child mode)", () => {
    expect(
      isNightListHidden(
        { enabled: false, start: "22:00", end: "07:00" },
        new Date("2026-01-01T23:00:00"),
        "child"
      )
    ).toBe(false)
  })
  it("parent mode never night-hides, even in window and night enabled", () => {
    const night = { enabled: true, start: "22:00", end: "23:00" }
    expect(isNightListHidden(night, new Date("2026-01-01T22:00:00"), "parent")).toBe(
      false
    )
  })
  it("hides in same-day window (child only)", () => {
    const night = { enabled: true, start: "22:00", end: "23:00" }
    expect(isNightListHidden(night, new Date("2026-01-01T21:59:00"), "child")).toBe(
      false
    )
    expect(isNightListHidden(night, new Date("2026-01-01T22:00:00"), "child")).toBe(
      true
    )
    expect(isNightListHidden(night, new Date("2026-01-01T22:30:00"), "child")).toBe(
      true
    )
    expect(isNightListHidden(night, new Date("2026-01-01T23:00:00"), "child")).toBe(
      false
    )
  })
  it("hides across midnight (child only)", () => {
    const night = { enabled: true, start: "22:00", end: "07:00" }
    expect(isNightListHidden(night, new Date("2026-01-01T21:00:00"), "child")).toBe(
      false
    )
    expect(isNightListHidden(night, new Date("2026-01-01T23:00:00"), "child")).toBe(
      true
    )
    expect(isNightListHidden(night, new Date("2026-01-01T04:00:00"), "child")).toBe(
      true
    )
    expect(isNightListHidden(night, new Date("2026-01-01T08:00:00"), "child")).toBe(
      false
    )
  })
})

describe("isPrivateChatHidden", () => {
  const base = { peerKey: "u1", isPrivate: true, allowlistIds: new Set<string>() as ReadonlySet<string> }

  it("parent mode never hides", () => {
    expect(
      isPrivateChatHidden({
        ...base,
        isContact: false,
        blockUnknownPrivate: true,
        appMode: "parent",
      })
    ).toBe(false)
  })
  it("hides non-contact not allowlisted in child", () => {
    expect(
      isPrivateChatHidden({
        ...base,
        isContact: false,
        blockUnknownPrivate: true,
        appMode: "child",
      })
    ).toBe(true)
  })
  it("does not hide contact", () => {
    expect(
      isPrivateChatHidden({
        ...base,
        isContact: true,
        blockUnknownPrivate: true,
        appMode: "child",
      })
    ).toBe(false)
  })
  it("allowlist allows", () => {
    const allow = new Set<string>(["u1"])
    expect(
      isPrivateChatHidden({
        ...base,
        isContact: false,
        allowlistIds: allow,
        blockUnknownPrivate: true,
        appMode: "child",
      })
    ).toBe(false)
  })
})

describe("isPrivateOmittedInChildListForDeny", () => {
  it("omits in child when peer is denied; never in parent", () => {
    const denied = new Set<string>(["p1"])
    expect(
      isPrivateOmittedInChildListForDeny("child", true, "p1", denied)
    ).toBe(true)
    expect(
      isPrivateOmittedInChildListForDeny("parent", true, "p1", denied)
    ).toBe(false)
    expect(
      isPrivateOmittedInChildListForDeny("child", true, "p2", denied)
    ).toBe(false)
  })
  it("non-private dialogs are not omitted", () => {
    const denied = new Set<string>(["g1"])
    expect(
      isPrivateOmittedInChildListForDeny("child", false, "g1", denied)
    ).toBe(false)
  })
})
