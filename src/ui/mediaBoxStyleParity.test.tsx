/**
 * media-dimension-reservation (2026-08-02) — core invariant (AC8's automated floor, [FIX G3]).
 * Asserts MessageMediaView threads the SAME --msg-media-w/--msg-media-ar box vars
 * into every lifecycle state (pending/loading/loaded) for video, GIF, and sticker —
 * not just some of them. This is the test that would catch "wired pending+loading,
 * forgot the loaded branch" — the single most likely implementation mistake.
 * Feature: .tlk/features/2026-08-02-media-dimension-reservation/
 */
import type { Api } from "teleproto"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"
import { MessageMediaView } from "./MessageMediaView"

vi.mock("./useMessageMediaBlob", () => ({
  useMessageMediaBlob: vi.fn(),
}))
import { useMessageMediaBlob } from "./useMessageMediaBlob"

function setBlobState(state: unknown) {
  vi.mocked(useMessageMediaBlob).mockReturnValue([state, vi.fn(), vi.fn()] as never)
}

const noopT = (key: string) => key

function videoMessage(): Api.Message {
  return {
    className: "Message",
    id: 1,
    media: {
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "video/mp4",
        attributes: [{ className: "DocumentAttributeVideo", duration: 5, w: 1280, h: 720 }],
      },
    },
  } as unknown as Api.Message
}

/** Legacy image-backed animated GIF — no DocumentAttributeVideo, so it resolves to
 * placeholderType "gif" (GifDeferredPending/Loading) rather than "video". */
function gifMessage(): Api.Message {
  return {
    className: "Message",
    id: 2,
    media: {
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "image/gif",
        attributes: [
          { className: "DocumentAttributeAnimated" },
          { className: "DocumentAttributeImageSize", w: 480, h: 320 },
        ],
      },
    },
  } as unknown as Api.Message
}

function stickerMessage(): Api.Message {
  return {
    className: "Message",
    id: 3,
    media: {
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "image/webp",
        attributes: [
          { className: "DocumentAttributeSticker", alt: "", stickerset: {} },
          { className: "DocumentAttributeImageSize", w: 100, h: 150 },
        ],
      },
    },
  } as unknown as Api.Message
}

function renderView(message: Api.Message) {
  return render(
    <MessageMediaView
      message={message}
      client={null}
      noPreview={false}
      filterGifs={false}
      t={noopT}
    />,
  )
}

describe("video — same box vars across pending/loading/loaded (1280×720 → 320×180)", () => {
  beforeEach(() => {
    vi.mocked(useMessageMediaBlob).mockReset()
  })

  it("pending", () => {
    setBlobState({ k: "w" })
    renderView(videoMessage())
    const root = document.querySelector(".msg-video-deferred") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("320px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("320 / 180")
  })

  it("loading", () => {
    setBlobState({ k: "d" })
    renderView(videoMessage())
    const root = document.querySelector(".msg-media--video-fetch") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("320px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("320 / 180")
  })

  it("loaded", () => {
    setBlobState({ k: "v", u: "blob:video", loop: false })
    renderView(videoMessage())
    const root = document.querySelector(".msg-media--video") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("320px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("320 / 180")
  })
})

describe("GIF (legacy image-backed) — same box vars across pending/loading/loaded (480×320 → 320×213)", () => {
  beforeEach(() => {
    vi.mocked(useMessageMediaBlob).mockReset()
  })

  it("pending", () => {
    setBlobState({ k: "w" })
    renderView(gifMessage())
    const root = document.querySelector(".msg-gif-deferred") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("320px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("320 / 213")
  })

  it("loading", () => {
    setBlobState({ k: "d" })
    renderView(gifMessage())
    const root = document.querySelector(".msg-media--gif-fetch") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("320px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("320 / 213")
  })

  it("loaded (resolves as an image blob — the pre-existing photo-style wrapper)", () => {
    setBlobState({ k: "i", u: "blob:gif" })
    renderView(gifMessage())
    const root = document.querySelector(".msg-media--photo") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("320px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("320 / 213")
  })
})

describe("sticker — same box vars across pending/loading/loaded (100×150 → 93×140)", () => {
  beforeEach(() => {
    vi.mocked(useMessageMediaBlob).mockReset()
  })

  it("pending", () => {
    setBlobState({ k: "w" })
    renderView(stickerMessage())
    const root = document.querySelector(".media-placeholder--sticker") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("93px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("93 / 140")
  })

  it("loading", () => {
    setBlobState({ k: "d" })
    renderView(stickerMessage())
    const root = document.querySelector(".media-placeholder--sticker") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("93px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("93 / 140")
  })

  it("loaded", () => {
    setBlobState({ k: "i", u: "blob:sticker" })
    renderView(stickerMessage())
    const root = document.querySelector(".msg-media--sticker") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("93px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("93 / 140")
  })
})
