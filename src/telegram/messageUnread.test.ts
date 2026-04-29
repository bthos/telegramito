import { Api } from "telegram"
import { describe, expect, it } from "vitest"
import { isInboundUnreadForThread, readInboxMaxIdForThread } from "./messageUnread"

describe("messageUnread", () => {
  it("readInboxMaxIdForThread uses ForumTopic for forums", () => {
    const dialog = { dialog: { className: "Dialog" as const, readInboxMaxId: 99 } } as never
    const topics = [
      { className: "ForumTopic" as const, id: 5, readInboxMaxId: 42 },
    ] as Api.ForumTopic[]
    expect(readInboxMaxIdForThread(dialog, true, 5, topics)).toBe(42)
  })

  it("readInboxMaxIdForThread falls back to Dialog for non-forum", () => {
    const dialog = {
      dialog: { className: "Dialog" as const, readInboxMaxId: 77 },
    } as never
    expect(readInboxMaxIdForThread(dialog, false, null, [])).toBe(77)
  })

  it("isInboundUnreadForThread respects read horizon and out flag", () => {
    const incoming = { className: "Message" as const, id: 10, out: false } as Api.Message
    const outgoing = { className: "Message" as const, id: 11, out: true } as Api.Message
    expect(isInboundUnreadForThread(incoming, 9)).toBe(true)
    expect(isInboundUnreadForThread(incoming, 10)).toBe(false)
    expect(isInboundUnreadForThread(outgoing, 0)).toBe(false)
  })
})
