import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { ThemeProvider } from "../context/ThemeContext"
import { LettersDeskSheet } from "./LettersDeskSheet"

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
          settings: "Settings",
          requestsTab: "Requests",
          signOut: "Sign out",
          theme: { label: "Theme", light: "Light", system: "System", dark: "Dark" },
          mode: { child: "Child", parent: "Parent", headerToggle: "Mode", label: "Profile" },
          letters: {
            deskSheetAria: "Desk sheet",
            deskSheetTitle: "Desk",
            deskPendingRequests: "{{count}} new",
          },
        },
      },
    },
  })
  return inst
}

describe("LettersDeskSheet", () => {
  beforeEach(() => {
    stubMatchMedia()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("focuses first control and traps tab focus while open", async () => {
    const inst = await miniI18n()
    const onClose = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersDeskSheet
            open
            onClose={onClose}
            appMode="parent"
            onAppMode={vi.fn()}
            showParentRows
            pendingRequestCount={2}
            onOpenSettings={vi.fn()}
            onOpenRequests={vi.fn()}
            onSignOut={vi.fn()}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    const dialog = screen.getByRole("dialog", { name: "Desk sheet" })
    expect(dialog).toBeTruthy()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })
})
