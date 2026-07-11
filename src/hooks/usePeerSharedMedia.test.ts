import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Api, type TelegramClient } from "telegram"

import { usePeerSharedMedia, _clearSharedMediaCacheForTest } from "./usePeerSharedMedia"

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

describe("usePeerSharedMedia", () => {
  beforeEach(() => {
    _clearSharedMediaCacheForTest()
  })

  it("returns idle state when entity is null — no fetch issued", () => {
    const client = makeClient()
    const { result } = renderHook(() => usePeerSharedMedia(null, client, "photos"))
    expect(result.current).toEqual({ items: [], loading: false, error: null })
    expect((client.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it("returns idle state when client is null — no fetch issued", () => {
    const entity = makeEntity(1)
    const { result } = renderHook(() => usePeerSharedMedia(entity, null, "photos"))
    expect(result.current).toEqual({ items: [], loading: false, error: null })
  })

  it("fetches with InputMessagesFilterPhotos for 'photos' tab", async () => {
    const entity = makeEntity(10)
    const msgs = [makeMessage(1), makeMessage(2)]
    const client = makeClient(msgs)

    const { result } = renderHook(() => usePeerSharedMedia(entity, client, "photos"))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.items).toHaveLength(2)
    const gm = client.getMessages as ReturnType<typeof vi.fn>
    expect(gm.mock.calls[0]?.[1]?.filter).toBeInstanceOf(Api.InputMessagesFilterPhotos)
  })

  it("fetches with InputMessagesFilterVideo for 'videos' tab", async () => {
    const entity = makeEntity(11)
    const msgs = [makeMessage(3)]
    const client = makeClient(msgs)

    const { result } = renderHook(() => usePeerSharedMedia(entity, client, "videos"))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const gm = client.getMessages as ReturnType<typeof vi.fn>
    expect(gm.mock.calls[0]?.[1]?.filter).toBeInstanceOf(Api.InputMessagesFilterVideo)
  })

  it("fetches with InputMessagesFilterDocument for 'files' tab", async () => {
    const entity = makeEntity(12)
    const msgs = [makeMessage(4)]
    const client = makeClient(msgs)

    const { result } = renderHook(() => usePeerSharedMedia(entity, client, "files"))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const gm = client.getMessages as ReturnType<typeof vi.fn>
    expect(gm.mock.calls[0]?.[1]?.filter).toBeInstanceOf(Api.InputMessagesFilterDocument)
  })

  it("fetches with InputMessagesFilterUrl for 'links' tab", async () => {
    const entity = makeEntity(13)
    const msgs = [makeMessage(5)]
    const client = makeClient(msgs)

    const { result } = renderHook(() => usePeerSharedMedia(entity, client, "links"))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const gm = client.getMessages as ReturnType<typeof vi.fn>
    expect(gm.mock.calls[0]?.[1]?.filter).toBeInstanceOf(Api.InputMessagesFilterUrl)
  })

  it("caches per entity+tab — second call for same combo does not re-fetch", async () => {
    const entity = makeEntity(20)
    const msgs = [makeMessage(10)]
    const client = makeClient(msgs)

    const { result: r1 } = renderHook(() => usePeerSharedMedia(entity, client, "photos"))
    await waitFor(() => expect(r1.current.loading).toBe(false))
    expect(r1.current.items).toHaveLength(1)

    const client2 = makeClient([makeMessage(99)])
    const { result: r2 } = renderHook(() => usePeerSharedMedia(entity, client2, "photos"))
    // Should serve from cache immediately, no new fetch
    expect(r2.current.loading).toBe(false)
    expect(r2.current.items).toHaveLength(1)
    expect((client2.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })

  it("caches are isolated per tab — photos cache does not affect files cache", async () => {
    const entity = makeEntity(30)
    const photosClient = makeClient([makeMessage(100), makeMessage(101)])
    const filesClient = makeClient([makeMessage(200)])

    const { result: rPhotos } = renderHook(() =>
      usePeerSharedMedia(entity, photosClient, "photos"),
    )
    await waitFor(() => expect(rPhotos.current.loading).toBe(false))
    expect(rPhotos.current.items).toHaveLength(2)

    const { result: rFiles } = renderHook(() =>
      usePeerSharedMedia(entity, filesClient, "files"),
    )
    await waitFor(() => expect(rFiles.current.loading).toBe(false))
    expect(rFiles.current.items).toHaveLength(1)

    // Photos cache still intact
    expect(rPhotos.current.items).toHaveLength(2)
  })

  it("sets error string and returns empty items when getMessages throws", async () => {
    const entity = makeEntity(40)
    const client = makeClient(undefined, true)

    const { result } = renderHook(() => usePeerSharedMedia(entity, client, "photos"))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.items).toHaveLength(0)
  })

  it("filters out non-Message entries (e.g. MessageService) from raw result", async () => {
    const entity = makeEntity(50)
    const mixed = [
      makeMessage(1),
      { className: "MessageService", id: 2 } as unknown as Api.Message,
      makeMessage(3),
    ]
    const client = makeClient(mixed)

    const { result } = renderHook(() => usePeerSharedMedia(entity, client, "files"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items.every((m) => m.className === "Message")).toBe(true)
    expect(result.current.items).toHaveLength(2)
  })

  it("shows loading=true during fetch then resolves", async () => {
    const entity = makeEntity(60)
    const msgs = [makeMessage(1)]
    const client = makeClient(msgs)

    const { result } = renderHook(() => usePeerSharedMedia(entity, client, "links"))
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })
})
