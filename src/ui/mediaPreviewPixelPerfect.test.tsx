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
          viewerContext={{ sentAtLabel: "12:34", caption: "", peerTitle: "Peer" }}
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
          viewerContext={{ sentAtLabel: "09:15", caption: "", peerTitle: "Peer" }}
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
          viewerContext={{ sentAtLabel: "10:00", caption: "", peerTitle: "Peer" }}
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

describe("media preview CSS contracts", () => {
  const mediaStatesCss = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../styles/media-states.css"),
    "utf8",
  )

  it("stylesheet defines rect 280/200 and GIF 240/200 aspects (AC-V1, AC-G1)", () => {
    expect(mediaStatesCss).toContain("aspect-ratio: 280 / 200")
    expect(mediaStatesCss).toContain("aspect-ratio: 240 / 200")
  })

  it("stylesheet defines loading foot without hairline (AC-L1)", () => {
    expect(mediaStatesCss).toMatch(/\.media-loading-foot[\s\S]*padding:\s*6px 4px 2px/)
    expect(mediaStatesCss).toMatch(/\.media-loading-foot[\s\S]*border-top:\s*none/)
  })
})
