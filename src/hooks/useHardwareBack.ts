import { useEffect, useRef } from "react"

type StackEntry = { token: symbol; onClose: () => void }

let stack: StackEntry[] = []
let suppressCount = 0
let armed = false
let armedTimer: ReturnType<typeof setTimeout> | null = null
let rootArmedListener: ((armed: boolean) => void) | null = null
let seq = 0

const ARM_WINDOW_MS = 2000

function setArmed(next: boolean) {
  armed = next
  rootArmedListener?.(next)
}

function clearArmedTimer() {
  if (armedTimer != null) {
    clearTimeout(armedTimer)
    armedTimer = null
  }
}

// Distinct URL per call -- see decision #4 / "Testing risk notes".
function pushEntry(state: Record<string, unknown>) {
  seq += 1
  history.pushState(state, "", `#hb-${seq}`)
}

function handlePopState() {
  if (suppressCount > 0) {
    suppressCount -= 1
    return
  }
  if (stack.length > 0) {
    const top = stack.pop() as StackEntry
    top.onClose()
    return
  }
  if (armed) {
    clearArmedTimer()
    setArmed(false)
    // See decision #3: this extra history.back() is what makes the SECOND press
    // the one that exits, not the third. Suppressed so its popstate isn't
    // mistaken for a fresh Back press.
    suppressCount += 1
    history.back()
    return
  }
  setArmed(true)
  pushEntry({ hwBackSentinel: true })
  armedTimer = setTimeout(() => {
    armedTimer = null
    setArmed(false)
  }, ARM_WINDOW_MS)
}

/** Call once, in a MainShell-level useEffect (MainShell mounts once per signed-in
 *  session -- see src/App.tsx). Returns a cleanup fn for MainShell unmount (sign-out). */
export function installHardwareBackRoot(onRootArmedChange: (armed: boolean) => void): () => void {
  stack = []
  suppressCount = 0
  armed = false
  clearArmedTimer()
  rootArmedListener = onRootArmedChange
  window.addEventListener("popstate", handlePopState)
  pushEntry({ hwBackSentinel: true })
  return () => {
    window.removeEventListener("popstate", handlePopState)
    clearArmedTimer()
    rootArmedListener = null
  }
}

/** Registers `onClose` on the hardware-back LIFO stack while `active` is true.
 *  Call once inside whichever component/scope owns the open boolean + close
 *  callback for a given layer -- see "Integration points" for the full list. */
export function useHardwareBackLayer(active: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return
    const token = Symbol("hardware-back-layer")
    stack.push({ token, onClose: () => onCloseRef.current() })
    pushEntry({ hwBackLayer: true })
    if (armed) {
      clearArmedTimer()
      setArmed(false)
    }
    return () => {
      const idx = stack.findIndex((e) => e.token === token)
      if (idx === -1) return // already popped by a real Back press
      const isTop = idx === stack.length - 1
      stack.splice(idx, 1)
      if (isTop) {
        suppressCount += 1
        history.back() // reconcile (AC4)
      }
      // else: out-of-LIFO-order close -- soft-degrade, not expected in practice
    }
  }, [active])
}

/** Test-only: resets all module-level state between test cases. */
export function __resetHardwareBackForTests(): void {
  stack = []
  suppressCount = 0
  armed = false
  clearArmedTimer()
  rootArmedListener = null
}
