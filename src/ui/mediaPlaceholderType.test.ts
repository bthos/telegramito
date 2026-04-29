/**
 * Unit tests for resolveMediaPlaceholderType helper.
 *
 * The helper is a pure function that maps (resolved: Api.Message, d: Api.Document | null)
 * to a MediaPlaceholderType string.  We test all 7 branches defined in the tech-plan plus
 * the safe fallback, using minimal hand-crafted fakes — no GramJS runtime required.
 *
 * The implementation lives in src/ui/MediaPlaceholder.tsx once Cmok builds it.
 * Bagnik gates on these tests passing after Cmok's build.
 */
import { describe, expect, it } from "vitest"
import { resolveMediaPlaceholderType } from "./MediaPlaceholder"

// ---------------------------------------------------------------------------
// Minimal fakes — only the fields the helper inspects
// ---------------------------------------------------------------------------

function makeAttr(className: string, extra: Record<string, unknown> = {}) {
  return { className, ...extra }
}

function makeDoc(overrides: {
  mimeType?: string
  attributes?: { className: string; [k: string]: unknown }[]
}) {
  return {
    mimeType: overrides.mimeType ?? null,
    attributes: overrides.attributes ?? [],
    // Required by Api.Document shape but not inspected by the helper
    className: "Document",
    id: BigInt(1),
    accessHash: BigInt(0),
    fileReference: new Uint8Array(),
    date: 0,
    dcId: 1,
    size: BigInt(0),
    thumbs: [],
    videoThumbs: [],
  } as unknown as import("telegram").Api.Document
}

function makeMsg(mediaClassName?: string) {
  return {
    className: "Message",
    media: mediaClassName ? { className: mediaClassName } : null,
  } as unknown as import("telegram").Api.Message
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveMediaPlaceholderType", () => {
  // Branch 1: sticker
  it("returns 'sticker' for a document with DocumentAttributeSticker", () => {
    const d = makeDoc({ attributes: [makeAttr("DocumentAttributeSticker")] })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("sticker")
  })

  // Branch 1b: custom emoji (also "sticker")
  it("returns 'sticker' for a document with DocumentAttributeCustomEmoji", () => {
    const d = makeDoc({ attributes: [makeAttr("DocumentAttributeCustomEmoji")] })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("sticker")
  })

  // Branch 2a: video via DocumentAttributeVideo
  it("returns 'video' for a document with DocumentAttributeVideo", () => {
    const d = makeDoc({
      mimeType: "video/mp4",
      attributes: [makeAttr("DocumentAttributeVideo")],
    })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("video")
  })

  // Branch 2b: video via mime type only (no attribute)
  it("returns 'video' for a document with video/* mime and no video attribute", () => {
    const d = makeDoc({ mimeType: "video/webm" })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("video")
  })

  // Branch 3: photo via image mime
  it("returns 'photo' for a document with image/* mime", () => {
    const d = makeDoc({ mimeType: "image/jpeg" })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("photo")
  })

  // Branch 4: voice
  it("returns 'voice' for a document with DocumentAttributeAudio where voice=true", () => {
    const d = makeDoc({
      mimeType: "audio/ogg",
      attributes: [makeAttr("DocumentAttributeAudio", { voice: true })],
    })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("voice")
  })

  // Branch 5: audio (non-voice)
  it("returns 'audio' for a document with DocumentAttributeAudio where voice=false", () => {
    const d = makeDoc({
      mimeType: "audio/mpeg",
      attributes: [makeAttr("DocumentAttributeAudio", { voice: false })],
    })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("audio")
  })

  // Branch 5b: audio attribute present but voice not set (falsy)
  it("returns 'audio' for a document with DocumentAttributeAudio and no voice field", () => {
    const d = makeDoc({
      mimeType: "audio/mp3",
      attributes: [makeAttr("DocumentAttributeAudio")],
    })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("audio")
  })

  // Branch 6: document fallback (d present, no recognised attributes/mime)
  it("returns 'attachment' for a generic document with unrecognised mime", () => {
    const d = makeDoc({ mimeType: "application/zip" })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("attachment")
  })

  // Branch 6b: document fallback — null mime
  it("returns 'attachment' for a document with null mime and no special attributes", () => {
    const d = makeDoc({})
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("attachment")
  })

  // Branch 7: no document, media is MessageMediaPhoto
  it("returns 'photo' when d is null and media is MessageMediaPhoto", () => {
    const msg = makeMsg("MessageMediaPhoto")
    expect(resolveMediaPlaceholderType(msg, null)).toBe("photo")
  })

  // Branch 8: safe fallback
  it("returns 'photo' as safe fallback when d is null and media is not a photo", () => {
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, null)).toBe("photo")
  })

  // Sticker takes priority over a document that also has video attribute
  it("returns 'sticker' (not video) when document has both sticker and video attributes", () => {
    const d = makeDoc({
      mimeType: "video/webm",
      attributes: [
        makeAttr("DocumentAttributeSticker"),
        makeAttr("DocumentAttributeVideo"),
      ],
    })
    const msg = makeMsg()
    expect(resolveMediaPlaceholderType(msg, d)).toBe("sticker")
  })
})
