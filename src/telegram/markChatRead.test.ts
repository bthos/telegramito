import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import { maxMessageIdInBatch, readMaxIdForMarkRead } from "./markChatRead"

describe("maxMessageIdInBatch", () => {
  it("returns undefined for empty list", () => {
    expect(maxMessageIdInBatch([])).toBeUndefined()
  })

  it("returns max id", () => {
    const a = { className: "Message" as const, id: 10 } as Api.Message
    const b = { className: "Message" as const, id: 30 } as Api.Message
    const c = { className: "Message" as const, id: 20 } as Api.Message
    expect(maxMessageIdInBatch([a, b, c])).toBe(30)
  })
})

describe("readMaxIdForMarkRead", () => {
  it("uses forum topic topMessage when higher than loaded batch max", () => {
    const msg = { className: "Message" as const, id: 40 } as Api.Message
    const topic = {
      className: "ForumTopic" as const,
      topMessage: 999,
    } as Api.ForumTopic
    expect(readMaxIdForMarkRead([msg], { isForum: true, topic })).toBe(999)
  })

  it("uses list max when forum topMessage is absent", () => {
    const msg = { className: "Message" as const, id: 55 } as Api.Message
    const topic = { className: "ForumTopic" as const, topMessage: 0 } as Api.ForumTopic
    expect(readMaxIdForMarkRead([msg], { isForum: true, topic })).toBe(55)
  })

  it("ignores topic merge when not forum", () => {
    const msg = { className: "Message" as const, id: 12 } as Api.Message
    const topic = {
      className: "ForumTopic" as const,
      topMessage: 9000,
    } as Api.ForumTopic
    expect(readMaxIdForMarkRead([msg], { isForum: false, topic })).toBe(12)
  })
})
