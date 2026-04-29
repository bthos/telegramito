import { Api } from "telegram"
import { describe, expect, it } from "vitest"
import {
  availableEntryToTypeReaction,
  pickReactionDisplayDocument,
} from "./availableReactionsCache"

function entry(
  reaction: string,
  staticIcon?: Partial<Api.Document>,
  centerIcon?: Partial<Api.Document>,
): Api.AvailableReaction {
  return {
    className: "AvailableReaction" as const,
    reaction,
    staticIcon: staticIcon
      ? ({ className: "Document" as const, ...staticIcon } as Api.Document)
      : undefined,
    centerIcon: centerIcon
      ? ({ className: "Document" as const, ...centerIcon } as Api.Document)
      : undefined,
  } as unknown as Api.AvailableReaction
}

describe("availableEntryToTypeReaction", () => {
  it("returns ReactionEmoji when staticIcon has no custom-emoji attribute", () => {
    const e = entry("👍", { id: 1 as unknown as Api.Document["id"], attributes: [] })
    const r = availableEntryToTypeReaction(e)
    expect(r.className).toBe("ReactionEmoji")
    expect((r as Api.ReactionEmoji).emoticon).toBe("👍")
  })

  it("returns ReactionCustomEmoji when staticIcon has DocumentAttributeCustomEmoji", () => {
    const e = entry("👍", {
      id: 42 as unknown as Api.Document["id"],
      attributes: [{ className: "DocumentAttributeCustomEmoji" } as unknown as Api.TypeDocumentAttribute],
    })
    const r = availableEntryToTypeReaction(e)
    expect(r.className).toBe("ReactionCustomEmoji")
    expect(String((r as Api.ReactionCustomEmoji).documentId)).toBe("42")
  })

  it("falls back to ReactionEmoji when staticIcon is undefined", () => {
    const e = entry("❤️")
    const r = availableEntryToTypeReaction(e)
    expect(r.className).toBe("ReactionEmoji")
    expect((r as Api.ReactionEmoji).emoticon).toBe("❤️")
  })

  it("handles non-AvailableReaction className gracefully", () => {
    const bad = { className: "Something", reaction: "🔥" } as unknown as Api.AvailableReaction
    const r = availableEntryToTypeReaction(bad)
    expect(r.className).toBe("ReactionEmoji")
  })
})

describe("pickReactionDisplayDocument", () => {
  it("prefers centerIcon when present and is a Document with id", () => {
    const center = { id: 99 as unknown as Api.Document["id"] }
    const e = entry("😂", { id: 1 as unknown as Api.Document["id"] }, center)
    const d = pickReactionDisplayDocument(e)
    expect((d as Api.Document).id).toBe(99)
  })

  it("falls back to staticIcon when centerIcon is absent", () => {
    const e = entry("😂", { id: 7 as unknown as Api.Document["id"] })
    const d = pickReactionDisplayDocument(e)
    expect((d as Api.Document).id).toBe(7)
  })

  it("returns undefined for non-AvailableReaction", () => {
    const bad = { className: "Something" } as unknown as Api.AvailableReaction
    expect(pickReactionDisplayDocument(bad)).toBeUndefined()
  })
})
