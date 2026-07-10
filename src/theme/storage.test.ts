import { afterEach, describe, expect, it, vi } from "vitest"
import { readThemePreference, THEME_STORAGE_KEY } from "./storage"

describe("readThemePreference (AC-P1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it("defaults to system when storage is empty", () => {
    expect(readThemePreference()).toBe("system")
  })

  it("defaults to system when storage is invalid", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia")
    expect(readThemePreference()).toBe("system")
  })

  it("returns stored light, dark, or system", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark")
    expect(readThemePreference()).toBe("dark")
    localStorage.setItem(THEME_STORAGE_KEY, "light")
    expect(readThemePreference()).toBe("light")
  })

  it("falls back to system when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(readThemePreference()).toBe("system")
  })
})
