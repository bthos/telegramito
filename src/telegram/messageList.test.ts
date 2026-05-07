import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import { minMessageId, toMessageList, uniqueMessagesSort } from "./messageList"

function msg(id: number, date: number): Api.Message {
  return { className: "Message", id, date } as Api.Message
}

describe("uniqueMessagesSort", () => {
  it("orders by id ascending when date is equal (same second)", () => {
    const sorted = uniqueMessagesSort([msg(30, 1000), msg(10, 1000), msg(20, 1000)])
    expect(sorted.map((m) => m.id)).toEqual([10, 20, 30])
  })
})

describe("minMessageId", () => {
  it("uses min id for cursor, not list[0] when id/date are inverted", () => {
    const list = uniqueMessagesSort([msg(5, 3000), msg(20, 1000)])
    expect(list[0].id).toBe(20)
    expect(minMessageId(list)).toBe(5)
  })
})

describe("toMessageList", () => {
  it("applies repairMessageAfterGramJs to each Message", () => {
    const doc = { className: "Document", id: 7, mimeType: "text/plain" } as unknown as Api.Document
    const raw = [
      {
        className: "Message",
        id: 1,
        date: 1,
        document: doc,
        media: { className: "MessageMediaEmpty" },
      },
    ]
    const out = toMessageList(raw)
    expect(out).toHaveLength(1)
    expect(out[0]?.media?.className).toBe("MessageMediaDocument")
  })
})
