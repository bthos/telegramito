/**
 * media-dimension-reservation (2026-08-02) — style-prop-reaches-root checks (AC1, AC2).
 * Feature: .tlk/features/2026-08-02-media-dimension-reservation/
 */
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import {
  GifDeferredLoading,
  GifDeferredPending,
  VideoDeferredLoading,
  VideoDeferredPending,
} from "./messageMediaDeferredViews"

const reservedStyle = { "--msg-media-w": "200px", "--msg-media-ar": "200 / 150" } as React.CSSProperties

function videoMessage() {
  return {
    className: "Message",
    media: {
      className: "MessageMediaDocument",
      document: {
        className: "Document",
        mimeType: "video/mp4",
        attributes: [{ className: "DocumentAttributeVideo", duration: 5, w: 1280, h: 720 }],
      },
    },
  } as unknown as import("teleproto").Api.Message
}

describe("VideoDeferredPending — style prop reaches root (AC1)", () => {
  it("applies the passed style to the .msg-video-deferred root", () => {
    render(
      <VideoDeferredPending
        resolved={videoMessage()}
        onActivate={vi.fn()}
        tapLabel="Load"
        footHint="Tap to load"
        sentAtLabel={null}
        style={reservedStyle}
      />,
    )
    const root = document.querySelector(".msg-video-deferred") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("200px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("200 / 150")
  })
})

describe("VideoDeferredLoading — style prop reaches root (AC1)", () => {
  it("applies the passed style to the .msg-media--video-fetch root", () => {
    render(<VideoDeferredLoading hint="Downloading…" timeLabel={null} style={reservedStyle} />)
    const root = document.querySelector(".msg-media--video-fetch") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("200px")
  })
})

describe("GifDeferredPending — style prop reaches root (AC2)", () => {
  it("applies the passed style to the .msg-gif-deferred root", () => {
    render(
      <GifDeferredPending
        onActivate={vi.fn()}
        tapLabel="Load"
        footHint="Tap to load"
        sentAtLabel={null}
        style={reservedStyle}
      />,
    )
    const root = document.querySelector(".msg-gif-deferred") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("200px")
  })
})

describe("GifDeferredLoading — style prop reaches root (AC2)", () => {
  it("applies the passed style to the .msg-media--gif-fetch root", () => {
    render(<GifDeferredLoading hint="Downloading…" timeLabel={null} style={reservedStyle} />)
    const root = document.querySelector(".msg-media--gif-fetch") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("200px")
  })
})
