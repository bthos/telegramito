/**
 * AC regression tests for media-preview-pixel-perfect (must-have preview + loading).
 * Feature: .tlk/features/2026-07-09-media-preview-pixel-perfect/
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { VoiceMessageInline, VoiceMessageLoadingRow } from "./VoiceMessageInline"
import { AudioTrackInline } from "./AudioTrackInline"
import { DocumentAttachmentInline } from "./DocumentAttachmentInline"
import {
  AudioTrackLoadingRow,
  DocumentAttachmentLoadingRow,
  VideoInlinePlayer,
} from "./MessageMediaView"
import { GifDeferredLoading, GifDeferredPending } from "./messageMediaDeferredViews"

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          chat: {
            previewAudio: "Audio",
            voicePlay: "Play voice",
            voicePause: "Pause voice",
            expandVoice: "Expand voice",
            voiceViewerDialog: "Voice message",
            imageViewerClose: "Close",
            voiceTranscriptLabel: "Transcript",
            voiceTranscriptPlaceholder: "No transcription",
            documentOpenPreview: "Open document",
            documentViewerDialog: "Document",
            documentPreviewStub: "Preview stub",
            fileSaveHint: "Save file",
            mediaDownloadProgress: "Downloading…",
            playVideo: "Play video",
          },
        },
      },
    },
  })
  return inst
}

function makeAudioDoc(voice = false) {
  return {
    className: "Document",
    id: BigInt(1),
    attributes: [{ className: "DocumentAttributeAudio", voice, duration: 42 }],
    mimeType: "audio/ogg",
  } as unknown as import("telegram").Api.Document
}

describe("VoiceMessageInline preview", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("renders 40×40 play, waveform, unplayed dot, sent time; no transcript link (AC-O1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <VoiceMessageInline
          src="blob:v"
          durationSec={42}
          unplayed
          viewerContext={{ sentAtLabel: "12:34", caption: "", peerTitle: "Peer", captionAbove: false }}
        />
      </I18nextProvider>,
    )
    const play = document.querySelector(".msg-voice-inline__play") as HTMLElement
    expect(play).toBeTruthy()
    expect(play.className).toContain("msg-voice-inline__play")
    expect(document.querySelector(".msg-voice-wave")).toBeTruthy()
    expect(document.querySelector(".msg-voice-inline__unplayed")).toBeTruthy()
    expect(screen.getByText("12:34")).toBeTruthy()
    expect(screen.queryByText(/read transcript/i)).toBeNull()
  })
})

describe("VoiceMessageLoadingRow", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("shows dedicated loading row with blue progress subline", () => {
    render(
      <I18nextProvider i18n={inst}>
        <VoiceMessageLoadingRow durationSec={42} hint="Downloading…" />
      </I18nextProvider>,
    )
    const row = document.querySelector(".msg-voice-inline--loading")
    expect(row).toBeTruthy()
    expect(document.querySelector(".msg-voice-inline__play--busy")).toBeTruthy()
    expect(document.querySelector(".msg-voice-inline__sub--progress")?.textContent).toBe("Downloading…")
  })
})

describe("AudioTrackInline preview", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("shows sent time in media-inline-meta-foot (AC-A1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <AudioTrackInline
          src="blob:a"
          doc={makeAudioDoc(false)}
          viewerContext={{ sentAtLabel: "09:15", caption: "", peerTitle: "Peer", captionAbove: false }}
        />
      </I18nextProvider>,
    )
    expect(document.querySelector(".media-inline-meta-foot")?.textContent).toBe("09:15")
  })
})

describe("AudioTrackLoadingRow", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("shows ring in cover and blue progress subline (AC-A2)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <AudioTrackLoadingRow doc={makeAudioDoc(false)} hint="Downloading…" />
      </I18nextProvider>,
    )
    expect(document.querySelector(".msg-audio-track__cover--busy")).toBeTruthy()
    expect(document.querySelector(".msg-audio-track__sub--progress")?.textContent).toContain("Downloading…")
  })
})

describe("DocumentAttachmentInline preview", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("has no inline Save link in preview (AC-D1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <DocumentAttachmentInline
          url="blob:d"
          name="report.pdf"
          sizeStr="1.2 MB"
          doc={null}
          viewerContext={{ sentAtLabel: "10:00", caption: "", peerTitle: "Peer", captionAbove: false }}
        />
      </I18nextProvider>,
    )
    expect(screen.queryByText(/^Save$/i)).toBeNull()
    expect(document.querySelector(".msg-doc-row__dl")).toBeNull()
  })
})

describe("DocumentAttachmentLoadingRow", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("puts progress text in blue subline (AC-D2)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <DocumentAttachmentLoadingRow
          name="report.pdf"
          sizeStr="1.2 MB"
          hint="Downloading…"
          timeLabel="10:00"
        />
      </I18nextProvider>,
    )
    const sub = document.querySelector(".msg-doc-row--loading .msg-doc-row__sub")
    expect(sub?.textContent).toContain("Downloading…")
    expect(document.querySelector(".msg-doc-row__icon--busy")).toBeTruthy()
  })
})

describe("VideoInlinePlayer chrome", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rect video: duration pill + play FAB, no expand; dblclick opens full (AC-V2, AC-V3)", () => {
    const onExpand = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <VideoInlinePlayer
          src="blob:v"
          loop={false}
          autoPlay={false}
          muted
          playLabel="Play"
          durationLabel="1:23"
          onExpand={onExpand}
        />
      </I18nextProvider>,
    )
    expect(document.querySelector(".msg-video-thumb__duration")).toBeTruthy()
    expect(document.querySelector(".msg-video-thumb-play-fab")).toBeTruthy()
    expect(document.querySelector(".msg-video-thumb__expand")).toBeNull()
    fireEvent.doubleClick(document.querySelector(".msg-video-wrap")!)
    expect(onExpand).toHaveBeenCalledOnce()
  })

  it("GIF: badge only — no duration pill or play FAB (AC-G1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <VideoInlinePlayer
          src="blob:g"
          loop
          autoPlay
          muted
          playLabel="Play"
          onExpand={vi.fn()}
          showGifTag
        />
      </I18nextProvider>,
    )
    expect(screen.getByText("GIF")).toBeTruthy()
    expect(document.querySelector(".msg-video-thumb__duration")).toBeNull()
    expect(document.querySelector(".msg-video-thumb-play-fab")).toBeNull()
  })

  it("round video: duration pill with round modifier (AC-R1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <VideoInlinePlayer
          src="blob:r"
          loop={false}
          autoPlay={false}
          muted
          playLabel="Play"
          round
          durationLabel="0:45"
          onExpand={vi.fn()}
        />
      </I18nextProvider>,
    )
    expect(document.querySelector(".msg-video-wrap--round")).toBeTruthy()
    expect(document.querySelector(".msg-video-thumb__duration--round")).toBeTruthy()
  })
})

describe("GifDeferredPending/Loading — no play or pause affordance (AC10)", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("tap-to-load GIF placeholder renders no play/pause element", () => {
    render(
      <I18nextProvider i18n={inst}>
        <GifDeferredPending onActivate={vi.fn()} tapLabel="Load" footHint="Tap to load" sentAtLabel={null} />
      </I18nextProvider>,
    )
    expect(document.querySelector(".msg-video-thumb-play-fab")).toBeNull()
    expect(document.querySelector("[class*='play']")).toBeNull()
    expect(document.querySelector("[class*='pause']")).toBeNull()
  })

  it("downloading GIF placeholder renders no play/pause element", () => {
    render(
      <I18nextProvider i18n={inst}>
        <GifDeferredLoading hint="Downloading…" timeLabel={null} />
      </I18nextProvider>,
    )
    expect(document.querySelector(".msg-video-thumb-play-fab")).toBeNull()
    expect(document.querySelector("[class*='play']")).toBeNull()
    expect(document.querySelector("[class*='pause']")).toBeNull()
  })
})

describe("media preview CSS contracts", () => {
  const mediaStatesCss = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../styles/media-states.css"),
    "utf8",
  )

  // media-dimension-reservation (2026-08-02) replaced the literal rect/GIF aspect
  // ratios with var(--msg-media-ar, <fallback>) so real per-message dimensions can
  // override them — 280/200 and 240/200 now only survive as the no-metadata
  // fallback values inside those var() calls, not as standalone declarations.
  it("stylesheet defines rect 280/200 and GIF 240/200 aspects as var() fallbacks (AC-V1, AC-G1)", () => {
    expect(mediaStatesCss).toContain("var(--msg-media-ar, 280 / 200)")
    expect(mediaStatesCss).toContain("var(--msg-media-ar, 240 / 200)")
  })

  it("stylesheet defines loading foot without hairline (AC-L1)", () => {
    expect(mediaStatesCss).toMatch(/\.media-loading-foot[\s\S]*padding:\s*6px 4px 2px/)
    expect(mediaStatesCss).toMatch(/\.media-loading-foot[\s\S]*border-top:\s*none/)
  })

  it("scopes the sticker reserved-box rule to the chat bubble, not the bare .msg-sticker-img class (media-dimension-reservation AC4)", () => {
    expect(mediaStatesCss).toContain(".msg-media--sticker .msg-sticker-img")
    const scopedRuleMatch = mediaStatesCss.match(/\.msg-media--sticker \.msg-sticker-img\s*\{[^}]*\}/)
    expect(scopedRuleMatch).not.toBeNull()
    expect(scopedRuleMatch![0]).toContain("var(--msg-media-w")
    // The bare rule (shared with the portaled full-view modal's --lg variant) must
    // NOT carry the reserved-box vars, or the modal would inherit the small bubble box.
    const bareRuleMatch = mediaStatesCss.match(/(?<!--sticker )\.msg-sticker-img\s*\{[^}]*\}/)
    expect(bareRuleMatch).not.toBeNull()
    expect(bareRuleMatch![0]).not.toContain("var(--msg-media-w")
  })

  // Regression (2026-08-02): the loading-state root div for video/gif/photo/doc
  // carries BOTH the generic `.msg-media` class and a more specific `.msg-media--X-fetch`
  // modifier. `.msg-media { max-width: 100% }` lives in app.css, which is @imported
  // *after* media-states.css (src/index.css) — so on an equal-specificity tie for the
  // `max-width` property, app.css's generic rule wins the cascade over a bare
  // `.msg-media--X-fetch` selector, silently dropping the reserved box and letting the
  // loading placeholder grow to whatever ancestor has a definite width (observed as
  // the loading placeholder expanding to full screen width after tapping to load).
  // The fix is a compound selector (`.msg-media.msg-media--X-fetch`) that always wins
  // regardless of import order. These tests fail if that compound form regresses back
  // to a bare single-class selector.
  it.each([
    ["video", "280px"],
    ["gif", "240px"],
    ["photo", "280px"],
  ])(
    "loading-state max-width for %s uses the compound .msg-media.msg-media--%s-fetch selector, not a bare one",
    (kind) => {
      const compound = `.msg-media.msg-media--${kind}-fetch {`
      expect(mediaStatesCss).toContain(compound)
      const bareRuleRe = new RegExp(`(?<!\\.msg-media)\\.msg-media--${kind}-fetch\\s*\\{`)
      expect(mediaStatesCss).not.toMatch(bareRuleRe)
    },
  )

  // Regression (2026-08-02, found live during AC8 verification): every real render
  // site wraps `<MessageMediaView>` in a `.msg-media-thumb` div (LettersPassageMessage.
  // tsx / ChatMessageList.tsx), and app.css separately defines
  // `.msg-media-thumb .msg-media { max-width: 100% }` — ALSO 2-class specificity, ALSO
  // later in the cascade than media-states.css. The `.msg-media.msg-media--X-fetch`
  // compound fix above (specificity 0,2,0) ties with THAT rule too and still loses on
  // import order, so the "loading placeholder expands to full width" bug reappears
  // for every real chat message even though the video/gif/photo-fetch it.each above
  // stays green. Verified live via getBoundingClientRect(): before this fix, a loading
  // video rendered at 1077px instead of its reserved ~320px box. Fix: an explicit
  // `.msg-media-thumb .msg-media.msg-media--X-fetch` selector (specificity 0,3,0) that
  // wins unconditionally instead of relying on import order for a second tie.
  it.each(["video", "gif", "photo"])(
    "loading-state max-width for %s also has a .msg-media-thumb ancestor-scoped rule (beats the .msg-media-thumb .msg-media collision)",
    (kind) => {
      const scoped = `.msg-media-thumb .msg-media.msg-media--${kind}-fetch`
      expect(mediaStatesCss).toContain(scoped)
    },
  )

  // Documents are explicitly out of scope for media-dimension-reservation (spec
  // Decision 4 / AC7) — unlike video/gif/photo above, the doc-fetch selector must
  // stay the pre-existing bare single-class form. Bumping it to the compound form
  // swaps the existing loading/loaded doc-row size mismatch for a different one
  // (long-filename rows narrow while downloading, widen again on completion), which
  // is a regression into an out-of-scope media kind, not a fix.
  it("loading-state max-width for document attachments keeps the pre-existing bare .msg-media--doc-fetch selector (out of scope for this feature)", () => {
    expect(mediaStatesCss).toContain(".msg-media--doc-fetch {")
    expect(mediaStatesCss).not.toMatch(/\.msg-media\.msg-media--doc-fetch\s*\{/)
  })
})
