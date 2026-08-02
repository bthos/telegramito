import { describe, expect, it } from "vitest"
import type { Api } from "telegram"
import { getMediaBoxDimensions, mediaBoxStyleVars } from "./mediaBoxDimensions"

function photoMessage(sizes: Array<{ w: number; h: number }>): Api.Message {
  return {
    className: "Message",
    media: {
      className: "MessageMediaPhoto",
      photo: {
        className: "Photo",
        sizes: sizes.map((s) => ({ className: "PhotoSize", type: "y", ...s })),
      },
    },
  } as unknown as Api.Message
}

function videoMessage(w: number, h: number, extra?: Partial<Api.DocumentAttributeVideo>): Api.Message {
  return {
    className: "Message",
    media: {
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "video/mp4",
        attributes: [
          { className: "DocumentAttributeVideo", duration: 5, w, h, ...extra },
        ],
      },
    },
  } as unknown as Api.Message
}

describe("getMediaBoxDimensions", () => {
  it("picks the largest photo size and preserves aspect ratio within the box cap", () => {
    const m = photoMessage([
      { w: 90, h: 60 },
      { w: 1600, h: 1067 },
      { w: 320, h: 213 },
    ])
    const dims = getMediaBoxDimensions(m)
    expect(dims).not.toBeNull()
    // 1600x1067 clamped to width<=320 -> height ~213
    expect(dims!.width).toBe(320)
    expect(dims!.height).toBe(213)
  })

  it("clamps a tall photo by height instead of width", () => {
    const m = photoMessage([{ w: 600, h: 1800 }])
    const dims = getMediaBoxDimensions(m)!
    expect(dims.height).toBe(288)
    expect(dims.width).toBe(96)
  })

  it("reads DocumentAttributeVideo dimensions", () => {
    const m = videoMessage(1280, 720)
    const dims = getMediaBoxDimensions(m)!
    expect(dims.width).toBe(320)
    expect(dims.height).toBe(180)
  })

  it("returns null for round video notes", () => {
    const m = videoMessage(240, 240, { roundMessage: true })
    expect(getMediaBoxDimensions(m)).toBeNull()
  })

  it("returns null for stickers", () => {
    const m = {
      className: "Message",
      media: {
        className: "MessageMediaDocument",
        document: {
          className: "Document",
          mimeType: "image/webp",
          attributes: [{ className: "DocumentAttributeSticker", alt: "", stickerset: {} }],
        },
      },
    } as unknown as Api.Message
    expect(getMediaBoxDimensions(m)).toBeNull()
  })

  it("returns null when no size metadata is present", () => {
    const m = photoMessage([])
    expect(getMediaBoxDimensions(m)).toBeNull()
  })
})

describe("mediaBoxStyleVars", () => {
  it("returns undefined for null dims", () => {
    expect(mediaBoxStyleVars(null)).toBeUndefined()
  })

  it("formats width/aspect-ratio custom properties", () => {
    expect(mediaBoxStyleVars({ width: 320, height: 180 })).toEqual({
      "--msg-media-w": "320px",
      "--msg-media-ar": "320 / 180",
    })
  })
})
