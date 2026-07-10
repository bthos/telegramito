import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useWaxSealSend } from "./useWaxSealSend"

describe("useWaxSealSend", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("short click sends immediately when enabled", () => {
    const onSend = vi.fn()
    const { result } = renderHook(() =>
      useWaxSealSend({ enabled: true, reducedMotion: true, onSend }),
    )

    act(() => {
      result.current.onSendClick()
    })

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(result.current.state.undoOpen).toBe(false)
  })

  it("long press opens undo then sends after 5s", () => {
    const onSend = vi.fn()
    const { result } = renderHook(() =>
      useWaxSealSend({ enabled: true, reducedMotion: true, onSend }),
    )

    act(() => {
      result.current.onSendPointerDown()
      vi.advanceTimersByTime(400)
    })

    expect(result.current.state.undoOpen).toBe(true)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(result.current.state.undoOpen).toBe(false)
  })

  it("cancelSeal aborts delayed send", () => {
    const onSend = vi.fn()
    const { result } = renderHook(() =>
      useWaxSealSend({ enabled: true, reducedMotion: true, onSend }),
    )

    act(() => {
      result.current.onSendPointerDown()
      vi.advanceTimersByTime(400)
      result.current.cancelSeal()
      vi.advanceTimersByTime(6000)
    })

    expect(onSend).not.toHaveBeenCalled()
  })
})
