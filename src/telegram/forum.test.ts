import { describe, expect, it, vi } from "vitest"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import {
  defaultForumTopicId,
  formatTopicUnreadSuffix,
  forumTopicIconSwatchColor,
  isForumWithSubchats,
  resolveForumTopicIdFromMessage,
  sendInForumThread,
  sumTopicUnreadCounts,
} from "./forum"

function forumChannel(
  o: { forum?: boolean; viewForumAsMessages?: boolean } = {}
): Api.Channel {
  return {
    className: "Channel",
    megagroup: true,
    forum: o.forum !== false,
    viewForumAsMessages: o.viewForumAsMessages,
  } as unknown as Api.Channel
}

describe("isForumWithSubchats", () => {
  it("is true for megagroup+forum, not as messages", () => {
    expect(isForumWithSubchats(forumChannel())).toBe(true)
  })
  it("is false for viewForumAsMessages", () => {
    expect(isForumWithSubchats(forumChannel({ viewForumAsMessages: true }))).toBe(false)
  })
  it("is false for non-forum or non-mega", () => {
    const nonForum = { className: "Channel", megagroup: true, forum: false } as unknown as Api.Channel
    expect(isForumWithSubchats(nonForum)).toBe(false)
    const nonMega = { className: "Channel", megagroup: false, forum: true } as unknown as Api.Channel
    expect(isForumWithSubchats(nonMega)).toBe(false)
  })
  it("is false for private user", () => {
    expect(
      isForumWithSubchats(
        { className: "User" } as unknown as Parameters<typeof isForumWithSubchats>[0]
      )
    ).toBe(false)
  })
})

describe("defaultForumTopicId", () => {
  it("prefers topic id 1 (General) when present", () => {
    const a: Api.ForumTopic = {
      className: "ForumTopic",
      id: 1,
    } as Api.ForumTopic
    const b: Api.ForumTopic = {
      className: "ForumTopic",
      id: 2,
    } as Api.ForumTopic
    expect(defaultForumTopicId([b, a])).toBe(1)
  })
})

describe("sumTopicUnreadCounts", () => {
  it("sums topic unreadCount", () => {
    expect(
      sumTopicUnreadCounts([
        { className: "ForumTopic", id: 1, unreadCount: 10 } as Api.ForumTopic,
        { className: "ForumTopic", id: 2, unreadCount: 5 } as Api.ForumTopic,
        { className: "ForumTopic", id: 3 } as Api.ForumTopic,
      ])
    ).toBe(15)
  })
})

describe("resolveForumTopicIdFromMessage", () => {
  function topicStub(id: number, topMessage?: number): Api.ForumTopic {
    const t = {
      className: "ForumTopic",
      id,
      ...(typeof topMessage === "number" ? { topMessage } : {}),
    }
    return t as Api.ForumTopic
  }

  function forumMsg(replyToTopId: number | null | undefined, mid: number): Api.Message {
    const replyTo = replyToTopId == null
      ? undefined
      : new Api.MessageReplyHeader({
          replyToMsgId: 1,
          replyToTopId,
        })
    return new Api.Message({
      id: mid,
      message: "",
      date: 0,
      replyTo,
    } as never)
  }

  it("uses reply_to_top_id when it matches a topic id", () => {
    expect(
      resolveForumTopicIdFromMessage(forumMsg(7, 99), [
        topicStub(1),
        topicStub(7),
        topicStub(8),
      ]),
    ).toBe(7)
  })
  it("maps message id to topic id when they match", () => {
    expect(
      resolveForumTopicIdFromMessage(forumMsg(undefined, 42), [topicStub(1), topicStub(42)]),
    ).toBe(42)
  })
  it("maps topic by topMessage when it equals message id", () => {
    expect(resolveForumTopicIdFromMessage(forumMsg(undefined, 500), [topicStub(9, 500)])).toBe(9)
  })
  it("returns null when reply_to_top_id is not in topic list", () => {
    expect(resolveForumTopicIdFromMessage(forumMsg(99, 1), [topicStub(1), topicStub(2)])).toBeNull()
  })
})

describe("forumTopicIconSwatchColor", () => {
  it("maps Telegram palette ids to lowercase hex", () => {
    expect(forumTopicIconSwatchColor(0x6fb9f0)).toBe("#6fb9f0")
    expect(forumTopicIconSwatchColor(0xffd67e)).toBe("#ffd67e")
  })
  it("uses neutral gray when color is effectively zero", () => {
    expect(forumTopicIconSwatchColor(0)).toBe("#9aa7b8")
  })
})

describe("sendInForumThread — formattingEntities passthrough (AC-T18)", () => {
  function mockClient() {
    const invoke = vi.fn(
      (_req: unknown): Promise<Api.TypeUpdates> => Promise.resolve({} as Api.TypeUpdates),
    )
    const client = {
      getInputEntity: vi.fn(async () => ({ className: "InputPeerChannel" })),
      invoke,
    } as unknown as TelegramClient
    return { client, invoke }
  }

  const channel = { className: "Channel" } as unknown as Parameters<typeof sendInForumThread>[1]

  it("threads formattingEntities into messages.SendMessage.entities", async () => {
    const { client, invoke } = mockClient()
    const entities = [new Api.MessageEntityBold({ offset: 0, length: 4 })]
    await sendInForumThread(client, channel, "bold", 7, undefined, entities)

    expect(invoke).toHaveBeenCalledTimes(1)
    const arg = invoke.mock.calls[0][0] as Api.messages.SendMessage
    expect(arg).toBeInstanceOf(Api.messages.SendMessage)
    expect(arg.message).toBe("bold")
    expect(arg.entities).toEqual(entities)
    expect((arg.replyTo as Api.InputReplyToMessage).topMsgId).toBe(7)
  })

  it("omits entities when none are passed (plain send unchanged)", async () => {
    const { client, invoke } = mockClient()
    await sendInForumThread(client, channel, "plain", 7)
    const arg = invoke.mock.calls[0][0] as Api.messages.SendMessage
    expect(arg.message).toBe("plain")
    expect(arg.entities).toBeUndefined()
  })

  it("omits entities when an empty array is passed", async () => {
    const { client, invoke } = mockClient()
    await sendInForumThread(client, channel, "plain", 7, undefined, [])
    const arg = invoke.mock.calls[0][0] as Api.messages.SendMessage
    expect(arg.entities).toBeUndefined()
  })
})

describe("formatTopicUnreadSuffix", () => {
  it("shows parenthesized exact counts", () => {
    expect(
      formatTopicUnreadSuffix({ className: "ForumTopic", unreadCount: 0 } as Api.ForumTopic, "")
    ).toBe("")
    expect(formatTopicUnreadSuffix({ className: "ForumTopic", unreadCount: 3 } as Api.ForumTopic)).toBe(
      "  (3)"
    )
    expect(
      formatTopicUnreadSuffix({ className: "ForumTopic", unreadCount: 100 } as Api.ForumTopic)
    ).toBe("  (100)")
  })
})
