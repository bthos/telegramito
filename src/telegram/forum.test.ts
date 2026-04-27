import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import { defaultForumTopicId, formatTopicUnreadSuffix, isForumWithSubchats } from "./forum"

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

describe("formatTopicUnreadSuffix", () => {
  it("shows 99+ and parenthesized counts", () => {
    expect(
      formatTopicUnreadSuffix({ className: "ForumTopic", unreadCount: 0 } as Api.ForumTopic, "")
    ).toBe("")
    expect(formatTopicUnreadSuffix({ className: "ForumTopic", unreadCount: 3 } as Api.ForumTopic)).toBe(
      "  (3)"
    )
    expect(
      formatTopicUnreadSuffix({ className: "ForumTopic", unreadCount: 100 } as Api.ForumTopic)
    ).toBe("  (99+)")
  })
})
