import { describe, expect, it, vi, beforeEach } from "vitest"
import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { TelegramClient } from "telegram"
import { getPeerInfo } from "../telegram/dialogUtils"
import { getDialogDraftPreviewLine, getDialogDraftText } from "./dialogDraft"
import {
  _resetEveningTier2FetchCountForTest,
  buildEveningSummary,
  getEveningTier2FetchCount,
  isClosingOutbound,
  isEveningSummaryChannelDialog,
  isInEveningEditionPeriod,
  localCalendarDayKey,
  minutesUntilNightLock,
  peerAwaitingFromThreadMessages,
  refineAwaitingReplyTier2,
  resolveMorningMobileTab,
  TIER2_AWAITING_PEER_CAP,
} from "./lettersRituals"
import {
  _clearEveningThreadCacheForTest,
  getEveningThreadMessages,
  rememberEveningThreadMessages,
} from "./eveningThreadCache"

function stubDialog(opts: {
  draft?: Api.TypeDraftMessage
  message?: Api.Message
  name?: string
  isUser?: boolean
  entity?: Dialog["entity"]
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
    isUser: opts.isUser ?? true,
    name: opts.name ?? "Ada",
    entity: opts.entity,
    message: opts.message,
    dialog: dr,
  } as unknown as Dialog
}

function stubBroadcastChannel(
  name: string,
  message: Api.Message,
  channelId = 100,
): Dialog {
  return stubDialog({
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
    message,
  })
}

function stubSidebarChannel(
  name: string,
  message: Api.Message,
): Dialog {
  return stubDialog({
    isUser: false,
    name,
    entity: {
      className: "Channel",
      id: BigInt(101),
      accessHash: BigInt(1),
      title: name,
      broadcast: false,
      megagroup: false,
    } as unknown as Api.Channel,
    message,
  })
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

function stubPrivateDialog(
  name: string,
  message: Api.Message,
  userId = 2,
): Dialog {
  return stubDialog({
    name,
    message,
    entity: {
      className: "User",
      id: BigInt(userId),
      accessHash: BigInt(1),
      firstName: name,
    } as unknown as Api.User,
  })
}

describe("evening awaiting detection", () => {
  const now = new Date("2026-07-10T20:00:00")
  const today = Math.floor(now.getTime() / 1000)

  beforeEach(() => {
    _clearEveningThreadCacheForTest()
    _resetEveningTier2FetchCountForTest()
  })

  it("excludes terminal closing outbound from awaiting (AC-U3)", () => {
    const closing = stubPrivateDialog(
      "Ada",
      new Api.Message({
        id: 1,
        peerId: { className: "PeerUser", userId: BigInt(2) } as unknown as Api.TypePeer,
        date: today,
        message: "ok, thanks.",
        out: true,
      }),
    )
    const summary = buildEveningSummary([closing], now)
    expect(summary.awaitingReply).toEqual([])
  })

  it("excludes awaiting when cache has inbound after last outbound today (AC-U1)", () => {
    const preview = stubPrivateDialog(
      "Bob",
      new Api.Message({
        id: 3,
        peerId: { className: "PeerUser", userId: BigInt(2) } as unknown as Api.TypePeer,
        date: today - 2 * 3600,
        message: "My last note",
        out: true,
      }),
      2,
    )
    const { key } = getPeerInfo(preview)
    rememberEveningThreadMessages(key, [
      new Api.Message({
        id: 1,
        peerId: { className: "PeerUser", userId: BigInt(2) } as unknown as Api.TypePeer,
        date: today - 6 * 3600,
        message: "Hi",
        out: true,
      }),
      preview.message as Api.Message,
      new Api.Message({
        id: 2,
        peerId: { className: "PeerUser", userId: BigInt(2) } as unknown as Api.TypePeer,
        date: today - 3600,
        message: "Sure, later",
        out: false,
      }),
    ])
    const summary = buildEveningSummary([preview], now, {
      getThreadMessages: getEveningThreadMessages,
    })
    expect(summary.awaitingReply).toEqual([])
  })

  it("keeps awaiting when cache confirms no inbound after last outbound", () => {
    const preview = stubPrivateDialog(
      "Cara",
      new Api.Message({
        id: 2,
        peerId: { className: "PeerUser", userId: BigInt(3) } as unknown as Api.TypePeer,
        date: today,
        message: "Still waiting?",
        out: true,
      }),
      3,
    )
    rememberEveningThreadMessages(getPeerInfo(preview).key, [
      new Api.Message({
        id: 1,
        peerId: { className: "PeerUser", userId: BigInt(3) } as unknown as Api.TypePeer,
        date: today - 7200,
        message: "Morning",
        out: false,
      }),
      preview.message as Api.Message,
    ])
    const summary = buildEveningSummary([preview], now, {
      getThreadMessages: getEveningThreadMessages,
    })
    expect(summary.awaitingReply.map((x) => x.name)).toEqual(["Cara"])
  })

  it("peerAwaitingFromThreadMessages returns null without outbound today", () => {
    const msgs = [
      new Api.Message({
        id: 1,
        peerId: { className: "PeerUser", userId: BigInt(1) } as unknown as Api.TypePeer,
        date: today,
        message: "Hi",
        out: false,
      }),
    ]
    expect(peerAwaitingFromThreadMessages(msgs, now)).toBeNull()
  })

  it("isClosingOutbound matches short thanks without question mark", () => {
    const m = new Api.Message({
      id: 1,
      peerId: { className: "PeerUser", userId: BigInt(1) } as unknown as Api.TypePeer,
      date: today,
      message: "спасибо",
      out: true,
    })
    expect(isClosingOutbound(m)).toBe(true)
  })

  it("refineAwaitingReplyTier2 fetches at most 5 peers (AC-U4)", async () => {
    const dialogs = Array.from({ length: 7 }, (_, i) =>
      stubPrivateDialog(
        `Peer ${i}`,
        new Api.Message({
          id: 1,
          peerId: { className: "PeerUser", userId: BigInt(i + 10) } as unknown as Api.TypePeer,
          date: today,
          message: "?",
          out: true,
        }),
        i + 10,
      ),
    )
    const getMessages = vi.fn().mockResolvedValue([])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary(dialogs, now)
    expect(base.awaitingReply).toHaveLength(7)
    await refineAwaitingReplyTier2(base, dialogs, client, now, { enabled: true })
    expect(getMessages).toHaveBeenCalledTimes(TIER2_AWAITING_PEER_CAP)
  })

  it("refineAwaitingReplyTier2 records fetch count (AC-U5)", async () => {
    const d = stubPrivateDialog(
      "Zed",
      new Api.Message({
        id: 1,
        peerId: { className: "PeerUser", userId: BigInt(99) } as unknown as Api.TypePeer,
        date: today,
        message: "Ping",
        out: true,
      }),
      99,
    )
    const client = {
      getMessages: vi.fn().mockResolvedValue([
        new Api.Message({
          id: 1,
          peerId: { className: "PeerUser", userId: BigInt(99) } as unknown as Api.TypePeer,
          date: today,
          message: "Ping",
          out: true,
        }),
        new Api.Message({
          id: 2,
          peerId: { className: "PeerUser", userId: BigInt(99) } as unknown as Api.TypePeer,
          date: today + 60,
          message: "Reply",
          out: false,
        }),
      ]),
    } as unknown as TelegramClient
    const base = buildEveningSummary([d], now)
    expect(base.awaitingReply).toHaveLength(1)
    const refined = await refineAwaitingReplyTier2(base, [d], client, now, { enabled: true })
    expect(getEveningTier2FetchCount()).toBe(1)
    expect(refined.awaitingReply).toEqual([])
  })
})

describe("evening channel Tier 2 refine (AC-C1..C4)", () => {
  const now = new Date("2026-07-10T20:00:00")
  const today = Math.floor(now.getTime() / 1000)

  beforeEach(() => {
    _resetEveningTier2FetchCountForTest()
  })

  function inboundChannelMsg(id: number, ts = today): Api.Message {
    return new Api.Message({
      id,
      peerId: { className: "PeerChannel", channelId: BigInt(id) } as unknown as Api.TypePeer,
      date: ts,
      message: "News",
      out: false,
    })
  }

  it("shares the 5-peer cap private-first, leaving the remainder for channels (AC-C1)", async () => {
    const privateDialogs = Array.from({ length: 3 }, (_, i) =>
      stubPrivateDialog(
        `Peer ${i}`,
        new Api.Message({
          id: 1,
          peerId: { className: "PeerUser", userId: BigInt(i + 10) } as unknown as Api.TypePeer,
          date: today,
          message: "?",
          out: true,
        }),
        i + 10,
      ),
    )
    const channelDialogs = Array.from({ length: 4 }, (_, i) =>
      stubBroadcastChannel(`Channel ${i}`, inboundChannelMsg(200 + i), 200 + i),
    )
    const dialogs = [...privateDialogs, ...channelDialogs]
    const getMessages = vi.fn().mockResolvedValue([])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary(dialogs, now)
    expect(base.awaitingReply).toHaveLength(3)
    expect(base.broadcastToday).toHaveLength(4)

    await refineAwaitingReplyTier2(base, dialogs, client, now, { enabled: true })

    expect(getMessages).toHaveBeenCalledTimes(TIER2_AWAITING_PEER_CAP)
  })

  it("fetches no channel peers when private awaiting already fills the cap (AC-C1)", async () => {
    const privateDialogs = Array.from({ length: 5 }, (_, i) =>
      stubPrivateDialog(
        `Peer ${i}`,
        new Api.Message({
          id: 1,
          peerId: { className: "PeerUser", userId: BigInt(i + 10) } as unknown as Api.TypePeer,
          date: today,
          message: "?",
          out: true,
        }),
        i + 10,
      ),
    )
    const channelDialog = stubBroadcastChannel("Channel 0", inboundChannelMsg(300), 300)
    const dialogs = [...privateDialogs, channelDialog]
    const getMessages = vi.fn().mockResolvedValue([])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary(dialogs, now)

    const refined = await refineAwaitingReplyTier2(base, dialogs, client, now, { enabled: true })

    expect(getMessages).toHaveBeenCalledTimes(TIER2_AWAITING_PEER_CAP)
    expect(refined.broadcastToday.map((x) => x.name)).toEqual(["Channel 0"])
  })

  it("drops a broadcastToday row when history has no inbound post today (AC-C2)", async () => {
    const channelDialog = stubBroadcastChannel("Stale News", inboundChannelMsg(400), 400)
    const getMessages = vi.fn().mockResolvedValue([
      new Api.Message({
        id: 1,
        peerId: { className: "PeerChannel", channelId: BigInt(400) } as unknown as Api.TypePeer,
        date: today - 90000,
        message: "Yesterday's post",
        out: false,
      }),
    ])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary([channelDialog], now)
    expect(base.broadcastToday.map((x) => x.name)).toEqual(["Stale News"])

    const refined = await refineAwaitingReplyTier2(base, [channelDialog], client, now, {
      enabled: true,
    })

    expect(refined.broadcastToday).toEqual([])
  })

  it("keeps a broadcastToday row when history confirms an inbound post today (AC-C2)", async () => {
    const channelDialog = stubBroadcastChannel("Live News", inboundChannelMsg(500), 500)
    const getMessages = vi.fn().mockResolvedValue([inboundChannelMsg(500)])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary([channelDialog], now)

    const refined = await refineAwaitingReplyTier2(base, [channelDialog], client, now, {
      enabled: true,
    })

    expect(refined.broadcastToday.map((x) => x.name)).toEqual(["Live News"])
  })

  it("does not touch postedToChannelsToday (outbound, preview-only) (AC-C2)", async () => {
    const outboundChannelMsg = new Api.Message({
      id: 1,
      peerId: { className: "PeerChannel", channelId: BigInt(600) } as unknown as Api.TypePeer,
      date: today,
      message: "My post",
      out: true,
    })
    const channelDialog = stubBroadcastChannel("My Channel", outboundChannelMsg, 600)
    const getMessages = vi.fn().mockResolvedValue([])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary([channelDialog], now)
    expect(base.postedToChannelsToday.map((x) => x.name)).toEqual(["My Channel"])

    const refined = await refineAwaitingReplyTier2(base, [channelDialog], client, now, {
      enabled: true,
    })

    expect(getMessages).not.toHaveBeenCalled()
    expect(refined.postedToChannelsToday).toEqual(base.postedToChannelsToday)
  })

  it("does not fetch channel history when precise mode is off (AC-C3)", async () => {
    const channelDialog = stubBroadcastChannel("Channel 0", inboundChannelMsg(700), 700)
    const getMessages = vi.fn().mockResolvedValue([])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary([channelDialog], now)

    const refined = await refineAwaitingReplyTier2(base, [channelDialog], client, now, {
      enabled: false,
    })

    expect(getMessages).not.toHaveBeenCalled()
    expect(refined).toEqual(base)
  })

  it("counts channel fetches toward the shared eveningTier2FetchCount telemetry (AC-C4)", async () => {
    const channelDialog = stubBroadcastChannel("Channel 0", inboundChannelMsg(800), 800)
    const getMessages = vi.fn().mockResolvedValue([inboundChannelMsg(800)])
    const client = { getMessages } as unknown as TelegramClient
    const base = buildEveningSummary([channelDialog], now)

    await refineAwaitingReplyTier2(base, [channelDialog], client, now, { enabled: true })

    expect(getEveningTier2FetchCount()).toBe(1)
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
    expect(summary.broadcastToday).toEqual([])
    expect(summary.postedToChannelsToday).toEqual([])
  })

  it("includes broadcast channel with inbound post today", () => {
    const today = Math.floor(new Date("2026-07-10T12:00:00").getTime() / 1000)
    const bulletin = stubBroadcastChannel(
      "News FM",
      new Api.Message({
        id: 10,
        peerId: { className: "PeerChannel", channelId: BigInt(100) } as unknown as Api.TypePeer,
        date: today,
        message: "Headline",
        out: false,
      }),
    )
    expect(isEveningSummaryChannelDialog(bulletin)).toBe(true)
    const summary = buildEveningSummary([bulletin], new Date("2026-07-10T20:00:00"))
    expect(summary.broadcastToday.map((x) => x.name)).toEqual(["News FM"])
    expect(summary.postedToChannelsToday).toEqual([])
  })

  it("includes sidebar channel list peer with today activity", () => {
    const today = Math.floor(new Date("2026-07-10T12:00:00").getTime() / 1000)
    const channel = stubSidebarChannel(
      "Discussion",
      new Api.Message({
        id: 11,
        peerId: { className: "PeerChannel", channelId: BigInt(101) } as unknown as Api.TypePeer,
        date: today,
        message: "Thread",
        out: false,
      }),
    )
    const summary = buildEveningSummary([channel], new Date("2026-07-10T20:00:00"))
    expect(summary.broadcastToday.map((x) => x.name)).toEqual(["Discussion"])
  })

  it("lists outbound channel posts separately from broadcast consumption", () => {
    const today = Math.floor(new Date("2026-07-10T12:00:00").getTime() / 1000)
    const posted = stubBroadcastChannel(
      "My Channel",
      new Api.Message({
        id: 12,
        peerId: { className: "PeerChannel", channelId: BigInt(100) } as unknown as Api.TypePeer,
        date: today,
        message: "Admin note",
        out: true,
      }),
    )
    const summary = buildEveningSummary([posted], new Date("2026-07-10T20:00:00"))
    expect(summary.postedToChannelsToday.map((x) => x.name)).toEqual(["My Channel"])
    expect(summary.broadcastToday).toEqual([])
  })

  it("ignores stale channel preview (not today)", () => {
    const yesterday = Math.floor(new Date("2026-07-09T12:00:00").getTime() / 1000)
    const stale = stubBroadcastChannel(
      "Old News",
      new Api.Message({
        id: 13,
        peerId: { className: "PeerChannel", channelId: BigInt(100) } as unknown as Api.TypePeer,
        date: yesterday,
        message: "Yesterday",
        out: false,
      }),
    )
    const summary = buildEveningSummary([stale], new Date("2026-07-10T20:00:00"))
    expect(summary.broadcastToday).toEqual([])
  })

  it("excludes megagroups from evening channel summary", () => {
    const today = Math.floor(new Date("2026-07-10T12:00:00").getTime() / 1000)
    const group = stubDialog({
      isUser: false,
      name: "Mega",
      entity: {
        className: "Channel",
        id: BigInt(200),
        accessHash: BigInt(1),
        title: "Mega",
        broadcast: false,
        megagroup: true,
      } as unknown as Api.Channel,
      message: new Api.Message({
        id: 14,
        peerId: { className: "PeerChannel", channelId: BigInt(200) } as unknown as Api.TypePeer,
        date: today,
        message: "Hi",
        out: false,
      }),
    })
    const summary = buildEveningSummary([group], new Date("2026-07-10T20:00:00"))
    expect(summary.broadcastToday).toEqual([])
    expect(summary.postedToChannelsToday).toEqual([])
  })
})
