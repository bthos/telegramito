import type { Api } from "telegram"
import { describe, expect, it } from "vitest"
import {
  getDocumentTypeLabel,
  getMessageMediaTypeLabel,
  getReplyToPreviewText,
} from "./dialogPreview"

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
