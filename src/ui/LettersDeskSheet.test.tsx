import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { Api } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { ThemeProvider } from "../context/ThemeContext"
import { LettersDeskSheet } from "./LettersDeskSheet"

vi.mock("./SettingsView", () => ({
  SettingsView: () => <div>Settings subpage</div>,
}))

vi.mock("./RequestsView", () => ({
  RequestsView: () => <div>Requests subpage</div>,
}))

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

function stubDialog(opts: { name: string; draft?: Api.TypeDraftMessage }): Dialog {
  const dr = {
    className: "Dialog" as const,
    peer: { className: "PeerUser", userId: BigInt(1) } as unknown as Api.TypePeer,
    topMessage: 0,
    readInboxMaxId: 0,
    readOutboxMaxId: 0,
    unreadCount: 0,
    unreadMentionsCount: 0,
    unreadReactionsCount: 0,
    unreadPollVotesCount: 0,
    draft: opts.draft,
  } as Api.Dialog
  return {
    isUser: true,
    name: opts.name,
    title: opts.name,
    entity: { id: BigInt(1), firstName: opts.name } as unknown as Api.User,
    dialog: dr,
  } as unknown as Dialog
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
          mode: { child: "Child", parent: "Parent", headerToggle: "Mode", label: "Profile", deskHint: "Child filters; parent unlocks controls." },
          letters: {
            deskSheetAria: "Desk sheet",
            deskSheetTitle: "Desk",
            deskUnfinishedTitle: "On the desk · unfinished letters",
            deskHouseholdTitle: "Household",
            deskDraftTo: "To · {{name}}",
            deskPendingRequests: "{{count}} new",
            draftsEmptyTitle: "The desk is clear — no unfinished letters",
            continueLetter: "Continue letter",
            coReadingDeskTitle: "To discuss together",
            coReadingDeviceOnlyHint: "Bookmarks stay on this device only.",
          },
          common: { back: "Back" },
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
            dialogs={[]}
            canEditSettings
            onRequestPin={vi.fn()}
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

  it("shows unfinished draft cards on the desk", async () => {
    const inst = await miniI18n()
    const onDraftSelect = vi.fn()
    const onClose = vi.fn()
    const draftDialog = stubDialog({
      name: "Mom",
      draft: new Api.DraftMessage({ message: "Dear Mom, unfinished pie", date: 2 }),
    })
    render(
      <I18nextProvider i18n={inst}>
        <ThemeProvider>
          <LettersDeskSheet
            open
            onClose={onClose}
            appMode="child"
            onAppMode={vi.fn()}
            showParentRows={false}
            pendingRequestCount={0}
            dialogs={[draftDialog]}
            canEditSettings={false}
            onRequestPin={vi.fn()}
            onSignOut={vi.fn()}
            onDraftSelect={onDraftSelect}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    expect(screen.getByRole("heading", { name: "On the desk · unfinished letters" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Household" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Continue letter/i }))
    expect(onDraftSelect).toHaveBeenCalledWith(draftDialog)
    expect(onClose).toHaveBeenCalled()
  })

  it("shows empty state when there are no drafts", async () => {
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
            dialogs={[]}
            canEditSettings={false}
            onRequestPin={vi.fn()}
            onSignOut={vi.fn()}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    expect(screen.getByText("The desk is clear — no unfinished letters")).toBeTruthy()
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
            dialogs={[]}
            canEditSettings
            onRequestPin={vi.fn()}
            onSignOut={vi.fn()}
            coReadingBookmarks={[]}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    expect(screen.getByText("Bookmarks stay on this device only.")).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "To discuss together" })).toBeTruthy()
  })

  it("opens settings inside the desk with a back control", async () => {
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
            dialogs={[]}
            canEditSettings
            onRequestPin={vi.fn()}
            onSignOut={vi.fn()}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    expect(screen.getByRole("dialog", { name: "Desk > Settings" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "Desk > Settings" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy()
    expect(screen.getByText("Settings subpage")).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 2, name: "Household" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByRole("heading", { level: 2, name: "Household" })).toBeTruthy()
  })

  it("hides settings in child mode", async () => {
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
            dialogs={[]}
            canEditSettings={false}
            onRequestPin={vi.fn()}
            onSignOut={vi.fn()}
          />
        </ThemeProvider>
      </I18nextProvider>,
    )

    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull()
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
            dialogs={[]}
            canEditSettings
            onRequestPin={vi.fn()}
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
