import { useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"
import { formatVideoDuration } from "../telegram/documentVideoMeta"

type Props = {
  src: string
  loop: boolean
  onClose: () => void
  /** Dialog accessible name (whole overlay). */
  ariaLabel: string
  labelClose: string
  title: string
  sentAtLabel: string
  labelPlay: string
  labelPause: string
  /** When known, show in scrub row; otherwise only elapsed shows. */
  durationSec: number | null
  /** Volume button accessible label. */
  labelVolume: string
  /** Round video note — circular crop (see `round-video.html`). */
  variant?: "rect" | "round"
}

/**
 * Full-screen video overlay per `design-system/preview/video.html` (full state):
 * 16:9 player, bottom gradient with scrub (decorative) + time + play/pause.
 */
export function VideoFullViewer({
  src,
  loop,
  onClose,
  ariaLabel,
  labelClose,
  title,
  sentAtLabel,
  labelPlay,
  labelPause,
  durationSec,
  labelVolume,
  variant = "rect",
}: Props) {
  const rootRef = useDismissibleLayer(true, onClose)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)
  const [currentSec, setCurrentSec] = useState(0)

  const durLabel = durationSec != null ? formatVideoDuration(durationSec) : "—:—"
  const curLabel = formatVideoDuration(Math.floor(currentSec))

  const node = (
    <div
      ref={rootRef}
      className="video-full-viewer"
      data-media-state="full"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div className="video-full-viewer__chrome" onClick={(e) => e.stopPropagation()}>
        <header className="video-full-viewer__top">
          <span className="video-full-viewer__title">{title}</span>
          <span className="video-full-viewer__sub">{sentAtLabel}</span>
          <span className="video-full-viewer__spacer" />
          <button type="button" className="video-full-viewer__close" onClick={onClose} aria-label={labelClose}>
            ×
          </button>
        </header>
        <div
          className={
            variant === "round"
              ? "video-full-viewer__player-wrap video-full-viewer__player-wrap--round"
              : "video-full-viewer__player-wrap"
          }
        >
          <video
            ref={videoRef}
            className={
              variant === "round"
                ? "video-full-viewer__video video-full-viewer__video--round"
                : "video-full-viewer__video"
            }
            src={src}
            loop={loop}
            playsInline
            autoPlay
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
              const v = videoRef.current
              if (v) {
                setCurrentSec(v.currentTime)
              }
            }}
          />
          <div className="video-full-viewer__controls">
            <input
              type="range"
              className="video-full-viewer__scrub-input"
              aria-label="seek"
              min={0}
              max={durationSec ?? 100}
              step={0.5}
              value={currentSec}
              onChange={(e) => {
                const v = videoRef.current
                if (v) {
                  v.currentTime = Number(e.target.value)
                }
              }}
            />
            <div
              className="video-full-viewer__scrub-fill"
              style={{
                width:
                  durationSec != null && durationSec > 0
                    ? `${Math.min(100, (currentSec / durationSec) * 100)}%`
                    : "0%",
              }}
            />
            <div className="video-full-viewer__row">
              <button
                type="button"
                className="video-full-viewer__pp"
                aria-label={playing ? labelPause : labelPlay}
                onClick={() => {
                  const v = videoRef.current
                  if (!v) {
                    return
                  }
                  if (playing) {
                    v.pause()
                  } else {
                    void v.play()
                  }
                }}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <span className="video-full-viewer__time">
                {curLabel}
                {" / "}
                {durLabel}
              </span>
              <button
                type="button"
                className="video-full-viewer__volume"
                aria-label={labelVolume}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M3 5.5H1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2l3 2.5V3L3 5.5zm7.53-.53a5 5 0 0 1 0 6.06" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
