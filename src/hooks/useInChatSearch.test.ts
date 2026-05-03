import { Api } from "telegram"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useInChatSearch } from "./useInChatSearch"

const entity = { className: "User" } as never

function makeClient() {
  return {
    getMessages: vi.fn().mockResolvedValue([] as Api.Message[]),
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
    ).toHaveBeenCalledWith(entity, { search: "hi", limit: 40 })
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
})
