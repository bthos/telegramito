import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { ThemeProvider } from "../context/ThemeContext"
import { LettersMasthead } from "./LettersMasthead"

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
          appName: "Telegramito",
          chats: "Chats",
          settings: "Settings",
          requestsTab: "Requests",
          signOut: "Sign out",
          chat: { search: "Search" },
          common: { close: "Close" },
          letters: {
            mastheadAria: "Letters header",
            navAria: "Correspondence",
            appNavAria: "App nav",
            write: "Write",
            deskSheetTitle: "Desk",
            tab: { letters: "Letters", drafts: "Drafts", returned: "Returned" },
          },
          mode: { child: "Child", parent: "Parent", headerToggle: "Mode", label: "Profile" },
          theme: {
            label: "Theme",
            hint: "Newsprint desk; system follows device.",
            light: "Light (newsprint)",
            system: "System (device)",
            dark: "Dark (newsprint)",
          },
        },
      },
    },
  })
  return inst
}

const baseProps = {
  dateLine: "Friday, tenth of July",
  correspondenceTab: "letters" as const,
  onCorrespondenceTab: vi.fn(),
  search: "",
  onSearchChange: vi.fn(),
  onWrite: vi.fn(),
  shellTab: "chats" as const,
  onShellTab: vi.fn(),
  showParentShellNav: true,
  appMode: "parent" as const,
  onAppMode: vi.fn(),
  onSignOut: vi.fn(),
}

describe("LettersMasthead compact", () => {
  beforeEach(() => {
    stubMatchMedia()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("compact rest state: exactly one icon button (search), no Desk button", async () => {
    const inst = await miniI18n()
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersMasthead
            {...baseProps}
            compact
          />
        </ThemeProvider>
      </I18nextProvider>,
    )
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBe(1)
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Desk" })).toBeNull()
    expect(screen.queryByText("Write")).toBeNull()
    expect(screen.queryByText("Settings")).toBeNull()
  })

  it("compact search-expanded: field and close button visible, no Desk button", async () => {
    const inst = await miniI18n()
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersMasthead
            {...baseProps}
            compact
            searchExpanded
            onSearchExpandedChange={vi.fn()}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )
    expect(screen.getByRole("searchbox")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Desk" })).toBeNull()
  })

  it("desktop masthead exposes Desk button on chats tab", async () => {
    const inst = await miniI18n()
    const onOpenDesk = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersMasthead {...baseProps} onOpenDesk={onOpenDesk} />
        </ThemeProvider>
      </I18nextProvider>,
    )
    const deskBtn = screen.getByRole("button", { name: "Desk" })
    expect(deskBtn).toBeTruthy()
    deskBtn.click()
    expect(onOpenDesk).toHaveBeenCalledTimes(1)
  })
})
