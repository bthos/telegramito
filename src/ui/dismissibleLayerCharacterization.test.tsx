/**
 * Behavior-freeze characterization for dismissible-layer refactor.
 * Feature: .tlk/features/2026-07-27-app-code-refactor-cross-cutting/
 */
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { __resetHardwareBackForTests } from "../hooks/useHardwareBack"
import { ImageLightbox } from "./ImageLightbox"
import { PinDialog } from "./PinDialog"

vi.mock("../context/ParentalContext", () => ({
  useParentalSettings: () => ({
    settings: {
      version: 1 as const,
      appMode: "parent" as const,
      blockUnknownPrivate: false,
      hideLinkPreviews: false,
      filterGifs: false,
      allowOutgoingMedia: true,
      nightMode: { enabled: false, start: "22:00", end: "07:00" },
      allowlistIds: [],
      pinHash: null,
      pinSalt: null,
      locale: null,
      logLevel: "warn" as const,
      showMessageIds: false,
      morningDayMailEnabled: true,
      waxSealSendEnabled: false,
      eveningSummaryPreciseEnabled: false,
    },
    setSettings: vi.fn(),
    parentUnlocked: false,
    setParentUnlocked: vi.fn(),
    reload: vi.fn(),
  }),
}))

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          imageViewerClose: "Close",
          imageViewerBackdrop: "Close enlarged image",
          pin: { title: "Enter PIN", unlock: "Unlock", wrong: "Wrong PIN" },
          common: { cancel: "Cancel" },
        },
      },
    },
  })
  return inst
}

describe("dismissible layer characterization", () => {
  beforeEach(() => {
    document.body.style.overflow = ""
    __resetHardwareBackForTests()
  })

  it("ImageLightbox — Escape calls onClose (AC1)", () => {
    const onClose = vi.fn()
    render(
      <ImageLightbox
        url="blob:test"
        onClose={onClose}
        labelClose="Close"
        labelBackdrop="Close enlarged image"
      />,
    )

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("ImageLightbox — locks body scroll while open (AC1)", () => {
    render(
      <ImageLightbox
        url="blob:test"
        onClose={vi.fn()}
        labelClose="Close"
        labelBackdrop="Close enlarged image"
      />,
    )
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("PinDialog — hardware back stack registers while open (AC1)", async () => {
    const inst = await miniI18n()
    const pushSpy = vi.spyOn(history, "pushState")

    render(
      <I18nextProvider i18n={inst}>
        <PinDialog open onClose={vi.fn()} onSuccess={vi.fn()} />
      </I18nextProvider>,
    )

    expect(pushSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("PinDialog — does not lock body scroll (popover pattern) (AC1)", async () => {
    const inst = await miniI18n()
    render(
      <I18nextProvider i18n={inst}>
        <PinDialog open onClose={vi.fn()} onSuccess={vi.fn()} />
      </I18nextProvider>,
    )
    expect(document.body.style.overflow).not.toBe("hidden")
  })

  it("PinDialog — cancel button calls onClose (AC1)", async () => {
    const inst = await miniI18n()
    const onClose = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <PinDialog open onClose={onClose} onSuccess={vi.fn()} />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
