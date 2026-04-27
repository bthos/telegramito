import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import { minMessageId, uniqueMessagesSort } from "./messageList"

function msg(id: number, date: number): Api.Message {
  return { className: "Message", id, date } as Api.Message
}

describe("minMessageId", () => {
  it("uses min id for cursor, not list[0] when id/date are inverted", () => {
    const list = uniqueMessagesSort([msg(5, 3000), msg(20, 1000)])
    expect(list[0].id).toBe(20)
    expect(minMessageId(list)).toBe(5)
  })
})
