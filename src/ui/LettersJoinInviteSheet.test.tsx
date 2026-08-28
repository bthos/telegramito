/**
 * join-invite-chat-result: the Join invite sheet.
 * Adapter-level coverage (Ok / WebView / unknown, input parsing) lives in
 * `src/telegram/{chatInviteJoinResult,joinInvite,joinInviteInput}.test.ts`.
 * Here: the sheet drives lookup → preview → join and never leaves a WebView
 * outcome as a silent no-op (AC-J3 / AC-J5 / AC-J6).
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { I18nextProvider, initReactI18next } from "react-i18next"
import i18n from "i18next"
import { Api } from "teleproto"
import bigInt from "big-integer"
import type { TelegramClient } from "teleproto"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { LettersJoinInviteSheet } from "./LettersJoinInviteSheet"

const strings = {
  common: { cancel: "Cancel", close: "Close" },
  letters: {
    joinInvite: {
      title: "Join invite",
      hint: "hint",
      inputAria: "Invite link or channel username",
      lookUp: "Look up",
      join: "Join",
      joining: "Joining…",
      lookingUp: "Looking up…",
      tryAgain: "Try again",
      members: "{{count}} members",
      webviewTitle: "Extra step required",
      webviewBody: "Finish it in Telegram.",
      openTelegram: "Open in Telegram",
      openBrowser: "Open in browser",
      openTelegramDescribed: "x",
      openBrowserDescribed: "y",
      errorGeneric: "Couldn’t join. Try again.",
      errorInvalid: "That invite doesn’t look valid.",
      alreadyMember: "You’re already in this chat.",
    },
  },
}

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en",
    resources: { en: { translation: strings } },
    interpolation: { escapeValue: false },
  })
})

function renderSheet(client: TelegramClient) {
  const onClose = vi.fn()
  const onJoined = vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <LettersJoinInviteSheet
        open
        onClose={onClose}
        client={client}
        refreshDialogs={vi.fn(async () => {})}
        onJoined={onJoined}
      />
    </I18nextProvider>,
  )
  return { onClose, onJoined }
}

function typeInvite() {
  fireEvent.change(screen.getByLabelText("Invite link or channel username"), {
    target: { value: "https://t.me/+AbCd1234efGH" },
  })
}

describe("LettersJoinInviteSheet", () => {
  it("Look up is disabled until the input parses", () => {
    renderSheet({ invoke: vi.fn() } as unknown as TelegramClient)
    expect((screen.getByText("Look up").closest("button") as HTMLButtonElement).disabled).toBe(true)
    typeInvite()
    expect((screen.getByText("Look up").closest("button") as HTMLButtonElement).disabled).toBe(false)
  })

  it("lookup → preview → join Ok calls onJoined + onClose (AC-J5/J6)", async () => {
    const updates = new Api.Updates({ updates: [], users: [], chats: [], date: 0, seq: 0 } as never)
    const invoke = vi.fn((req: { className?: string }) => {
      if (req.className === "messages.CheckChatInvite") {
        return Promise.resolve(
          new Api.ChatInvite({
            title: "Book Club",
            about: "we read",
            participantsCount: 12,
            photo: new Api.PhotoEmpty({ id: bigInt(0) }),
            color: 0,
          } as never),
        )
      }
      return Promise.resolve(new Api.messages.ChatInviteJoinResultOk({ updates } as never))
    })
    const { onClose, onJoined } = renderSheet({ invoke } as unknown as TelegramClient)

    typeInvite()
    fireEvent.click(screen.getByText("Look up"))
    await screen.findByText("Book Club")
    expect(screen.getByText("12 members")).toBeTruthy()

    fireEvent.click(screen.getByText("Join"))
    await waitFor(() => expect(onJoined).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("join → WebView result shows the Finish-in-Telegram panel, never a silent no-op (AC-J3)", async () => {
    const invoke = vi.fn((req: { className?: string }) => {
      if (req.className === "messages.CheckChatInvite") {
        return Promise.resolve(
          new Api.ChatInvite({
            title: "Guarded",
            participantsCount: 3,
            photo: new Api.PhotoEmpty({ id: bigInt(0) }),
            color: 0,
          } as never),
        )
      }
      if (req.className === "messages.RequestChatJoinWebView") {
        return Promise.reject(new Error("no url"))
      }
      return Promise.resolve(
        new Api.messages.ChatInviteJoinResultWebView({
          botId: bigInt(1),
          queryId: bigInt(2),
          users: [],
        } as never),
      )
    })
    const { onJoined } = renderSheet({ invoke } as unknown as TelegramClient)

    typeInvite()
    fireEvent.click(screen.getByText("Look up"))
    await screen.findByText("Guarded")
    fireEvent.click(screen.getByText("Join"))

    await screen.findByText("Extra step required")
    const openTg = screen.getByText("Open in Telegram").closest("a") as HTMLAnchorElement
    expect(openTg.getAttribute("href")).toBe("https://t.me/+AbCd1234efGH")
    // browser URL fetch failed → no browser CTA
    expect(screen.queryByText("Open in browser")).toBeNull()
    expect(onJoined).not.toHaveBeenCalled()
  })
})
