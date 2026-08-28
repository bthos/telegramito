import { renderHook, waitFor } from "@testing-library/react"
import { Buffer } from "buffer"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TelegramClient } from "teleproto"

import { _clearPeerPhotoCachesForTest, usePeerPhoto } from "./usePeerPhoto"

const { downloadProfilePhotoMock } = vi.hoisted(() => ({
  downloadProfilePhotoMock: vi.fn(),
}))

vi.mock("teleproto/client/downloads", () => ({
  downloadProfilePhoto: downloadProfilePhotoMock,
}))

function makeClient(): TelegramClient {
  return {} as unknown as TelegramClient
}

const sampleJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0x4a, 0x46])

describe("usePeerPhoto", () => {
  beforeEach(() => {
    _clearPeerPhotoCachesForTest()
    downloadProfilePhotoMock.mockReset()
  })

  it("returns null when peerId is null", () => {
    const client = makeClient()
    const { result } = renderHook(() => usePeerPhoto(null, client))
    expect(result.current).toBeNull()
  })

  it("returns null when client is null", () => {
    const { result } = renderHook(() => usePeerPhoto("u:1", null))
    expect(result.current).toBeNull()
  })

  it("resolves a blob: URL when download returns bytes", async () => {
    downloadProfilePhotoMock.mockResolvedValue(sampleJpeg)
    const client = makeClient()
    const { result } = renderHook(() => usePeerPhoto("u:55", client))

    await waitFor(() => {
      expect(result.current).toMatch(/^blob:/)
    })
    expect(downloadProfilePhotoMock).toHaveBeenCalledTimes(1)
  })

  it("does not call download again for the same peerId (cache hit)", async () => {
    downloadProfilePhotoMock.mockResolvedValue(sampleJpeg)
    const client = makeClient()
    const { result: r1 } = renderHook(() => usePeerPhoto("u:100", client))
    await waitFor(() => expect(r1.current).toMatch(/^blob:/))
    expect(downloadProfilePhotoMock).toHaveBeenCalledTimes(1)

    const { result: r2 } = renderHook(() => usePeerPhoto("u:100", makeClient()))
    expect(r2.current).toMatch(/^blob:/)
    expect(downloadProfilePhotoMock).toHaveBeenCalledTimes(1)
  })

  it("deduplicates in-flight fetches for the same peerId", async () => {
    downloadProfilePhotoMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(sampleJpeg)
          }, 20)
        }),
    )
    const client = makeClient()
    renderHook(() => usePeerPhoto("u:200", client))
    renderHook(() => usePeerPhoto("u:200", client))

    await waitFor(() => {
      expect(downloadProfilePhotoMock).toHaveBeenCalledTimes(1)
    })
  })

  it("returns null when download throws", async () => {
    downloadProfilePhotoMock.mockRejectedValue(new Error("fail"))
    const client = makeClient()
    const { result } = renderHook(() => usePeerPhoto("u:300", client))

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })

  it("returns null when download returns empty buffer", async () => {
    downloadProfilePhotoMock.mockResolvedValue(Buffer.alloc(0))
    const client = makeClient()
    const { result } = renderHook(() => usePeerPhoto("u:400", client))

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })
})
