import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { __resetHardwareBackForTests } from "./useHardwareBack"
import { useBodyScrollLockAndEscape } from "./useBodyScrollLockAndEscape"

/**
 * Tests for src/hooks/useBodyScrollLockAndEscape.ts
 *
 * Root cause: having `onClose` in the useEffect dep array causes the scroll-lock
 * cleanup+relock cycle to run on every parent re-render that produces a new
 * `onClose` reference, briefly unlocking the body scroll while an overlay is open.
 *
 * Fix: stabilise `onClose` via a ref so the lock effect only re-runs when `open`
 * actually changes.
 *
 * Testing note on AC4: In jsdom React runs effects synchronously, so the brief
 * overflow="" → overflow="hidden" cycle from the bug is masked by the time any
 * assertion runs. The discriminating observable is instead the number of
 * document.addEventListener("keydown") calls — with the FIX the listener is
 * registered exactly once (on open); with the BUG it is re-registered on every
 * onClose identity change (cleanup removes old listener, effect re-adds new one).
 */

describe("useBodyScrollLockAndEscape", () => {
  beforeEach(() => {
    // Reset body overflow before each test
    document.body.style.overflow = ""
    // Reset hardware-back module state so stack entries from previous tests
    // do not leak into the next test via the shared module singleton.
    __resetHardwareBackForTests()
  })

  describe("AC1 — open=false: no scroll lock", () => {
    it("does not set body overflow to hidden when initially closed", () => {
      const onClose = vi.fn()
      renderHook(() => useBodyScrollLockAndEscape(false, onClose))
      expect(document.body.style.overflow).not.toBe("hidden")
    })
  })

  describe("AC2 — open=true: scroll is locked", () => {
    it("sets body overflow to hidden when open", () => {
      const onClose = vi.fn()
      renderHook(() => useBodyScrollLockAndEscape(true, onClose))
      expect(document.body.style.overflow).toBe("hidden")
    })
  })

  describe("AC3 — open true→false: scroll is restored", () => {
    it("restores body overflow when open transitions from true to false", () => {
      document.body.style.overflow = ""
      const onClose = vi.fn()
      const { rerender } = renderHook(
        ({ open }: { open: boolean }) => useBodyScrollLockAndEscape(open, onClose),
        { initialProps: { open: true } },
      )
      expect(document.body.style.overflow).toBe("hidden")

      rerender({ open: false })
      expect(document.body.style.overflow).toBe("")
    })

    it("restores the pre-open overflow value (not always empty string)", () => {
      document.body.style.overflow = "scroll"
      const onClose = vi.fn()
      const { rerender } = renderHook(
        ({ open }: { open: boolean }) => useBodyScrollLockAndEscape(open, onClose),
        { initialProps: { open: true } },
      )
      expect(document.body.style.overflow).toBe("hidden")

      rerender({ open: false })
      expect(document.body.style.overflow).toBe("scroll")
      document.body.style.overflow = "" // cleanup
    })
  })

  describe("AC4 — onClose reference change while open: no extra lock cycles", () => {
    it("does not re-register the keydown listener when only onClose reference changes", () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()

      // Spy on document.addEventListener to count keydown registrations.
      // With the FIX:  listener is registered once (on open) and NOT re-registered
      //               when onClose changes — count stays at the initial value.
      // With the BUG:  effect re-runs when onClose changes → cleanup deregisters the
      //               old listener, new effect registers a new one → count increments.
      const addSpy = vi.spyOn(document, "addEventListener")

      const { rerender } = renderHook(
        ({ onClose }: { onClose: () => void }) =>
          useBodyScrollLockAndEscape(true, onClose),
        { initialProps: { onClose: fn1 } },
      )

      const keydownCountAfterOpen = addSpy.mock.calls.filter(
        (c) => c[0] === "keydown",
      ).length
      // At least one registration should have occurred when opening
      expect(keydownCountAfterOpen).toBeGreaterThan(0)

      act(() => {
        rerender({ onClose: fn2 })
      })

      const keydownCountAfterOnCloseChange = addSpy.mock.calls.filter(
        (c) => c[0] === "keydown",
      ).length

      // With the FIX: no extra registration — count is unchanged
      expect(keydownCountAfterOnCloseChange).toBe(keydownCountAfterOpen)

      // Overflow must still be locked
      expect(document.body.style.overflow).toBe("hidden")

      addSpy.mockRestore()
    })
  })

  describe("AC5 — Escape while open: calls onClose", () => {
    it("calls onClose when Escape is pressed and open=true", () => {
      const onClose = vi.fn()
      renderHook(() => useBodyScrollLockAndEscape(true, onClose))

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("calls the latest onClose when it changes between Escape presses", () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()

      const { rerender } = renderHook(
        ({ onClose }: { onClose: () => void }) =>
          useBodyScrollLockAndEscape(true, onClose),
        { initialProps: { onClose: fn1 } },
      )

      act(() => {
        rerender({ onClose: fn2 })
      })
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      // Must call the NEW callback, not the stale one
      expect(fn2).toHaveBeenCalledTimes(1)
      expect(fn1).not.toHaveBeenCalled()
    })
  })

  describe("AC6 — Escape while closed: does NOT call onClose", () => {
    it("does not call onClose when Escape is pressed and open=false", () => {
      const onClose = vi.fn()
      renderHook(() => useBodyScrollLockAndEscape(false, onClose))

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      expect(onClose).not.toHaveBeenCalled()
    })

    it("does not call onClose after closing (open false→true→false)", () => {
      const onClose = vi.fn()
      const { rerender } = renderHook(
        ({ open }: { open: boolean }) => useBodyScrollLockAndEscape(open, onClose),
        { initialProps: { open: true } },
      )

      rerender({ open: false })
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe("cleanup on unmount", () => {
    it("restores body overflow when the hook unmounts while open", async () => {
      const onClose = vi.fn()
      const { unmount } = renderHook(() => useBodyScrollLockAndEscape(true, onClose))

      expect(document.body.style.overflow).toBe("hidden")

      // Wrap in act so React flushes all effect cleanups synchronously before we check
      await act(async () => {
        unmount()
      })

      expect(document.body.style.overflow).toBe("")
    })

    it("removes the keydown listener on unmount (no stale handler)", async () => {
      const onClose = vi.fn()
      const { unmount } = renderHook(() => useBodyScrollLockAndEscape(true, onClose))

      await act(async () => {
        unmount()
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
