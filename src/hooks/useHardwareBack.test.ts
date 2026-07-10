import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  installHardwareBackRoot,
  useHardwareBackLayer,
  __resetHardwareBackForTests,
} from "./useHardwareBack"

/**
 * These tests exercise src/hooks/useHardwareBack.ts, the LIFO back-stack + root
 * exit-confirmation mechanism designed in
 * .tlk/features/2026-07-10-hardware-back-button/tech-plan.md.
 *
 * jsdom notes (verified empirically before writing this suite -- see tech-plan.md
 * "Testing risk" section):
 *  - `history.pushState` never fires `popstate` (matches real browsers).
 *  - `history.back()` DOES fire `popstate` in jsdom, but only reliably when each
 *    `pushState` call used a distinct URL -- same-URL pushState/back cycles did not
 *    fire popstate in this jsdom version. The implementation must pass a distinct
 *    URL (e.g. an incrementing hash fragment) to every pushState call.
 *  - `history.back()` is asynchronous and its delay is not fixed (a hardcoded
 *    sleep was flaky under full-suite load, since history depth/system load
 *    shift the delivery delay) -- tests must wait for the actual `popstate`
 *    event rather than an arbitrary timeout.
 */

/** Resolves the next time a `popstate` event is delivered anywhere. */
function nextPopState(): Promise<void> {
  return new Promise((resolve) => {
    window.addEventListener("popstate", () => resolve(), { once: true })
  })
}

/** Simulates one hardware/gesture/browser Back press and waits for jsdom to
 *  actually deliver the resulting popstate before returning. */
async function pressBack() {
  const delivered = nextPopState()
  history.back()
  await delivered
}

describe("useHardwareBack", () => {
  beforeEach(() => {
    __resetHardwareBackForTests()
  })

  describe("single layer (AC1)", () => {
    it("Back closes the open layer by calling its onClose, and does not touch anything else", async () => {
      const onClose = vi.fn()
      const rootArmedChange = vi.fn()
      const uninstallRoot = installHardwareBackRoot(rootArmedChange)

      renderHook(() => useHardwareBackLayer(true, onClose))

      await pressBack()

      expect(onClose).toHaveBeenCalledTimes(1)
      // Closing a layer must not also arm/show the root exit-confirmation.
      expect(rootArmedChange).not.toHaveBeenCalledWith(true)

      uninstallRoot()
    })

    it("does nothing while the layer is not active (active=false never registers)", async () => {
      const onClose = vi.fn()
      const uninstallRoot = installHardwareBackRoot(vi.fn())

      renderHook(() => useHardwareBackLayer(false, onClose))
      await pressBack()

      expect(onClose).not.toHaveBeenCalled()
      uninstallRoot()
    })
  })

  describe("nested layers, LIFO by open-order (AC2)", () => {
    it("closes the most-recently-opened layer first, one per Back press", async () => {
      const onCloseOuter = vi.fn()
      const onCloseInner = vi.fn()
      const uninstallRoot = installHardwareBackRoot(vi.fn())

      // Outer layer opens first (e.g. an open chat), inner opens second (e.g. an
      // emoji picker on top of it) -- mirrors AC2's example.
      renderHook(() => useHardwareBackLayer(true, onCloseOuter))
      renderHook(() => useHardwareBackLayer(true, onCloseInner))

      await pressBack()
      expect(onCloseInner).toHaveBeenCalledTimes(1)
      expect(onCloseOuter).not.toHaveBeenCalled()

      await pressBack()
      expect(onCloseOuter).toHaveBeenCalledTimes(1)

      uninstallRoot()
    })
  })

  describe("reconciliation on non-Back close (AC4)", () => {
    it("closing the top layer via its own affordance (unmount) pops the stack and consumes its history entry, so the next real Back closes the layer beneath -- not a stale/duplicate one", async () => {
      const onCloseOuter = vi.fn()
      const onCloseInner = vi.fn()
      const uninstallRoot = installHardwareBackRoot(vi.fn())

      const outer = renderHook(() => useHardwareBackLayer(true, onCloseOuter))
      const inner = renderHook(() => useHardwareBackLayer(true, onCloseInner))

      // Inner layer is closed by its own tap/backdrop/Escape handler, not by Back:
      // the caller invokes onCloseInner itself, then unmounts (open -> false).
      const reconciled = nextPopState()
      await act(async () => {
        inner.unmount()
        await reconciled // let the reconciling history.back() actually settle
      })
      expect(onCloseInner).not.toHaveBeenCalled() // Back must not *also* fire it

      // A real Back press now must close the outer layer (not no-op on a stale
      // inner entry, and not skip past the outer layer).
      await pressBack()
      expect(onCloseOuter).toHaveBeenCalledTimes(1)

      // outer was already popped by the real Back press above (stack is empty),
      // so this unmount is a no-op reconciliation-wise -- no dangling history.back().
      outer.unmount()
      uninstallRoot()
    })

    it("closing a layer via Back does not double-fire if the component also unmounts afterward", async () => {
      const onClose = vi.fn()
      const uninstallRoot = installHardwareBackRoot(vi.fn())

      const layer = renderHook(() => useHardwareBackLayer(true, onClose))
      await pressBack()
      expect(onClose).toHaveBeenCalledTimes(1)

      // Parent reacts to onClose by setting active=false / unmounting -- must not
      // re-invoke onClose or desync the (already-empty) stack.
      layer.unmount()
      await pressBack() // nothing left to close at this layer; falls through to root

      expect(onClose).toHaveBeenCalledTimes(1)
      uninstallRoot()
    })
  })

  describe("root: press-back-again-to-exit (AC5)", () => {
    it("first Back at root arms the exit-confirmation and does not exit", async () => {
      const onRootArmedChange = vi.fn()
      const uninstallRoot = installHardwareBackRoot(onRootArmedChange)
      const backSpy = vi.spyOn(history, "back")

      await pressBack()

      expect(onRootArmedChange).toHaveBeenCalledWith(true)
      // First press only consumes the initial sentinel -- it must not issue a
      // *second* history.back() (that second call is what would actually exit).
      expect(backSpy).toHaveBeenCalledTimes(1)

      uninstallRoot()
      backSpy.mockRestore()
    })

    it("a second Back within the window exits (issues an additional history.back())", async () => {
      const onRootArmedChange = vi.fn()
      const uninstallRoot = installHardwareBackRoot(onRootArmedChange)
      const backSpy = vi.spyOn(history, "back")

      await pressBack() // first press: arms -- 1 call to history.back() so far (pressBack's own simulated press)
      expect(onRootArmedChange).toHaveBeenLastCalledWith(true)

      await pressBack() // second, confirming press -- pressBack adds a 2nd simulated call
      expect(onRootArmedChange).toHaveBeenLastCalledWith(false)
      // Exiting = the confirm branch deliberately issuing its OWN extra history.back()
      // to continue past our sentinel (see useHardwareBack.ts comment on the `armed`
      // branch). Total = 2 simulated presses (from pressBack() above) + 1 internal
      // exit call = 3 -- not 2. (A version that only reached 2 here would mean the
      // confirm branch made zero internal calls, i.e. the "exit" was never issued --
      // see the false-fix note in tech-plan.md's "Testing risk" section.)
      expect(backSpy).toHaveBeenCalledTimes(3)

      uninstallRoot()
      backSpy.mockRestore()
    })

    it("letting the window lapse resets to fresh first-press behavior on the next Back", async () => {
      vi.useFakeTimers()
      const onRootArmedChange = vi.fn()
      const uninstallRoot = installHardwareBackRoot(onRootArmedChange)

      let delivered = nextPopState()
      history.back()
      await vi.advanceTimersByTimeAsync(50)
      await delivered
      expect(onRootArmedChange).toHaveBeenLastCalledWith(true)

      // Window lapses (2000ms proposed in ux-design.md) with no second press.
      await vi.advanceTimersByTimeAsync(2100)
      expect(onRootArmedChange).toHaveBeenLastCalledWith(false)

      // Next Back is treated as a fresh first press: arms again, does not exit.
      const backSpy = vi.spyOn(history, "back")
      delivered = nextPopState()
      history.back()
      await vi.advanceTimersByTimeAsync(50)
      await delivered
      expect(onRootArmedChange).toHaveBeenLastCalledWith(true)
      expect(backSpy).toHaveBeenCalledTimes(1) // sentinel-consuming call only, not exit

      uninstallRoot()
      backSpy.mockRestore()
      vi.useRealTimers()
    })
  })

  describe("root arming is cancelled by navigating away instead of pressing Back again", () => {
    it("opening a new layer while the exit-confirmation is armed disarms it", async () => {
      const onRootArmedChange = vi.fn()
      const uninstallRoot = installHardwareBackRoot(onRootArmedChange)

      await pressBack() // arm the root toast
      expect(onRootArmedChange).toHaveBeenLastCalledWith(true)

      // User taps into e.g. an open chat instead of pressing Back again.
      const layer = renderHook(() => useHardwareBackLayer(true, vi.fn()))
      expect(onRootArmedChange).toHaveBeenLastCalledWith(false)

      // layer is still on top of the stack (never closed) -- unmounting it
      // triggers a reconciling history.back(); await its popstate so it can't
      // leak into a later test.
      const reconciled = nextPopState()
      layer.unmount()
      await reconciled
      uninstallRoot()
    })
  })
})
