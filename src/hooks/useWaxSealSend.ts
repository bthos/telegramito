import { useCallback, useEffect, useRef, useState } from "react"

const SEAL_DELAY_MS = 5000
const LONG_PRESS_MS = 400

export type WaxSealSendState = {
  sealing: boolean
  undoOpen: boolean
  undoSecondsLeft: number
}

export function useWaxSealSend(opts: {
  enabled: boolean
  reducedMotion: boolean
  onSend: () => void | Promise<void>
}): {
  state: WaxSealSendState
  onSendPointerDown: () => void
  onSendPointerUp: () => void
  onSendPointerLeave: () => void
  onSendClick: () => void
  cancelSeal: () => void
} {
  const { enabled, reducedMotion, onSend } = opts
  const [sealing, setSealing] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0)

  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const sealEndsAtRef = useRef(0)

  const clearTimers = useCallback(() => {
    if (sendTimerRef.current) {
      clearTimeout(sendTimerRef.current)
      sendTimerRef.current = null
    }
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const resetSealUi = useCallback(() => {
    clearTimers()
    setSealing(false)
    setUndoOpen(false)
    setUndoSecondsLeft(0)
    sealEndsAtRef.current = 0
  }, [clearTimers])

  const cancelSeal = useCallback(() => {
    longPressFiredRef.current = false
    resetSealUi()
  }, [resetSealUi])

  const flushSend = useCallback(() => {
    resetSealUi()
    void onSend()
  }, [onSend, resetSealUi])

  const startSealCountdown = useCallback(() => {
    longPressFiredRef.current = true
    setSealing(!reducedMotion)
    setUndoOpen(true)
    sealEndsAtRef.current = Date.now() + SEAL_DELAY_MS
    setUndoSecondsLeft(Math.ceil(SEAL_DELAY_MS / 1000))

    tickTimerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((sealEndsAtRef.current - Date.now()) / 1000))
      setUndoSecondsLeft(left)
      if (left <= 0 && tickTimerRef.current) {
        clearInterval(tickTimerRef.current)
        tickTimerRef.current = null
      }
    }, 200)

    sendTimerRef.current = setTimeout(() => {
      flushSend()
    }, SEAL_DELAY_MS)
  }, [flushSend, reducedMotion])

  const onSendPointerDown = useCallback(() => {
    if (!enabled) {
      return
    }
    longPressFiredRef.current = false
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      startSealCountdown()
    }, LONG_PRESS_MS)
  }, [enabled, startSealCountdown])

  const onSendPointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const onSendPointerLeave = onSendPointerUp

  const onSendClick = useCallback(() => {
    if (!enabled) {
      void onSend()
      return
    }
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    void onSend()
  }, [enabled, onSend])

  useEffect(() => () => {
    clearTimers()
  }, [clearTimers])

  return {
    state: { sealing, undoOpen, undoSecondsLeft },
    onSendPointerDown,
    onSendPointerUp,
    onSendPointerLeave,
    onSendClick,
    cancelSeal,
  }
}
