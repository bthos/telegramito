/**
 * Unit tests for the IntersectionObserver sentinel logic introduced in ChatList.
 *
 * IntersectionObserver requires real layout and is unavailable in jsdom, so we
 * test the pure callback conditions and observer-creation guard conditions
 * directly — the same pattern used in chatInitialLoad.test.ts.
 */
import { describe, expect, it, vi } from "vitest"

/**
 * Mirrors the observer callback condition in ChatList:
 *   if (entries[0].isIntersecting) loadMoreDialogs()
 */
function runObserverCallback(
  isIntersecting: boolean,
  loadMoreDialogs: () => void,
): void {
  if (isIntersecting) {
    loadMoreDialogs()
  }
}

/**
 * Mirrors the observer-creation guard in ChatList's useEffect:
 *   if (!sentinel || !hasMoreDialogs || !loadMoreDialogs || dialogsLoadingMore) return
 */
function shouldCreateObserver(
  hasSentinel: boolean,
  hasMoreDialogs: boolean,
  loadMoreDialogs: (() => void) | undefined,
  dialogsLoadingMore: boolean,
): boolean {
  return Boolean(hasSentinel && hasMoreDialogs && loadMoreDialogs && !dialogsLoadingMore)
}

describe("chatList — IntersectionObserver callback", () => {
  it("calls loadMoreDialogs when sentinel is intersecting", () => {
    const fn = vi.fn()
    runObserverCallback(true, fn)
    expect(fn).toHaveBeenCalledOnce()
  })

  it("does NOT call loadMoreDialogs when sentinel is not intersecting", () => {
    const fn = vi.fn()
    runObserverCallback(false, fn)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe("chatList — observer creation guard", () => {
  it("creates observer when all conditions are met", () => {
    expect(shouldCreateObserver(true, true, vi.fn(), false)).toBe(true)
  })

  it("does NOT create observer when hasMoreDialogs is false (AC4)", () => {
    expect(shouldCreateObserver(true, false, vi.fn(), false)).toBe(false)
  })

  it("does NOT create observer while dialogsLoadingMore is true (AC3)", () => {
    expect(shouldCreateObserver(true, true, vi.fn(), true)).toBe(false)
  })

  it("does NOT create observer when loadMoreDialogs callback is undefined", () => {
    expect(shouldCreateObserver(true, true, undefined, false)).toBe(false)
  })

  it("does NOT create observer when sentinel ref is null", () => {
    expect(shouldCreateObserver(false, true, vi.fn(), false)).toBe(false)
  })
})
