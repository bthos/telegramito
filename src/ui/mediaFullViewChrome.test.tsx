/**
 * AC regression tests for media-full-view-chrome (full-screen / expanded viewer chrome).
 * Feature: .tlk/features/2026-07-10-media-full-view-chrome/
 * Tech plan: .tlk/features/2026-07-10-media-full-view-chrome/tech-plan.md
 *
 * Many tests below are RED until Cmok implements the changes in the tech plan.
 * GifFullViewer stub (src/ui/GifFullViewer.tsx) was deleted after validation;
 * Cmok must create the real implementation.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { VideoFullViewer } from "./VideoFullViewer"
import { PhotoMediaViewer } from "./PhotoMediaViewer"
import { GifFullViewer } from "./GifFullViewer"
import { AudioTrackInline } from "./AudioTrackInline"
import { DocumentAttachmentInline } from "./DocumentAttachmentInline"
import { VoiceMessageInline } from "./VoiceMessageInline"

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          chat: {
            previewAudio: "Audio",
            videoPlay: "Play",
            videoPause: "Pause",
            videoViewerDialog: "Video viewer",
            videoVolume: "Volume",
            imageViewerClose: "Close",
            imageViewerBackdrop: "Close enlarged image",
            gifViewerDialog: "GIF viewer",
            gifActionFavourite: "Favourite",
            gifActionForward: "Forward",
            gifActionSave: "Save",
            audioViewerDialog: "Music player",
            audioSkipPrev: "Previous track",
            audioSkipNext: "Next track",
            voicePlay: "Play voice",
            voicePause: "Pause voice",
            voiceViewerDialog: "Voice message",
            voiceTranscriptLabel: "Transcript",
            voiceTranscriptPlaceholder: "No transcription available",
            voicePlaybackSpeed: "Playback speed: {{speed}}×",
            expandVoice: "Expand voice",
            documentOpenPreview: "Open document",
            documentViewerDialog: "File preview",
            documentPreviewStub: "Preview stub",
            documentOverflow: "More options",
            documentPageCount_one: "{{count}} page",
            documentPageCount_other: "{{count}} pages",
            fileDownloadLabel: "Download file",
            fileSaveHint: "Save file",
            mediaDownloadProgress: "Downloading…",
            playVideo: "Play video",
            photoActionFavourite: "Favourite",
            photoActionSave: "Save",
            photoActionShare: "Share",
            mediaViewerPeerFallback: "Unknown",
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
    attributes: [{ className: "DocumentAttributeAudio", voice, duration: 42, title: "Test Song", performer: "Test Artist" }],
    mimeType: "audio/ogg",
  } as unknown as import("teleproto").Api.Document
}

// ─── VideoFullViewer ───────────────────────────────────────────────────────────

describe("VideoFullViewer full chrome", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderViewer(extra: Record<string, unknown> = {}) {
    render(
      <I18nextProvider i18n={inst}>
        <VideoFullViewer
          src="blob:v"
          loop={false}
          onClose={vi.fn()}
          ariaLabel="Video viewer"
          labelClose="Close"
          title="Alice"
          sentAtLabel="12:34"
          labelPlay="Play"
          labelPause="Pause"
          durationSec={90}
          labelVolume="Volume"
          {...extra}
        />
      </I18nextProvider>,
    )
  }

  it("has role=dialog and aria-modal=true (AC-FF1)", () => {
    renderViewer()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
  })

  it("top bar shows title, sentAt, and close button (AC-VF3)", () => {
    renderViewer()
    expect(screen.getByText("Alice")).toBeTruthy()
    expect(screen.getByText("12:34")).toBeTruthy()
    expect(screen.getByLabelText("Close")).toBeTruthy()
  })

  it("transport row has play-pause button and time display (AC-VF2)", () => {
    renderViewer()
    const pp = document.querySelector(".video-full-viewer__pp")
    expect(pp).toBeTruthy()
    const time = document.querySelector(".video-full-viewer__time")
    expect(time).toBeTruthy()
  })

  it("transport row has seekable scrub (range input) and volume button (AC-VF2)", () => {
    renderViewer()
    // Scrub must be a functional range input, not a decorative div
    const scrubInput = document.querySelector(".video-full-viewer__scrub-input") as HTMLInputElement | null
    expect(scrubInput, "seekable scrub <input type=range> missing").toBeTruthy()
    expect(scrubInput?.type ?? scrubInput?.getAttribute("type")).toBe("range")
    // Volume button
    const volume = document.querySelector(".video-full-viewer__volume")
    expect(volume, "volume button missing").toBeTruthy()
  })

  it("round variant applies --round CSS class (AC-FF2)", () => {
    renderViewer({ variant: "round" })
    expect(document.querySelector(".video-full-viewer__player-wrap--round")).toBeTruthy()
    expect(document.querySelector(".video-full-viewer__video--round")).toBeTruthy()
  })
})

// ─── GifFullViewer ─────────────────────────────────────────────────────────────

describe("GifFullViewer", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders dark overlay with role=dialog, aria-modal, and data-media-state=full (AC-GF1, AC-FF1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <GifFullViewer
          src="blob:g"
          caption="A funny cat"
          onClose={vi.fn()}
          ariaLabel="GIF viewer"
          labelClose="Close"
          labelFavourite="Favourite"
          labelForward="Forward"
          labelSave="Save"
        />
      </I18nextProvider>,
    )
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
    expect(dialog?.getAttribute("data-media-state")).toBe("full")
    expect(document.querySelector(".gif-full-viewer")).toBeTruthy()
    expect(document.querySelector(".gif-full-viewer__video")).toBeTruthy()
  })

  it("shows caption text when provided (AC-GF1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <GifFullViewer
          src="blob:g"
          caption="Look at this"
          onClose={vi.fn()}
          ariaLabel="GIF viewer"
          labelClose="Close"
          labelFavourite="Favourite"
          labelForward="Forward"
          labelSave="Save"
        />
      </I18nextProvider>,
    )
    expect(screen.getByText("Look at this")).toBeTruthy()
    expect(document.querySelector(".gif-full-viewer__caption")).toBeTruthy()
  })

  it("omits caption element when caption is empty (AC-GF1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <GifFullViewer
          src="blob:g"
          caption=""
          onClose={vi.fn()}
          ariaLabel="GIF viewer"
          labelClose="Close"
          labelFavourite="Favourite"
          labelForward="Forward"
          labelSave="Save"
        />
      </I18nextProvider>,
    )
    expect(document.querySelector(".gif-full-viewer__caption")).toBeNull()
  })

  it("action buttons are labelled and present, fire no side-effects on click (AC-GF2)", () => {
    const onClose = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <GifFullViewer
          src="blob:g"
          caption=""
          onClose={onClose}
          ariaLabel="GIF viewer"
          labelClose="Close"
          labelFavourite="Favourite"
          labelForward="Forward"
          labelSave="Save"
        />
      </I18nextProvider>,
    )
    const favBtn = screen.getByLabelText("Favourite")
    const fwdBtn = screen.getByLabelText("Forward")
    const saveBtn = screen.getByLabelText("Save")
    expect(favBtn).toBeTruthy()
    expect(fwdBtn).toBeTruthy()
    expect(saveBtn).toBeTruthy()
    // Clicking action buttons must not call onClose (they are inert)
    fireEvent.click(favBtn)
    fireEvent.click(fwdBtn)
    fireEvent.click(saveBtn)
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ─── AudioTrackInline full modal ───────────────────────────────────────────────

describe("AudioTrackInline full modal", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function openModal() {
    render(
      <I18nextProvider i18n={inst}>
        <AudioTrackInline
          src="blob:a"
          doc={makeAudioDoc(false)}
          viewerContext={{ sentAtLabel: "09:15", caption: "", peerTitle: "Peer", captionAbove: false }}
        />
      </I18nextProvider>,
    )
    const trigger = document.querySelector(".msg-audio-track") as HTMLElement
    fireEvent.click(trigger)
  }

  it("full modal shows cover disc and track meta (AC-AF1)", () => {
    openModal()
    expect(document.querySelector(".audio-full-modal__cover")).toBeTruthy()
    expect(document.querySelector(".audio-full-modal__title")).toBeTruthy()
    expect(document.querySelector(".audio-full-modal__artist")).toBeTruthy()
  })

  it("prev and next buttons present; disabled when no playlist (AC-AF2)", () => {
    openModal()
    const prevBtn = document.querySelector(".audio-full-modal__skip--prev") as HTMLButtonElement | null
    const nextBtn = document.querySelector(".audio-full-modal__skip--next") as HTMLButtonElement | null
    expect(prevBtn, "prev track button missing").toBeTruthy()
    expect(nextBtn, "next track button missing").toBeTruthy()
    expect(prevBtn?.disabled, "prev should be disabled — no playlist").toBe(true)
    expect(nextBtn?.disabled, "next should be disabled — no playlist").toBe(true)
  })

  it("modal has role=dialog and aria-modal (AC-FF1)", () => {
    openModal()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
  })
})

// ─── DocumentAttachmentInline full modal ──────────────────────────────────────

describe("DocumentAttachmentInline full modal", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  function openModal(extra: Record<string, unknown> = {}) {
    render(
      <I18nextProvider i18n={inst}>
        <DocumentAttachmentInline
          url="blob:d"
          name="report.pdf"
          sizeStr="1.2 MB"
          doc={null}
          viewerContext={{ sentAtLabel: "10:00", caption: "", peerTitle: "Peer", captionAbove: false }}
          {...extra}
        />
      </I18nextProvider>,
    )
    const trigger = document.querySelector(".msg-doc-row__main") as HTMLElement
    fireEvent.click(trigger)
  }

  it("topbar has filename, download link, and overflow button (AC-DF1)", () => {
    openModal()
    expect(document.querySelector(".doc-preview-modal__name")?.textContent).toBe("report.pdf")
    const dlLink = document.querySelector(".doc-preview-modal__dl") as HTMLAnchorElement | null
    expect(dlLink, "download link missing in topbar").toBeTruthy()
    expect(dlLink?.getAttribute("download")).toBeTruthy()
    const overflowBtn = document.querySelector(".doc-preview-modal__overflow") as HTMLButtonElement | null
    expect(overflowBtn, "overflow button missing in topbar").toBeTruthy()
  })

  it("shows page indicator when pageCount is provided (AC-DF2)", () => {
    openModal({ pageCount: 5 })
    const indicator = document.querySelector(".doc-preview-modal__page-count")
    expect(indicator, "page count indicator missing").toBeTruthy()
    expect(indicator?.textContent).toMatch(/5/)
  })

  it("omits page indicator when pageCount is not provided (AC-DF2)", () => {
    openModal()
    expect(document.querySelector(".doc-preview-modal__page-count")).toBeNull()
  })

  it("modal has role=dialog and aria-modal (AC-FF1)", () => {
    openModal()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
  })
})

// ─── VoiceMessageInline full modal ─────────────────────────────────────────────

describe("VoiceMessageInline full modal", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve())
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function openModal(caption = "") {
    render(
      <I18nextProvider i18n={inst}>
        <VoiceMessageInline
          src="blob:voice"
          durationSec={30}
          viewerContext={{ sentAtLabel: "14:00", caption, peerTitle: "Peer", captionAbove: false }}
        />
      </I18nextProvider>,
    )
    const col = document.querySelector(".msg-voice-inline__col") as HTMLElement
    fireEvent.dblClick(col)
  }

  it("transcript section with spinner shows when no caption (AC-OF1)", () => {
    openModal("")
    const transcript = document.querySelector(".voice-full-modal__transcript")
    expect(transcript, "transcript section missing").toBeTruthy()
    expect(document.querySelector(".voice-full-modal__transcript-spinner"), "spinner missing when caption absent").toBeTruthy()
  })

  it("transcript shows body text when caption provided (AC-OF1)", () => {
    openModal("Hello world")
    const body = document.querySelector(".voice-full-modal__transcript-body")
    expect(body?.textContent).toBe("Hello world")
    expect(document.querySelector(".voice-full-modal__transcript-spinner")).toBeNull()
  })

  it("speed button is present and cycles 1× → 1.5× → 2× → 1× on click (AC-OF2)", () => {
    openModal("")
    const speedBtn = document.querySelector(".voice-full-modal__speed") as HTMLButtonElement | null
    expect(speedBtn, "speed button missing").toBeTruthy()
    // Initial: 1×
    expect(speedBtn!.textContent).toMatch(/^1×?$/)
    fireEvent.click(speedBtn!)
    expect(speedBtn!.textContent).toMatch(/1\.5/)
    fireEvent.click(speedBtn!)
    expect(speedBtn!.textContent).toMatch(/^2×?$/)
    fireEvent.click(speedBtn!)
    expect(speedBtn!.textContent).toMatch(/^1×?$/)
  })

  it("modal has role=dialog and aria-modal (AC-FF1)", () => {
    openModal("")
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
  })
})

// ─── PhotoMediaViewer ──────────────────────────────────────────────────────────

describe("PhotoMediaViewer full chrome", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("has avatar disc, peer name, sentAt, and close button (AC-PF1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <PhotoMediaViewer
          url="blob:p"
          onClose={vi.fn()}
          labelClose="Close"
          labelBackdrop="Close enlarged image"
          peerTitle="Alice Smith"
          sentAtLabel="08:30"
          caption=""
        />
      </I18nextProvider>,
    )
    expect(document.querySelector(".photo-viewer__avatar")).toBeTruthy()
    expect(document.querySelector(".photo-viewer__name")?.textContent).toBe("Alice Smith")
    expect(document.querySelector(".photo-viewer__meta")?.textContent).toBe("08:30")
    expect(screen.getByLabelText("Close")).toBeTruthy()
  })

  it("caption text renders when provided (AC-PF1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <PhotoMediaViewer
          url="blob:p"
          onClose={vi.fn()}
          labelClose="Close"
          labelBackdrop="Close enlarged image"
          peerTitle="Alice"
          sentAtLabel="08:30"
          caption="Sunset view"
        />
      </I18nextProvider>,
    )
    expect(document.querySelector(".photo-viewer__caption")?.textContent).toBe("Sunset view")
  })

  it("action row is present; default actions have aria-labels (AC-PF1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <PhotoMediaViewer
          url="blob:p"
          onClose={vi.fn()}
          labelClose="Close"
          labelBackdrop="Close enlarged image"
          peerTitle="Alice"
          sentAtLabel="08:30"
          caption=""
        />
      </I18nextProvider>,
    )
    const actions = document.querySelector(".photo-viewer__actions")
    expect(actions, "action row div missing").toBeTruthy()
    // Default actions must have aria-labels so screen readers can enumerate them
    const labelled = actions?.querySelectorAll("[aria-label]")
    expect((labelled?.length ?? 0) >= 3, "at least 3 labelled action icons expected").toBe(true)
  })

  it("has role=dialog and aria-modal (AC-FF1)", () => {
    render(
      <I18nextProvider i18n={inst}>
        <PhotoMediaViewer
          url="blob:p"
          onClose={vi.fn()}
          labelClose="Close"
          labelBackdrop="Close enlarged image"
          peerTitle="Alice"
          sentAtLabel="08:30"
          caption=""
        />
      </I18nextProvider>,
    )
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.getAttribute("aria-modal")).toBe("true")
  })
})

// ─── CSS token contracts ────────────────────────────────────────────────────────

describe("video/gif full view CSS contracts", () => {
  const mediaStatesCss = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../styles/media-states.css"),
    "utf8",
  )

  it("video full viewer overlay references --on-overlay token (AC-VF1)", () => {
    expect(
      mediaStatesCss,
      "video-full-viewer controls should use --on-overlay token, not hardcoded white",
    ).toMatch(/video-full-viewer[\s\S]{0,300}--on-overlay/)
  })

  it("gif full viewer overlay class exists with --on-overlay (AC-GF1)", () => {
    expect(mediaStatesCss).toContain(".gif-full-viewer")
    expect(mediaStatesCss).toMatch(/gif-full-viewer[\s\S]{0,400}--on-overlay/)
  })

  it("voice full modal speed button class exists (AC-OF2)", () => {
    expect(mediaStatesCss).toContain(".voice-full-modal__speed")
  })

  it("audio full modal skip button classes exist (AC-AF2)", () => {
    expect(mediaStatesCss).toContain(".audio-full-modal__skip")
  })

  it("doc preview modal download and overflow classes exist (AC-DF1)", () => {
    expect(mediaStatesCss).toContain(".doc-preview-modal__dl")
    expect(mediaStatesCss).toContain(".doc-preview-modal__overflow")
  })
})
