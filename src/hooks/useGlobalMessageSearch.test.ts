import { Api } from "teleproto"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useGlobalMessageSearch } from "./useGlobalMessageSearch"

vi.mock("teleproto/Utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("teleproto/Utils")>()
  return {
    ...actual,
    getPeerId: (peer: unknown) => {
      if (peer && typeof peer === "object") {
        const p = peer as { userId?: number | { toString: () => string }; id?: number }
        if ("userId" in p && p.userId != null) {
          return String(p.userId)
        }
        if ("id" in p && p.id != null) {
          return String(p.id)
        }
      }
      return "0"
    },
  }
})

function makeMessage(id: number, userId: number, text: string): Api.Message {
  return {
    className: "Message",
    id,
    message: text,
    date: 0,
    out: false,
    peerId: { className: "PeerUser", userId },
  } as unknown as Api.Message
}

function makeClient(invokeImpl?: ReturnType<typeof vi.fn>) {
  return {
    invoke:
      invokeImpl ??
      vi.fn().mockResolvedValue({
        className: "messages.Messages",
        messages: [],
        users: [],
        chats: [],
      }),
  } as never
}

describe("useGlobalMessageSearch", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("does not invoke SearchGlobal when query is shorter than 2 characters", () => {
    vi.useFakeTimers()
    const client = makeClient()
    const { result } = renderHook(() =>
      useGlobalMessageSearch({ client, query: "a" }),
    )
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect((client as { invoke: ReturnType<typeof vi.fn> }).invoke).not.toHaveBeenCalled()
    expect(result.current.results).toEqual([])
  })

  it("debounces and invokes SearchGlobal with the expected request shape", async () => {
    vi.useFakeTimers()
    const msg = makeMessage(7, 42, "brunch sunday")
    const client = makeClient(
      vi.fn().mockResolvedValue({
        className: "messages.Messages",
        messages: [msg],
        users: [{ className: "User", id: 42, firstName: "Mira" }],
        chats: [],
      }),
    )
    const { result } = renderHook(() =>
      useGlobalMessageSearch({ client, query: "brunch" }),
    )
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    const invoke = (client as { invoke: ReturnType<typeof vi.fn> }).invoke
    expect(invoke).toHaveBeenCalledTimes(1)
    const req = invoke.mock.calls[0]![0] as Api.messages.SearchGlobal
    expect(req.className).toBe("messages.SearchGlobal")
    expect(req.q).toBe("brunch")
    expect(req.limit).toBe(40)
    expect((req.offsetPeer as Api.TypeInputPeer | undefined)?.className).toBe("InputPeerEmpty")
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0]!.peerDisplayName).toBe("Mira")
    expect(result.current.results[0]!.message.id).toBe(7)
    expect(result.current.error).toBeNull()
  })

  it("does not request when disabled", () => {
    vi.useFakeTimers()
    const client = makeClient()
    renderHook(() =>
      useGlobalMessageSearch({ client, query: "hello", disabled: true }),
    )
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect((client as { invoke: ReturnType<typeof vi.fn> }).invoke).not.toHaveBeenCalled()
  })

  it("sets error on invoke failure and retry re-issues the request", async () => {
    vi.useFakeTimers()
    // Non-transient errors so withTransientRetry does not consume extra mock calls.
    const invoke = vi
      .fn()
      .mockRejectedValueOnce(new Error("permanent_search_failure"))
      .mockResolvedValueOnce({
        className: "messages.Messages",
        messages: [makeMessage(1, 9, "ok")],
        users: [{ className: "User", id: 9, firstName: "Ada" }],
        chats: [],
      })
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useGlobalMessageSearch({ client, query: "ok" }),
    )
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.error).toBe("search_failed")
    expect(result.current.results).toEqual([])

    await act(async () => {
      result.current.retry()
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.results).toHaveLength(1)
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it("changing query mid-flight discards the stale in-flight response", async () => {
    vi.useFakeTimers()
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
          messages: [makeMessage(2, 2, "second")],
          users: [{ className: "User", id: 2, firstName: "Two" }],
          chats: [],
        }),
      )
    const client = makeClient(invoke)

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useGlobalMessageSearch({ client, query }),
      { initialProps: { query: "aa" } },
    )
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
    })
    rerender({ query: "bb" })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    act(() => {
      resolveFirst({
        className: "messages.Messages",
        messages: [makeMessage(1, 1, "first")],
        users: [{ className: "User", id: 1, firstName: "One" }],
        chats: [],
      })
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.results.map((h) => h.message.id)).toEqual([2])
  })
})
