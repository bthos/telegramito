/**
 * ephemeral-messages (AC-E2 / AC-E4): the ribbon shows when the open chat has
 * received ephemeral traffic and hides once dismissed — for the rest of the
 * session, per peer.
 */
import { renderHook, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockCtx = { ephemeralPeerKeys: new Set<string>(), ephemeralTick: 0 }
vi.mock("../context/TelegramContext", () => ({
  useTelegram: () => mockCtx,
}))

import { useEphemeralNotice } from "./useEphemeralNotice"

afterEach(() => {
  mockCtx.ephemeralPeerKeys = new Set()
  mockCtx.ephemeralTick = 0
})

describe("useEphemeralNotice", () => {
  it("hidden when the peer has had no ephemeral traffic", () => {
    const { result } = renderHook(() => useEphemeralNotice("c:1"))
    expect(result.current.show).toBe(false)
  })

  it("shows once the peer is in the ephemeral set, then stays hidden after dismiss", () => {
    mockCtx.ephemeralPeerKeys = new Set(["c:1"])
    const { result, rerender } = renderHook(() => useEphemeralNotice("c:1"))
    expect(result.current.show).toBe(true)

    act(() => result.current.dismiss())
    expect(result.current.show).toBe(false)

    // still dismissed on a fresh mount (session-scoped)
    rerender()
    expect(result.current.show).toBe(false)
    const second = renderHook(() => useEphemeralNotice("c:1"))
    expect(second.result.current.show).toBe(false)
  })

  it("dismiss is per-peer — a different chat still shows", () => {
    mockCtx.ephemeralPeerKeys = new Set(["c:1", "c:2"])
    const a = renderHook(() => useEphemeralNotice("c:2"))
    // c:1 was dismissed by the previous test's module-level Set; c:2 is fresh
    expect(a.result.current.show).toBe(true)
  })

  it("no peer key ⇒ never shows", () => {
    mockCtx.ephemeralPeerKeys = new Set([""])
    const { result } = renderHook(() => useEphemeralNotice(""))
    expect(result.current.show).toBe(false)
    const n = renderHook(() => useEphemeralNotice(null))
    expect(n.result.current.show).toBe(false)
  })
})
