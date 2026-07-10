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
          theme: {
            label: "Theme",
            hint: "Newsprint desk; system follows device.",
            light: "Light (newsprint)",
            system: "System (device)",
            dark: "Dark (newsprint)",
          },
          mode: { child: "Child", parent: "Parent", headerToggle: "Mode", label: "Profile" },
          letters: {
            deskSheetAria: "Desk sheet",
            deskSheetTitle: "Desk",
            deskPendingRequests: "{{count}} new",
            deskEveningPrecise: "Sharper evening edition",
            coReadingDeskTitle: "To discuss together",
            coReadingDeviceOnlyHint: "Bookmarks stay on this device only.",
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

  it("shows evening precise toggle in parent mode (AC-U6)", async () => {
    const inst = await miniI18n()
    const onEvening = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersDeskSheet
            open
            onClose={vi.fn()}
            appMode="parent"
            onAppMode={vi.fn()}
            showParentRows
            pendingRequestCount={0}
            onOpenSettings={vi.fn()}
            onOpenRequests={vi.fn()}
            onSignOut={vi.fn()}
            eveningSummaryPreciseEnabled={false}
            onEveningSummaryPreciseEnabled={onEvening}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    const toggle = screen.getByRole("switch", { name: "Sharper evening edition" })
    expect(toggle.getAttribute("aria-checked")).toBe("false")
    fireEvent.click(toggle)
    expect(onEvening).toHaveBeenCalledWith(true)
  })

  it("shows device-only hint for co-reading in parent mode (AC-S1)", async () => {
    const inst = await miniI18n()
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersDeskSheet
            open
            onClose={vi.fn()}
            appMode="parent"
            onAppMode={vi.fn()}
            showParentRows
            pendingRequestCount={0}
            onOpenSettings={vi.fn()}
            onOpenRequests={vi.fn()}
            onSignOut={vi.fn()}
            coReadingBookmarks={[]}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    const hint = screen.getByRole("status")
    expect(hint.textContent).toBe("Bookmarks stay on this device only.")
    expect(screen.getByRole("heading", { level: 3, name: "To discuss together" })).toBeTruthy()
  })

  it("hides co-reading section in child mode", async () => {
    const inst = await miniI18n()
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersDeskSheet
            open
            onClose={vi.fn()}
            appMode="child"
            onAppMode={vi.fn()}
            showParentRows={false}
            pendingRequestCount={0}
            onOpenSettings={vi.fn()}
            onOpenRequests={vi.fn()}
            onSignOut={vi.fn()}
            coReadingBookmarks={[
              {
                id: "1",
                chatId: "u:1",
                messageId: 9,
                chatTitle: "Ada",
                preview: "Hello",
                createdAt: 1,
              },
            ]}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    expect(screen.queryByText("To discuss together")).toBeNull()
    expect(screen.queryByText("Bookmarks stay on this device only.")).toBeNull()
  })
})
