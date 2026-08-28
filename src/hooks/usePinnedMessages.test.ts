import { Api } from "teleproto"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { usePinnedMessages } from "./usePinnedMessages"

const entityA = { className: "User", id: 1 } as never
const entityB = { className: "User", id: 2 } as never
const inputPeer = { className: "InputPeerUser" }

function pinnedMessage(id: number): Api.Message {
  return { className: "Message", id, message: `msg ${id}`, date: id, out: false } as Api.Message
}

function makeClient(messages: Api.Message[]) {
  return {
    getInputEntity: vi.fn().mockResolvedValue(inputPeer),
    invoke: vi.fn().mockResolvedValue({
      className: "messages.Messages",
      messages,
      users: [],
      chats: [],
    }),
  } as never
}

describe("usePinnedMessages", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("fetches pinned messages on mount", async () => {
    const client = makeClient([pinnedMessage(5), pinnedMessage(3)])
    const { result } = renderHook(() =>
      usePinnedMessages({ client, entity: entityA }),
    )
    await waitFor(() => {
      expect(result.current.pinned.map((m) => m.id)).toEqual([5, 3])
    })
    expect((client as { invoke: ReturnType<typeof vi.fn> }).invoke).toHaveBeenCalledTimes(1)
  })

  it("does not request when there is no client or entity", () => {
    const { result } = renderHook(() =>
      usePinnedMessages({ client: null, entity: entityA }),
    )
    expect(result.current.pinned).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it("re-fetches and discards a stale response when the entity changes mid-flight", async () => {
    let resolveFirst: (v: unknown) => void = () => {}
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const invoke = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() =>
        Promise.resolve({
          className: "messages.Messages",
          messages: [pinnedMessage(99)],
          users: [],
          chats: [],
        }),
      )
    const client = { getInputEntity: vi.fn().mockResolvedValue(inputPeer), invoke } as never

    const { result, rerender } = renderHook(
      ({ entity }: { entity: unknown }) => usePinnedMessages({ client, entity }),
      { initialProps: { entity: entityA as unknown } },
    )

    // Switch entity while the first request is still pending.
    rerender({ entity: entityB as unknown })

    // Now resolve the stale (first) request — it must be ignored.
    await act(async () => {
      resolveFirst({
        className: "messages.Messages",
        messages: [pinnedMessage(1)],
        users: [],
        chats: [],
      })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.pinned.map((m) => m.id)).toEqual([99])
    })
  })

  it("refresh() triggers a re-fetch", async () => {
    const client = makeClient([pinnedMessage(7)])
    const { result } = renderHook(() =>
      usePinnedMessages({ client, entity: entityA }),
    )
    await waitFor(() => {
      expect(result.current.pinned.map((m) => m.id)).toEqual([7])
    })
    act(() => {
      result.current.refresh()
    })
    await waitFor(() => {
      expect((client as { invoke: ReturnType<typeof vi.fn> }).invoke).toHaveBeenCalledTimes(2)
    })
  })

  it("sets error and empties results when the fetch rejects", async () => {
    const client = {
      getInputEntity: vi.fn().mockResolvedValue(inputPeer),
      invoke: vi.fn().mockRejectedValue(new Error("boom")),
    } as never
    const { result } = renderHook(() =>
      usePinnedMessages({ client, entity: entityA }),
    )
    await waitFor(() => {
      expect(result.current.error).toBe(true)
    })
    expect(result.current.pinned).toEqual([])
  })
})
