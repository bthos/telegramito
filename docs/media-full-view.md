# Media full-view

Tapping or double-tapping a media message in the chat thread opens it in a full-view overlay.
Each media type has its own chrome — controls, transport bars, and action buttons that match what
you'd expect for that type. Press Escape (or tap the backdrop or the close button) to return to the
chat.

## Video

Tap a video message to open it in the full-view overlay. A transport bar appears at the bottom
of the screen.

| Control | What it does |
|---|---|
| Play / Pause | Starts or pauses playback |
| Elapsed / total time | Shows current position and clip length |
| Scrub bar | Drag left or right to jump to any point in the clip |
| Volume button | Mutes or unmutes the audio track |
| Close button | Returns to the chat |

The top bar shows the name of the person who sent the video and the time it was sent.

The fullscreen-expand icon in the transport bar is visual only — the in-app overlay is the
full-screen experience. OS-level fullscreen is not yet wired.

### Round video (video circles)

Round video messages use the same overlay with a circular stage. The same scrub bar and volume
button are available.

## GIF

Tapping a GIF message opens it looping on a dark overlay. If the GIF was sent with a caption,
the caption appears below the image.

Three action buttons — Favourite, Forward, and Save — are shown at the bottom of the overlay.
They are visible but not yet functional; tapping them has no effect in this release.

## Audio

Tapping the expand button on an audio track opens the full player card, which shows:

- Large cover art (falls back to a generic thumb when the file has no embedded artwork)
- Track title and artist name
- Play / Pause in the centre of the controls row
- Skip to Previous and Skip to Next buttons on either side

Skip Prev / Next are grayed out when the audio is a standalone file with no playlist context.
They become active when audio is part of a group of audio messages.

## Document / file

Tapping a document attachment opens a preview modal. The top bar has three elements:

| Element | What it does |
|---|---|
| Filename | Shows the full filename |
| Download icon | Downloads the file to your device |
| More options (⋮) | Opens an overflow menu (additional actions — stub in this release) |

For PDF files, a page count appears below the document area when the server supplies that
information. Most PDFs will not show a page count because Telegram does not include it in the
file metadata by default.

## Voice message

Tap the expand button on a voice message (the chevron next to the waveform) to open the voice
full view.

**Speed control** — A button in the player row cycles playback speed through 1×, 1.5×, and 2×.
Tap it repeatedly to step through; it wraps back to 1× after 2×.

**Transcription** — When Telegram's servers have transcribed the voice message to text, the
transcription appears below the waveform. While transcription is pending a spinner is shown in
its place. If no transcription is available and no caption was sent with the message, the
transcription area is hidden.

## Photo

Tapping a photo opens the existing lightbox. The bottom chrome shows:

- The sender's avatar and display name
- The time the photo was sent
- The photo's caption (if any)
- An action row with Favourite, Save, and Share icons

The action icons are labelled for screen readers but are visual-only in this release — tapping
them has no effect.

## Keyboard and accessibility

All full-view overlays are announced as dialogs to assistive technology, trap focus while open,
and close on Escape. The same Escape / back-button behaviour described in
[docs/back-navigation.md](back-navigation.md) applies here too.

## Known limitations

- **GIF actions** — Favourite, Forward, and Save have no handler yet.
- **Photo action row** — Favourite, Save, and Share are visual-only.
- **Document overflow menu** — the ⋮ menu opens a stub with no items yet.
- **PDF page count** — shown only when supplied by the server; absent for most PDFs.
- **Video OS fullscreen** — the expand icon is decorative; only the in-app overlay is available.
- **Determinate download progress** — the download link in the document viewer starts a
  browser-native download with no in-app progress indicator.

---

*Implemented across `src/ui/GifFullViewer.tsx` (new), `src/ui/VideoFullViewer.tsx`,
`src/ui/PhotoMediaViewer.tsx`, `src/ui/AudioTrackInline.tsx`,
`src/ui/DocumentAttachmentInline.tsx`, and `src/ui/VoiceMessageInline.tsx`.
Styling in `src/styles/media-states.css`. If viewer behaviour changes, update this page to match.*
