import { afterEach, describe, expect, it, vi } from "vitest"
import {
  MAX_RECENT_EMOJI,
  RECENT_EMOJI_STORAGE_KEY,
  loadRecentEmojis,
  saveRecentEmoji,
} from "./recentEmojis"

describe("recentEmojis", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("returns [] when key missing", () => {
    expect(loadRecentEmojis()).toEqual([])
  })

  it("parses valid JSON array of strings", () => {
    localStorage.setItem(
      RECENT_EMOJI_STORAGE_KEY,
      JSON.stringify(["😀", "👍"]),
    )
    expect(loadRecentEmojis()).toEqual(["😀", "👍"])
  })

  it("returns [] on invalid JSON", () => {
    localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, "not-json")
    expect(loadRecentEmojis()).toEqual([])
  })

  it("prepends, dedupes, and caps at MAX_RECENT_EMOJI", () => {
    const base = Array.from({ length: MAX_RECENT_EMOJI }, (_, i) => `${i}`)
    const next = saveRecentEmoji("new", base)
    expect(next[0]).toBe("new")
    expect(next.length).toBe(MAX_RECENT_EMOJI)
    expect(next.filter((x) => x === "new").length).toBe(1)
    expect(localStorage.getItem(RECENT_EMOJI_STORAGE_KEY)).toBe(
      JSON.stringify(next),
    )
  })

  it("moves existing emoji to front when picked again", () => {
    const next = saveRecentEmoji("b", ["a", "b", "c"])
    expect(next).toEqual(["b", "a", "c"])
  })
})
