import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { Api } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { defaultParentalSettings } from "../parental/types"
import { RequestsView } from "./RequestsView"

const setPeerAccessState = vi.fn()
const getPendingRequests = vi.fn()

vi.mock("../context/ParentalContext", () => ({
  useParentalSettings: () => ({
    settings: {
      ...defaultParentalSettings(),
      allowlistIds: ["42"],
    },
    setSettings: vi.fn(),
  }),
}))

vi.mock("../parental/storage", () => ({
  getPendingRequests: (...args: unknown[]) => getPendingRequests(...args),
  setPeerAccessState: (...args: unknown[]) => setPeerAccessState(...args),
}))

function dlg(isUser: boolean, title: string, id: number): Dialog {
  const entity = isUser
    ? ({
        className: "User",
        id: BigInt(id),
        accessHash: 1n,
        firstName: title,
      } as unknown as Api.User)
    : ({
        className: "Channel",
        id: BigInt(id),
        accessHash: 1n,
        title,
        broadcast: true,
        megagroup: false,
      } as unknown as Api.Channel)
  return {
    isUser,
    name: title,
    title,
    entity,
    dialog: {
      className: "Dialog",
      peer: {} as Api.TypePeer,
      topMessage: 0,
      readInboxMaxId: 0,
      readOutboxMaxId: 0,
      unreadCount: 0,
    } as Api.Dialog,
  } as unknown as Dialog
}

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          requests: {
            emptyDialogs: "No chats to show",
            emptyFilter: "No chats match the selected status.",
            filterLabel: "Filter by access status",
            filterAll: "All",
            filterAllowed: "Allowed",
            filterPending: "Pending",
            filterDenied: "Denied",
            groupLabel: "Access for {{name}}",
            ariaAllowed: "Allowed in child mode (allowlist)",
            ariaPending: "Not on allowlist — child must request or is waiting",
            ariaDenied: "Denied for this chat in child mode",
          },
        },
      },
    },
  })
  return inst
}

describe("RequestsView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPendingRequests.mockResolvedValue([])
    setPeerAccessState.mockResolvedValue(defaultParentalSettings())
  })

  it("lists private chats and groups or channels", async () => {
    const inst = await miniI18n()
    const user = dlg(true, "Alice", 42)
    const channel = dlg(false, "Chollometro", 99)

    render(
      <I18nextProvider i18n={inst}>
        <RequestsView dialogs={[user, channel]} />
      </I18nextProvider>,
    )

    expect(screen.getByText("Alice")).toBeTruthy()
    expect(screen.getByText("Chollometro")).toBeTruthy()
  })

  it("lets parent change access state for a group or channel", async () => {
    const inst = await miniI18n()
    const channel = dlg(false, "Chollometro", 99)

    render(
      <I18nextProvider i18n={inst}>
        <RequestsView dialogs={[channel]} />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Denied for this chat in child mode" }))
    expect(setPeerAccessState).toHaveBeenCalledWith("99", "Chollometro", "denied")
  })

  it("lets parent change access state for an allowed private chat", async () => {
    const inst = await miniI18n()
    const user = dlg(true, "Alice", 42)

    render(
      <I18nextProvider i18n={inst}>
        <RequestsView dialogs={[user]} />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Not on allowlist — child must request or is waiting" }))
    expect(setPeerAccessState).toHaveBeenCalledWith("42", "Alice", "pending")
  })
})
