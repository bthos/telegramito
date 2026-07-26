import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { SignOutConfirmDialog } from "./SignOutConfirmDialog"

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  )
}

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          signOut: "Sign out",
          signOutConfirmTitle: "Sign out?",
          signOutConfirmBody: "You'll need to sign in again to use Telegramito.",
          common: { cancel: "Cancel" },
        },
      },
    },
  })
  return inst
}

describe("SignOutConfirmDialog", () => {
  beforeEach(() => {
    stubMatchMedia()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders nothing when closed", async () => {
    const inst = await miniI18n()
    render(
      <I18nextProvider i18n={inst}>
        <SignOutConfirmDialog open={false} onConfirm={vi.fn()} onClose={vi.fn()} />
      </I18nextProvider>,
    )
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("asks for confirmation and only signs out when confirmed", async () => {
    const inst = await miniI18n()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <SignOutConfirmDialog open onConfirm={onConfirm} onClose={onClose} />
      </I18nextProvider>,
    )

    const dialog = screen.getByRole("dialog", { name: "Sign out?" })
    expect(dialog).toBeTruthy()
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("confirms sign-out on explicit confirm click", async () => {
    const inst = await miniI18n()
    const onConfirm = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <SignOutConfirmDialog open onConfirm={onConfirm} onClose={vi.fn()} />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("closes on Escape", async () => {
    const inst = await miniI18n()
    const onClose = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <SignOutConfirmDialog open onConfirm={vi.fn()} onClose={onClose} />
      </I18nextProvider>,
    )

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })
})
