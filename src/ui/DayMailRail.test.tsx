import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { _clearEveningThreadCacheForTest } from "../util/eveningThreadCache"
import { DayMailRail } from "./DayMailRail"

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

function stubResizeObserver() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          letters: {
            eveningEditionTitle: "Evening edition",
            eveningEditionSubtitle: "The day in sum.",
            eveningSummaryAria: "Day summary",
            dayMailTitle: "The day's mail",
            dayMailSubtitle: "Today's activity.",
            dayMailEmpty: "Nothing new.",
            dayMailOpenMessageAria: "Open message in chat: {{name}}",
            evening: {
              wroteToYou: "Wrote to you:",
              awaitingReply: "Awaiting your reply:",
              broadcastToday: "On the air today:",
              postedToChannels: "You posted today:",
            },
          },
          chat: { searchFromYou: "You" },
        },
      },
    },
  })
  return inst
}

const EVENING_NIGHT_MODE = { enabled: true, start: "22:00", end: "07:00" }
// 21:30 local → 30 min before 22:00 → inside the evening-edition pre-lock window
const FAKE_NOW = new Date("2026-07-10T21:30:00")
// Message timestamp from the same calendar day (midday)
const TODAY_TS = Math.floor(new Date("2026-07-10T12:00:00").getTime() / 1000)

function mkMsg(opts: { id: number; out: boolean; userId?: number; channelId?: number; text?: string }): Api.Message {
  const peerId = opts.channelId != null
    ? ({ className: "PeerChannel", channelId: BigInt(opts.channelId) } as unknown as Api.TypePeer)
    : ({ className: "PeerUser", userId: BigInt(opts.userId ?? 2) } as unknown as Api.TypePeer)
  return new Api.Message({
    id: opts.id,
    peerId,
    date: TODAY_TS,
    message: opts.text ?? "Hello",
    out: opts.out,
  })
}

function stubPrivateInbound(name: string, userId = 2): Dialog {
  return {
    isUser: true,
    name,
    entity: {
      className: "User",
      id: BigInt(userId),
      accessHash: BigInt(1),
      firstName: name,
    } as unknown as Api.User,
    message: mkMsg({ id: userId * 10, out: false, userId }),
    dialog: {
      className: "Dialog" as const,
      peer: { className: "PeerUser", userId: BigInt(userId) } as unknown as Api.TypePeer,
      topMessage: 0,
      readInboxMaxId: 0,
      readOutboxMaxId: 0,
      unreadCount: 0,
      unreadMentionsCount: 0,
      unreadReactionsCount: 0,
      unreadPollVotesCount: 0,
    } as Api.Dialog,
  } as unknown as Dialog
}

function stubPrivateOutbound(name: string, userId = 3): Dialog {
  return {
    isUser: true,
    name,
    entity: {
      className: "User",
      id: BigInt(userId),
      accessHash: BigInt(1),
      firstName: name,
    } as unknown as Api.User,
    // Question mark → not a closing phrase → resolves as awaitingReply
    message: mkMsg({ id: userId * 10, out: true, userId, text: "What do you think?" }),
    dialog: {
      className: "Dialog" as const,
      peer: { className: "PeerUser", userId: BigInt(userId) } as unknown as Api.TypePeer,
      topMessage: 0,
      readInboxMaxId: 0,
      readOutboxMaxId: 0,
      unreadCount: 0,
      unreadMentionsCount: 0,
      unreadReactionsCount: 0,
      unreadPollVotesCount: 0,
    } as Api.Dialog,
  } as unknown as Dialog
}

function stubBroadcastInbound(name: string, channelId = 100): Dialog {
  return {
    isUser: false,
    name,
    entity: {
      className: "Channel",
      id: BigInt(channelId),
      accessHash: BigInt(1),
      title: name,
      broadcast: true,
      megagroup: false,
    } as unknown as Api.Channel,
    message: mkMsg({ id: channelId * 10, out: false, channelId }),
    dialog: {
      className: "Dialog" as const,
      peer: { className: "PeerChannel", channelId: BigInt(channelId) } as unknown as Api.TypePeer,
      topMessage: 0,
      readInboxMaxId: 0,
      readOutboxMaxId: 0,
      unreadCount: 0,
      unreadMentionsCount: 0,
      unreadReactionsCount: 0,
      unreadPollVotesCount: 0,
    } as Api.Dialog,
  } as unknown as Dialog
}

function stubBroadcastOutbound(name: string, channelId = 200): Dialog {
  return {
    isUser: false,
    name,
    entity: {
      className: "Channel",
      id: BigInt(channelId),
      accessHash: BigInt(1),
      title: name,
      broadcast: true,
      megagroup: false,
    } as unknown as Api.Channel,
    message: mkMsg({ id: channelId * 10, out: true, channelId }),
    dialog: {
      className: "Dialog" as const,
      peer: { className: "PeerChannel", channelId: BigInt(channelId) } as unknown as Api.TypePeer,
      topMessage: 0,
      readInboxMaxId: 0,
      readOutboxMaxId: 0,
      unreadCount: 0,
      unreadMentionsCount: 0,
      unreadReactionsCount: 0,
      unreadPollVotesCount: 0,
    } as Api.Dialog,
  } as unknown as Dialog
}

function Wrapper({ children, inst }: { children: ReactNode; inst: ReturnType<typeof i18n.createInstance> }) {
  return <I18nextProvider i18n={inst}>{children}</I18nextProvider>
}

describe("DayMailRail — evening summary tap-open", () => {
  let inst: Awaited<ReturnType<typeof miniI18n>>

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(FAKE_NOW)
    stubMatchMedia()
    stubResizeObserver()
    _clearEveningThreadCacheForTest()
    inst = await miniI18n()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("AC-T1: wroteToday name is a button (accessible)", () => {
    const dialog = stubPrivateInbound("Ada", 2)
    render(
      <Wrapper inst={inst}>
        <DayMailRail dialogs={[dialog]} nightMode={EVENING_NIGHT_MODE} />
      </Wrapper>,
    )
    expect(screen.getByRole("button", { name: "Ada" })).toBeTruthy()
  })

  it("AC-T2: clicking wroteToday name calls onSelect with the matching dialog", () => {
    const onSelect = vi.fn()
    const dialog = stubPrivateInbound("Ada", 2)
    render(
      <Wrapper inst={inst}>
        <DayMailRail dialogs={[dialog]} nightMode={EVENING_NIGHT_MODE} onSelect={onSelect} />
      </Wrapper>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Ada" }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(dialog)
  })

  it("AC-T3: awaitingReply name is a button that calls onSelect", () => {
    const onSelect = vi.fn()
    const dialog = stubPrivateOutbound("Bob", 3)
    render(
      <Wrapper inst={inst}>
        <DayMailRail dialogs={[dialog]} nightMode={EVENING_NIGHT_MODE} onSelect={onSelect} />
      </Wrapper>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Bob" }))
    expect(onSelect).toHaveBeenCalledWith(dialog)
  })

  it("AC-T3: broadcastToday name is a button that calls onSelect", () => {
    const onSelect = vi.fn()
    const dialog = stubBroadcastInbound("News FM", 100)
    render(
      <Wrapper inst={inst}>
        <DayMailRail dialogs={[dialog]} nightMode={EVENING_NIGHT_MODE} onSelect={onSelect} />
      </Wrapper>,
    )
    fireEvent.click(screen.getByRole("button", { name: "News FM" }))
    expect(onSelect).toHaveBeenCalledWith(dialog)
  })

  it("AC-T3: postedToChannelsToday name is a button that calls onSelect", () => {
    const onSelect = vi.fn()
    const dialog = stubBroadcastOutbound("My Channel", 200)
    render(
      <Wrapper inst={inst}>
        <DayMailRail dialogs={[dialog]} nightMode={EVENING_NIGHT_MODE} onSelect={onSelect} />
      </Wrapper>,
    )
    fireEvent.click(screen.getByRole("button", { name: "My Channel" }))
    expect(onSelect).toHaveBeenCalledWith(dialog)
  })

  it("two wroteToday entries render as separate buttons", () => {
    const dialogs = [stubPrivateInbound("Ada", 2), stubPrivateInbound("Berta", 4)]
    render(
      <Wrapper inst={inst}>
        <DayMailRail dialogs={dialogs} nightMode={EVENING_NIGHT_MODE} />
      </Wrapper>,
    )
    expect(screen.getByRole("button", { name: "Ada" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Berta" })).toBeTruthy()
  })
})
