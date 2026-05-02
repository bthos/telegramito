import { describe, expect, it } from "vitest"
import { isPeerNotifyMuted } from "./peerMute"

describe("isPeerNotifyMuted", () => {
  it("returns false when muteUntil is in the past", () => {
    expect(isPeerNotifyMuted(1_000, 2_000)).toBe(false)
  })

  it("returns true when muteUntil is in the future", () => {
    expect(isPeerNotifyMuted(4_000, 2_000)).toBe(true)
  })
})
