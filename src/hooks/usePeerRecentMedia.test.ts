import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"

import { usePeerRecentMedia, _clearMediaCacheForTest } from "./usePeerRecentMedia"

function makeEntity(id: number): Api.User {
  return { className: "User", id: BigInt(id) } as unknown as Api.User
}

function makeMessage(id: number): Api.Message {
  return { className: "Message", id } as unknown as Api.Message
}

function makeClient(
  messages?: object[],
  shouldThrow = false,
): TelegramClient {
  return {
    getMessages: shouldThrow
      ? vi.fn().mockRejectedValue(new Error("network error"))
      : vi.fn().mockResolvedValue(messages ?? []),
  } as unknown as TelegramClient
}

describe("usePeerRecentMedia", () => {
  beforeEach(() => {
    _clearMediaCacheForTest()
  })

  it("returns idle state when entity is null — no fetch issued", () => {
    const client = makeClient()
    const { result } = renderHook(() => usePeerRecentMedia(null, client))
    expect(result.current).toEqual({ items: [], loading: false, error: null })
    expect((client.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it("returns idle state when client is null — no fetch issued", () => {
    const entity = makeEntity(1)
    const { result } = renderHook(() => usePeerRecentMedia(entity, null))
    expect(result.current).toEqual({ items: [], loading: false, error: null })
  })

  it("shows loading=true during fetch then resolves with items", async () => {
    const entity = makeEntity(42)
    const msgs = [makeMessage(100), makeMessage(200)]
    const client = makeClient(msgs)

    const { result } = renderHook(() => usePeerRecentMedia(entity, client))
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.items).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it("sets error string and returns empty items when getMessages throws", async () => {
    const entity = makeEntity(7)
    const client = makeClient(undefined, true)

    const { result } = renderHook(() => usePeerRecentMedia(entity, client))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBeTruthy()
    expect(result.current.items).toHaveLength(0)
  })

  it("serves from cache on second call — getMessages not called again", async () => {
    const entity = makeEntity(99)
    const msgs = [makeMessage(1)]
    const client = makeClient(msgs)

    const { result: r1 } = renderHook(() => usePeerRecentMedia(entity, client))
    await waitFor(() => expect(r1.current.loading).toBe(false))
    expect(r1.current.items).toHaveLength(1)

    const client2 = makeClient(msgs)
    const { result: r2 } = renderHook(() => usePeerRecentMedia(entity, client2))
    expect(r2.current.loading).toBe(false)
    expect(r2.current.items).toHaveLength(1)
    expect((client2.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it("filters out non-Message entries (e.g. MessageService) from raw result", async () => {
    const entity = makeEntity(55)
    const mixed = [
      makeMessage(1),
      { className: "MessageService", id: 2 } as unknown as Api.Message,
      makeMessage(3),
    ]
    const client = makeClient(mixed)

    const { result } = renderHook(() => usePeerRecentMedia(entity, client))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items.every((m) => m.className === "Message")).toBe(true)
    expect(result.current.items).toHaveLength(2)
  })
})
