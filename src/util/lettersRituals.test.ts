import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { getDialogDraftPreviewLine, getDialogDraftText } from "./dialogDraft"
import {
  buildEveningSummary,
  isInEveningEditionPeriod,
  localCalendarDayKey,
  minutesUntilNightLock,
  resolveMorningMobileTab,
} from "./lettersRituals"

function stubDialog(opts: {
  draft?: Api.TypeDraftMessage
  message?: Api.Message
  name?: string
}): Dialog {
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
    name: opts.name ?? "Ada",
    message: opts.message,
    dialog: dr,
  } as unknown as Dialog
}

describe("dialogDraft", () => {
  it("reads non-empty DraftMessage text", () => {
    const d = stubDialog({
      draft: new Api.DraftMessage({ message: "Dear friend,\nunfinished", date: 1 }),
    })
    expect(getDialogDraftText(d)).toBe("Dear friend,\nunfinished")
    expect(getDialogDraftPreviewLine(d, (k) => k)).toBe("Dear friend,")
  })
})

describe("lettersRituals morning tab", () => {
  it("first open of day → day mail", () => {
    expect(
      resolveMorningMobileTab({
        enabled: true,
        lastMorningDayMailDate: null,
        today: "2026-07-10",
      }),
    ).toBe("dayMail")
  })

  it("same day revisit → letters", () => {
    expect(
      resolveMorningMobileTab({
        enabled: true,
        lastMorningDayMailDate: "2026-07-10",
        today: "2026-07-10",
      }),
    ).toBe("letters")
  })

  it("disabled → null", () => {
    expect(
      resolveMorningMobileTab({
        enabled: false,
        lastMorningDayMailDate: null,
        today: "2026-07-10",
      }),
    ).toBeNull()
  })

  it("localCalendarDayKey uses YYYY-MM-DD", () => {
    expect(localCalendarDayKey(new Date("2026-07-10T08:00:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("evening edition", () => {
  const night = { enabled: true, start: "22:00", end: "07:00" }

  it("is active in pre-lock hour", () => {
    expect(isInEveningEditionPeriod(night, new Date("2026-07-10T21:30:00"))).toBe(true)
  })

  it("minutesUntilNightLock in pre-lock window", () => {
    expect(minutesUntilNightLock(night, new Date("2026-07-10T21:30:00"))).toBe(30)
  })

  it("buildEveningSummary splits wrote today vs awaiting reply", () => {
    const today = Math.floor(new Date("2026-07-10T12:00:00").getTime() / 1000)
    const wrote = stubDialog({
      name: "Bob",
      message: new Api.Message({
        id: 1,
        peerId: { className: "PeerUser", userId: BigInt(2) } as unknown as Api.TypePeer,
        date: today,
        message: "Hello",
        out: false,
      }),
    })
    const waiting = stubDialog({
      name: "Cara",
      message: new Api.Message({
        id: 2,
        peerId: { className: "PeerUser", userId: BigInt(3) } as unknown as Api.TypePeer,
        date: today,
        message: "Ping?",
        out: true,
      }),
    })
    const summary = buildEveningSummary([wrote, waiting], new Date("2026-07-10T20:00:00"))
    expect(summary.wroteToday.map((x) => x.name)).toEqual(["Bob"])
    expect(summary.awaitingReply.map((x) => x.name)).toEqual(["Cara"])
  })
})
