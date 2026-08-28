/**
 * media-dimension-reservation (2026-08-02) — row-height estimate uses real media
 * dims for video/gif/sticker documents, same as it already does for photos.
 * Feature: .tlk/features/2026-08-02-media-dimension-reservation/
 */
import { describe, expect, it } from "vitest"
import type { Api } from "teleproto"
import type { ChatDatedItem } from "../ui/chatDatedItem"
import { estimateChatRowHeight } from "./chatRowHeightEstimate"

function msgRow(media: unknown): ChatDatedItem {
  return {
    kind: "msg",
    message: { className: "Message", media } as unknown as Api.Message,
  }
}

describe("estimateChatRowHeight — media.className === MessageMediaDocument (video/gif/sticker)", () => {
  it("uses real video dims when DocumentAttributeVideo is present (base 112 + height 180 + 24 = 316)", () => {
    const row = msgRow({
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "video/mp4",
        attributes: [{ className: "DocumentAttributeVideo", duration: 5, w: 1280, h: 720 }],
      },
    })
    expect(estimateChatRowHeight(row)).toBe(316)
  })

  it("uses real sticker dims when DocumentAttributeImageSize is present on a sticker doc (base 112 + height 140 + 24 = 276)", () => {
    const row = msgRow({
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "image/webp",
        attributes: [
          { className: "DocumentAttributeSticker", alt: "", stickerset: {} },
          { className: "DocumentAttributeImageSize", w: 100, h: 150 },
        ],
      },
    })
    expect(estimateChatRowHeight(row)).toBe(276)
  })

  it("falls back to the flat 288 estimate when no dimension metadata is present (audio doc)", () => {
    const row = msgRow({
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "audio/ogg",
        attributes: [{ className: "DocumentAttributeAudio", voice: false, duration: 42 }],
      },
    })
    expect(estimateChatRowHeight(row)).toBe(112 + 288)
  })

  it("falls back to the flat 288 estimate for a generic document attachment", () => {
    const row = msgRow({
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "application/pdf",
        attributes: [{ className: "DocumentAttributeFilename", fileName: "report.pdf" }],
      },
    })
    expect(estimateChatRowHeight(row)).toBe(112 + 288)
  })

  it("round video keeps the flat 288 fallback (getMediaBoxDimensions returns null for round video)", () => {
    const row = msgRow({
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "video/mp4",
        attributes: [{ className: "DocumentAttributeVideo", duration: 5, w: 240, h: 240, roundMessage: true }],
      },
    })
    expect(estimateChatRowHeight(row)).toBe(112 + 288)
  })

  it("MessageMediaWebPage with no document falls back to the flat 288 estimate unchanged", () => {
    const row = msgRow({ className: "MessageMediaWebPage" })
    expect(estimateChatRowHeight(row)).toBe(112 + 288)
  })
})
