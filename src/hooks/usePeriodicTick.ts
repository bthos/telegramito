import { useEffect, useState } from "react"

/**
 * Bumps internal state every `intervalMs` so descendants can refresh
 * time-sensitive UI (e.g. dialog list timestamps). Returns the timestamp of
 * the last tick — a stable value between ticks, unlike `new Date()` called
 * directly in render, which would produce a new identity on every render.
 */
export function usePeriodicTick(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
    }, intervalMs)
    return () => {
      clearInterval(id)
    }
  }, [intervalMs])
  return now
}
