import bigInt from "big-integer"
import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import {
  collectCustomEmojiDocumentIdsFromEntities,
  collectCustomEmojiDocumentIdsFromMessages,
} from "./customEmojiFromMessages"

describe("collectCustomEmojiDocumentIdsFromEntities", () => {
  it("returns empty for undefined entities", () => {
    expect(collectCustomEmojiDocumentIdsFromEntities(undefined)).toEqual([])
  })

  it("collects document ids in order", () => {
    const id1 = bigInt(111)
    const id2 = bigInt(222)
    const entities: Api.TypeMessageEntity[] = [
      new Api.MessageEntityBold({ offset: 0, length: 1 }),
      new Api.MessageEntityCustomEmoji({ offset: 1, length: 2, documentId: id1 }),
      new Api.MessageEntityCustomEmoji({ offset: 4, length: 2, documentId: id2 }),
    ]
    const out = collectCustomEmojiDocumentIdsFromEntities(entities)
    expect(out.map(String)).toEqual(["111", "222"])
  })
})

describe("collectCustomEmojiDocumentIdsFromMessages", () => {
  it("dedupes ids across messages", () => {
    const id = bigInt(42)
    const ent: Api.TypeMessageEntity[] = [
      new Api.MessageEntityCustomEmoji({ offset: 0, length: 1, documentId: id }),
    ]
    const m1 = new Api.Message({ id: 1, message: "a", entities: ent, date: 1 })
    const m2 = new Api.Message({ id: 2, message: "b", entities: ent, date: 2 })
    const out = collectCustomEmojiDocumentIdsFromMessages([m1, m2])
    expect(out.length).toBe(1)
    expect(String(out[0])).toBe("42")
  })
})
