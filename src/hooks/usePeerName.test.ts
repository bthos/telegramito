import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"

import { usePeerName, _clearCacheForTest } from "./usePeerName"

function makePeerUser(userId: number): Api.PeerUser {
  return { className: "PeerUser", userId: BigInt(userId) } as unknown as Api.PeerUser
}

function makeClient(resolvedEntity?: object, shouldThrow = false): TelegramClient {
  return {
    getEntity: shouldThrow
      ? vi.fn().mockRejectedValue(new Error("network"))
      : vi.fn().mockResolvedValue(resolvedEntity ?? null),
  } as unknown as TelegramClient
}

describe("usePeerName", () => {
  beforeEach(() => {
    _clearCacheForTest()
  })

  it("returns empty string when peerId is undefined", () => {
    const client = makeClient()
    const { result } = renderHook(() => usePeerName(undefined, client))
    expect(result.current).toBe("")
  })

  it("returns empty string when client is null", () => {
    const peer = makePeerUser(1)
    const { result } = renderHook(() => usePeerName(peer, null))
    expect(result.current).toBe("")
  })

  it("returns display name when entity resolves", async () => {
    const peer = makePeerUser(42)
    const entity = { className: "User", firstName: "Alice", lastName: "Smith" }
    const client = makeClient(entity)
    const { result } = renderHook(() => usePeerName(peer, client))

    await waitFor(() => {
      expect(result.current).toBe("Alice Smith")
    })
  })

  it("returns cached name on second call with same peerId (no duplicate fetch)", async () => {
    const peer = makePeerUser(99)
    const entity = { className: "User", firstName: "Bob" }
    const client = makeClient(entity)

    const { result: r1 } = renderHook(() => usePeerName(peer, client))
    await waitFor(() => expect(r1.current).toBe("Bob"))

    // Second hook instance — getEntity should NOT be called again
    const client2 = makeClient(entity)
    const { result: r2 } = renderHook(() => usePeerName(peer, client2))
    expect(r2.current).toBe("Bob") // synchronous from cache
    expect((client2.getEntity as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it("returns empty string when entity resolution throws", async () => {
    const peer = makePeerUser(7)
    const client = makeClient(undefined, true)
    const { result } = renderHook(() => usePeerName(peer, client))

    // Wait a tick for the effect to settle; should remain ""
    await waitFor(() => {
      expect(result.current).toBe("")
    })
  })

  it("returns channel title for PeerChannel entity", async () => {
    const peer = {
      className: "PeerChannel",
      channelId: BigInt(500),
    } as unknown as Api.PeerChannel
    const entity = { className: "Channel", title: "News Channel" }
    const client = makeClient(entity)
    const { result } = renderHook(() => usePeerName(peer, client))

    await waitFor(() => {
      expect(result.current).toBe("News Channel")
    })
  })
})
