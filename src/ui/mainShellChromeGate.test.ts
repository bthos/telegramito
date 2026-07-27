/**
 * Characterization of MainShell chrome visibility gates (AC1 / AC6).
 * Feature: .tlk/features/2026-07-27-app-code-refactor-mainshell/
 */
import { describe, expect, it } from "vitest"
import {
  mastheadChromeHideEnabled,
  showCompactMasthead,
  showDesktopCirclesButton,
  showMobileTabBar,
  showTabletDayMailButton,
} from "./mainShellChromeGate"

describe("showMobileTabBar", () => {
  it("is true only on compact chats list without selection or desk sheet", () => {
    expect(
      showMobileTabBar({
        mobileCompact: true,
        tab: "chats",
        hasSelectedChat: false,
        deskSheetOpen: false,
      }),
    ).toBe(true)
  })

  it("is false when a chat is open, desk is open, or not on chats tab", () => {
    const base = {
      mobileCompact: true,
      tab: "chats" as const,
      hasSelectedChat: false,
      deskSheetOpen: false,
    }
    expect(showMobileTabBar({ ...base, hasSelectedChat: true })).toBe(false)
    expect(showMobileTabBar({ ...base, deskSheetOpen: true })).toBe(false)
    expect(showMobileTabBar({ ...base, tab: "settings" })).toBe(false)
    expect(showMobileTabBar({ ...base, mobileCompact: false })).toBe(false)
  })
})

describe("showCompactMasthead", () => {
  it("is true on compact chats list without open chat", () => {
    expect(
      showCompactMasthead({
        mobileCompact: true,
        tab: "chats",
        hasSelectedChat: false,
      }),
    ).toBe(true)
  })

  it("is false when chat is open or not compact chats", () => {
    expect(
      showCompactMasthead({
        mobileCompact: true,
        tab: "chats",
        hasSelectedChat: true,
      }),
    ).toBe(false)
    expect(
      showCompactMasthead({
        mobileCompact: false,
        tab: "chats",
        hasSelectedChat: false,
      }),
    ).toBe(false)
  })
})

describe("mastheadChromeHideEnabled", () => {
  it("enables scroll-hide on letters and dayMail tabs when compact masthead shows", () => {
    expect(
      mastheadChromeHideEnabled({ showCompactMasthead: true, mobileTab: "letters" }),
    ).toBe(true)
    expect(
      mastheadChromeHideEnabled({ showCompactMasthead: true, mobileTab: "dayMail" }),
    ).toBe(true)
  })

  it("is false on circles tab or when masthead is not compact", () => {
    expect(
      mastheadChromeHideEnabled({ showCompactMasthead: true, mobileTab: "circles" }),
    ).toBe(false)
    expect(
      mastheadChromeHideEnabled({ showCompactMasthead: false, mobileTab: "letters" }),
    ).toBe(false)
  })
})

describe("showTabletDayMailButton", () => {
  it("shows between compact and three-col breakpoints", () => {
    expect(
      showTabletDayMailButton({ mobileCompact: false, lettersThreeCol: false }),
    ).toBe(true)
    expect(
      showTabletDayMailButton({ mobileCompact: true, lettersThreeCol: false }),
    ).toBe(false)
    expect(
      showTabletDayMailButton({ mobileCompact: false, lettersThreeCol: true }),
    ).toBe(false)
  })
})

describe("showDesktopCirclesButton", () => {
  it("shows on tablet and desktop, not on compact mobile", () => {
    expect(showDesktopCirclesButton({ mobileCompact: false })).toBe(true)
    expect(showDesktopCirclesButton({ mobileCompact: true })).toBe(false)
  })
})
