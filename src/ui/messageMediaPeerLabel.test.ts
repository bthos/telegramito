/**
 * Characterization for shared peer label helper (AC6 dedupe).
 * Feature: .tlk/features/2026-07-27-app-code-refactor-media/
 */
import { describe, expect, it } from "vitest"
import { messageMediaPeerLabel } from "./messageMediaPeerLabel"

describe("messageMediaPeerLabel", () => {
  it("returns ? for undefined peer", () => {
    expect(messageMediaPeerLabel(undefined)).toBe("?")
  })

  it("labels PeerUser", () => {
    expect(
      messageMediaPeerLabel({ className: "PeerUser", userId: BigInt(42) } as unknown as import("telegram").Api.PeerUser),
    ).toBe("user:42")
  })

  it("labels PeerChannel", () => {
    expect(
      messageMediaPeerLabel({ className: "PeerChannel", channelId: BigInt(7) } as unknown as import("telegram").Api.PeerChannel),
    ).toBe("channel:7")
  })

  it("labels PeerChat", () => {
    expect(
      messageMediaPeerLabel({ className: "PeerChat", chatId: BigInt(3) } as unknown as import("telegram").Api.PeerChat),
    ).toBe("chat:3")
  })

  it("returns ? for unknown peer class", () => {
    expect(messageMediaPeerLabel({ className: "PeerSecret" } as unknown as import("telegram").Api.TypePeer)).toBe("?")
  })
})
