import { Api } from "teleproto"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useInChatSearch } from "./useInChatSearch"

const entity = { className: "User" } as never
const inputPeer = { className: "InputPeerUser" }

function forumMessage(id: number): Api.Message {
  return { className: "Message", id, message: `msg ${id}`, date: 0, out: false } as Api.Message
}

function makeClient(
  overrides: { invokeResult?: unknown; getInputEntity?: ReturnType<typeof vi.fn> } = {},
) {
  return {
    getMessages: vi.fn().mockResolvedValue([] as Api.Message[]),
    getInputEntity: overrides.getInputEntity ?? vi.fn().mockResolvedValue(inputPeer),
    invoke: vi.fn().mockResolvedValue(
      overrides.invokeResult ?? {
        className: "messages.ChannelMessages",
        messages: [],
        users: [],
        chats: [],
      },
    ),
  } as never
}

describe("useInChatSearch", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("does not call getMessages when query is shorter than 2 characters", () => {
    vi.useFakeTimers()
    const client = makeClient()
    const { result } = renderHook(() =>
      useInChatSearch({ client, entity, disabled: false }),
    )
    act(() => {
      result.current.setQuery("a")
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(
      (client as { getMessages: ReturnType<typeof vi.fn> }).getMessages,
    ).not.toHaveBeenCalled()
  })

  it("debounces and calls getMessages with search when query has 2+ characters", async () => {
    vi.useFakeTimers()
    const client = makeClient()
    const { result } = renderHook(() =>
      useInChatSearch({ client, entity, disabled: false }),
    )
    act(() => {
      result.current.setQuery("hi")
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
    })
    expect(
      (client as { getMessages: ReturnType<typeof vi.fn> }).getMessages,
    ).toHaveBeenCalledWith(entity, { search: "hi", limit: 40, offsetId: 0 })
  })

  it("pages past 40 hits: a full page offers more, and the next page continues from the oldest hit", async () => {
    vi.useFakeTimers()
    const client = makeClient()
    const getMessages = (client as { getMessages: ReturnType<typeof vi.fn> }).getMessages
    // Newest first, ids 100..61 (a full page of 40), then a short page 60..51.
    const page = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        ...forumMessage(from - i),
        date: from - i,
      }))
    getMessages.mockResolvedValueOnce(page(100, 40)).mockResolvedValueOnce(page(60, 10))
    const { result } = renderHook(() =>
      useInChatSearch({ client, entity, disabled: false }),
    )
    act(() => {
      result.current.setQuery("hi")
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.results).toHaveLength(40)
    expect(result.current.hasMore).toBe(true)

    await act(async () => {
      result.current.loadMore()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(getMessages).toHaveBeenLastCalledWith(entity, { search: "hi", limit: 40, offsetId: 61 })
    expect(result.current.results).toHaveLength(50)
    expect(result.current.results[0]!.id).toBe(100)
    expect(result.current.results[49]!.id).toBe(51)
    expect(result.current.hasMore).toBe(false)
  })

  it("lists hits newest first so «1 / N» is the latest match", async () => {
    vi.useFakeTimers()
    const client = makeClient()
    // Telegram returns newest first; the hook must not turn that into oldest first.
    ;(client as { getMessages: ReturnType<typeof vi.fn> }).getMessages.mockResolvedValue([
      { ...forumMessage(30), date: 300 },
      { ...forumMessage(20), date: 200 },
      { ...forumMessage(10), date: 100 },
    ])
    const { result } = renderHook(() =>
      useInChatSearch({ client, entity, disabled: false }),
    )
    act(() => {
      result.current.setQuery("hi")
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.results.map((m) => m.id)).toEqual([30, 20, 10])
  })

  it("does not request when disabled", () => {
    vi.useFakeTimers()
    const client = makeClient()
    const { result } = renderHook(() =>
      useInChatSearch({ client, entity, disabled: true }),
    )
    act(() => {
      result.current.setQuery("hello")
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(
      (client as { getMessages: ReturnType<typeof vi.fn> }).getMessages,
    ).not.toHaveBeenCalled()
  })

  it("does not request when disabled even with a topicId set", () => {
    vi.useFakeTimers()
    const client = makeClient()
    const { result } = renderHook(() =>
      useInChatSearch({ client, entity, disabled: true, topicId: 7 }),
    )
    act(() => {
      result.current.setQuery("hello")
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect((client as { invoke: ReturnType<typeof vi.fn> }).invoke).not.toHaveBeenCalled()
    expect(
      (client as { getMessages: ReturnType<typeof vi.fn> }).getMessages,
    ).not.toHaveBeenCalled()
  })

  it("when topicId is set, searches via raw messages.Search with topMsgId, not getMessages", async () => {
    vi.useFakeTimers()
    const client = makeClient({
      invokeResult: {
        className: "messages.ChannelMessages",
        messages: [forumMessage(101), forumMessage(102)],
        users: [],
        chats: [],
      },
    })
    const { result } = renderHook(() =>
      useInChatSearch({ client, entity, disabled: false, topicId: 42 }),
    )
    act(() => {
      result.current.setQuery("login")
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    const c = client as {
      invoke: ReturnType<typeof vi.fn>
      getMessages: ReturnType<typeof vi.fn>
    }
    expect(c.getMessages).not.toHaveBeenCalled()
    expect(c.invoke).toHaveBeenCalledTimes(1)
    const req = c.invoke.mock.calls[0][0] as Api.messages.Search
    expect(req.className).toBe("messages.Search")
    expect(req.q).toBe("login")
    expect(req.topMsgId).toBe(42)
    expect(result.current.results.map((m) => m.id)).toEqual([101, 102])
  })

  it("changing topicId mid-search discards the stale in-flight response", async () => {
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
          className: "messages.ChannelMessages",
          messages: [forumMessage(9)],
          users: [],
          chats: [],
        }),
      )
    const client = { getMessages: vi.fn(), getInputEntity: vi.fn().mockResolvedValue(inputPeer), invoke } as never

    const { result, rerender } = renderHook(
      ({ topicId }: { topicId: number }) =>
        useInChatSearch({ client, entity, disabled: false, topicId }),
      { initialProps: { topicId: 1 } },
    )
    act(() => {
      result.current.setQuery("hi")
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
    })
    // First request (topic 1) is now in flight, unresolved.
    rerender({ topicId: 2 })
    act(() => {
      result.current.setQuery("hi ")
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    // Second request (topic 2) resolves first.
    act(() => {
      resolveFirst({
        className: "messages.ChannelMessages",
        messages: [forumMessage(1)],
        users: [],
        chats: [],
      })
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.results.map((m) => m.id)).toEqual([9])
  })
})
