import type { Api } from "teleproto"
import { Api as ApiRt } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { describe, expect, it } from "vitest"
import {
  getDayMailRailHeadlineParts,
  getDocumentTypeLabel,
  getMessageMediaTypeLabel,
  getReplyToPreviewText,
  getRepliedMessagePreviewText,
} from "./dialogPreview"

function dialogWithMessage(msg: unknown): Dialog {
  return { message: msg as Api.Message } as Dialog
}

const t = (k: string) => k

function doc(
  attrs: { className: string; [k: string]: unknown }[],
  mime?: string,
): Api.Document {
  return {
    className: "Document" as const,
    attributes: attrs,
    mimeType: mime ?? "",
  } as unknown as Api.Document
}

describe("getDocumentTypeLabel — attribute-based", () => {
  it("sticker attribute → previewSticker", () => {
    expect(
      getDocumentTypeLabel(doc([{ className: "DocumentAttributeSticker" }]), t),
    ).toBe("chat.previewSticker")
  })

  it("custom emoji attribute → previewCustomEmoji", () => {
    expect(
      getDocumentTypeLabel(doc([{ className: "DocumentAttributeCustomEmoji" }]), t),
    ).toBe("chat.previewCustomEmoji")
  })

  it("video note attribute → previewVideoNote", () => {
    expect(
      getDocumentTypeLabel(
        doc([{ className: "DocumentAttributeVideo", roundMessage: true }]),
        t,
      ),
    ).toBe("chat.previewVideoNote")
  })

  it("voice audio attribute → previewVoice", () => {
    expect(
      getDocumentTypeLabel(
        doc([{ className: "DocumentAttributeAudio", voice: true }]),
        t,
      ),
    ).toBe("chat.previewVoice")
  })

  it("non-voice audio attribute → previewAudio", () => {
    expect(
      getDocumentTypeLabel(
        doc([{ className: "DocumentAttributeAudio", voice: false }]),
        t,
      ),
    ).toBe("chat.previewAudio")
  })

  it("animated attribute → previewGif", () => {
    expect(
      getDocumentTypeLabel(
        doc([{ className: "DocumentAttributeAnimated" }]),
        t,
      ),
    ).toBe("chat.previewGif")
  })
})

describe("getDocumentTypeLabel — MIME fallbacks", () => {
  it("video MIME → previewVideo", () => {
    expect(getDocumentTypeLabel(doc([], "video/mp4"), t)).toBe("chat.previewVideo")
  })

  it("audio MIME → previewAudio", () => {
    expect(getDocumentTypeLabel(doc([], "audio/mpeg"), t)).toBe("chat.previewAudio")
  })

  it("application/ogg → previewAudio", () => {
    expect(getDocumentTypeLabel(doc([], "application/ogg"), t)).toBe("chat.previewAudio")
  })

  it("image MIME → previewPhoto", () => {
    expect(getDocumentTypeLabel(doc([], "image/webp"), t)).toBe("chat.previewPhoto")
  })

  it("unknown MIME → previewFile", () => {
    expect(getDocumentTypeLabel(doc([], "application/pdf"), t)).toBe("chat.previewFile")
  })

  it("empty attributes and no MIME → previewFile", () => {
    expect(getDocumentTypeLabel(doc([]), t)).toBe("chat.previewFile")
  })
})

describe("getMessageMediaTypeLabel", () => {
  it("MessageMediaPhoto → previewPhoto", () => {
    const m = {
      className: "Message" as const,
      id: 1,
      media: { className: "MessageMediaPhoto" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("chat.previewPhoto")
  })

  it("MessageMediaGeo → previewLocation", () => {
    const m = {
      className: "Message" as const,
      id: 2,
      media: { className: "MessageMediaGeo" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("chat.previewLocation")
  })

  it("MessageMediaContact → previewContact", () => {
    const m = {
      className: "Message" as const,
      id: 3,
      media: { className: "MessageMediaContact" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("chat.previewContact")
  })

  it("MessageMediaDice → previewDice", () => {
    const m = {
      className: "Message" as const,
      id: 4,
      media: { className: "MessageMediaDice" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("chat.previewDice")
  })

  it("MessageMediaUnsupported → previewUnsupported", () => {
    const m = {
      className: "Message" as const,
      id: 5,
      media: { className: "MessageMediaUnsupported" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("chat.previewUnsupported")
  })

  it("MessageMediaWebPage with no message text → previewLink", () => {
    const m = {
      className: "Message" as const,
      id: 6,
      message: "",
      media: { className: "MessageMediaWebPage" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("chat.previewLink")
  })

  it("MessageMediaWebPage with message text → returns the text", () => {
    const m = {
      className: "Message" as const,
      id: 7,
      message: "https://example.com",
      media: { className: "MessageMediaWebPage" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("https://example.com")
  })

  it("MessageMediaEmpty with no inline document → previewEmpty", () => {
    const m = {
      className: "Message" as const,
      id: 8,
      media: { className: "MessageMediaEmpty" as const },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("chat.previewEmpty")
  })

  it("rich-only message (no media, no plain text) → rich excerpt/label, not previewEmpty (AC-R3)", () => {
    const rm = new ApiRt.RichMessage({
      blocks: [new ApiRt.PageBlockParagraph({ text: new ApiRt.TextPlain({ text: "The article opening" }) })],
      photos: [],
      documents: [],
    } as never)
    const m = { className: "Message" as const, id: 9, richMessage: rm } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t)).toBe("The article opening")

    const empty = new ApiRt.RichMessage({ blocks: [], photos: [], documents: [] } as never)
    const m2 = { className: "Message" as const, id: 10, richMessage: empty } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m2, t)).toBe("chat.previewRichMessage")
  })
})

describe("getReplyToPreviewText", () => {
  it("returns message text when present", () => {
    const m = {
      className: "Message" as const,
      id: 1,
      message: "Hello world",
    } as unknown as Api.Message
    expect(getReplyToPreviewText(m, t)).toBe("Hello world")
  })

  it("truncates long text to maxLength with ellipsis", () => {
    const long = "a".repeat(100)
    const m = {
      className: "Message" as const,
      id: 2,
      message: long,
    } as unknown as Api.Message
    const result = getReplyToPreviewText(m, t, 20)
    expect(result.length).toBeLessThanOrEqual(20)
    expect(result.endsWith("…")).toBe(true)
  })

  it("falls back to media type label when message is empty", () => {
    const m = {
      className: "Message" as const,
      id: 3,
      message: "",
      media: { className: "MessageMediaPhoto" as const },
    } as unknown as Api.Message
    expect(getReplyToPreviewText(m, t)).toBe("chat.previewPhoto")
  })

  it("collapses whitespace in preview text", () => {
    const m = {
      className: "Message" as const,
      id: 4,
      message: "line one\n  line two",
    } as unknown as Api.Message
    expect(getReplyToPreviewText(m, t)).toBe("line one line two")
  })
})

describe("getRepliedMessagePreviewText", () => {
  it("uses Message text like getReplyToPreviewText", () => {
    const m = {
      className: "Message" as const,
      id: 9,
      message: "Prior line",
    } as unknown as Api.Message
    expect(getRepliedMessagePreviewText(m, t)).toBe("Prior line")
  })

  it("returns null when message is undefined", () => {
    expect(getRepliedMessagePreviewText(undefined, t)).toBeNull()
  })

  it("maps MessageService to previewService", () => {
    const svc = { className: "MessageService" as const } as unknown as Api.MessageService
    expect(getRepliedMessagePreviewText(svc, t)).toBe("chat.previewService")
  })
})

describe("getDayMailRailHeadlineParts", () => {
  it("incoming text → said + excerpt", () => {
    const d = dialogWithMessage({
      className: "Message" as const,
      message: "Hello",
      out: false,
    })
    expect(getDayMailRailHeadlineParts(d, t)).toEqual({
      verb: "letters.dayMailSaid",
      content: "Hello",
    })
  })

  it("outgoing text → sent + excerpt", () => {
    const d = dialogWithMessage({
      className: "Message" as const,
      message: "Hi there",
      out: true,
    })
    expect(getDayMailRailHeadlineParts(d, t)).toEqual({
      verb: "letters.dayMailSent",
      content: "Hi there",
    })
  })

  it("photo-only → sent + media label", () => {
    const d = dialogWithMessage({
      className: "Message" as const,
      message: "",
      media: { className: "MessageMediaPhoto" as const },
    })
    expect(getDayMailRailHeadlineParts(d, t)).toEqual({
      verb: "letters.dayMailSent",
      content: "chat.previewPhoto",
    })
  })

  it("webpage-only → shared + link label", () => {
    const d = dialogWithMessage({
      className: "Message" as const,
      message: "",
      media: { className: "MessageMediaWebPage" as const },
    })
    expect(getDayMailRailHeadlineParts(d, t)).toEqual({
      verb: "letters.dayMailShared",
      content: "chat.previewLink",
    })
  })

  it("forwarded → forwarded + preview from media hint", () => {
    const d = dialogWithMessage({
      className: "Message" as const,
      message: "",
      fwdFrom: { date: 1 },
      media: { className: "MessageMediaPhoto" as const },
    })
    const r = getDayMailRailHeadlineParts(d, t)
    expect(r.verb).toBe("letters.dayMailForwarded")
    expect(r.content).toBe("chat.previewPhoto")
  })

  it("lowercases first letter of media label for day-mail locale", () => {
    const tPhoto = (k: string) => {
      if (k === "chat.previewPhoto") return "Photo"
      return k
    }
    const d = dialogWithMessage({
      className: "Message" as const,
      message: "",
      media: { className: "MessageMediaPhoto" as const },
    })
    expect(getDayMailRailHeadlineParts(d, tPhoto, 96, "en")).toEqual({
      verb: "letters.dayMailSent",
      content: "photo",
    })
  })

  it("service → posted + previewService", () => {
    const d = dialogWithMessage({
      className: "MessageService" as const,
    })
    expect(getDayMailRailHeadlineParts(d, t)).toEqual({
      verb: "letters.dayMailPosted",
      content: "chat.previewService",
    })
  })
})
