import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Api } from "teleproto"
import { formatVideoDuration } from "../telegram/documentVideoMeta"
import { getAudioDurationSeconds, getAudioTrackMeta } from "../telegram/documentAudioMeta"
import type { MediaViewerContext } from "./mediaViewerContext"
import { ModalChrome } from "./ModalChrome"

function AudioFullModal({
  src,
  onClose,
  title,
  performer,
  durationSec,
  prevTrack,
  nextTrack,
}: {
  src: string
  onClose: () => void
  title: string
  performer: string
  durationSec: number | null
  prevTrack?: () => void
  nextTrack?: () => void
}) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const total = durationSec ?? 0
  const pct = total > 0 ? Math.min(100, (cur / total) * 100) : 0
  const remain = total > cur ? total - cur : 0

  return (
    <ModalChrome onClose={onClose} ariaLabel={t("chat.audioViewerDialog")} className="media-modal-backdrop--surface">
      <div className="audio-full-modal" data-media-state="full">
        <div className="audio-full-modal__head">
          <button type="button" className="audio-full-modal__close" onClick={onClose} aria-label={t("chat.imageViewerClose")}>
            ×
          </button>
        </div>
        <div className="audio-full-modal__cover" aria-hidden>
          <svg width="56" height="56" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M7 14V4l9-1v10" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="6" cy="14" r="2.5" fill="#fff" />
            <circle cx="15" cy="13" r="2.5" fill="#fff" />
          </svg>
        </div>
        <div className="audio-full-modal__meta">
          <div className="audio-full-modal__title">{title || t("chat.previewAudio")}</div>
          {performer ? <div className="audio-full-modal__artist">{performer}</div> : null}
        </div>
        <div className="audio-full-modal__scrub" aria-hidden>
          <div className="audio-full-modal__scrub-fill" style={{ width: `${pct}%` }} />
          <div className="audio-full-modal__knob" style={{ left: `${pct}%` }} />
        </div>
        <div className="audio-full-modal__times">
          <span>{formatVideoDuration(Math.floor(cur))}</span>
          <span>−{formatVideoDuration(Math.floor(remain))}</span>
        </div>
        <div className="audio-full-modal__controls">
          <button
            type="button"
            className="audio-full-modal__skip audio-full-modal__skip--prev"
            aria-label={t("chat.audioSkipPrev")}
            disabled={!prevTrack}
            onClick={prevTrack}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M5 4h2v12H5V4zm9.5 6L8 6v8l6.5-4z" />
            </svg>
          </button>
          <button
            type="button"
            className="audio-full-modal__pp"
            aria-label={playing ? t("chat.videoPause") : t("chat.videoPlay")}
            onClick={() => {
              const a = audioRef.current
              if (!a) {
                return
              }
              if (playing) {
                a.pause()
              } else {
                void a.play()
              }
            }}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            className="audio-full-modal__skip audio-full-modal__skip--next"
            aria-label={t("chat.audioSkipNext")}
            disabled={!nextTrack}
            onClick={nextTrack}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M13 4h2v12h-2V4zM5.5 10L12 6v8L5.5 10z" />
            </svg>
          </button>
        </div>
        <audio
          ref={audioRef}
          className="visually-hidden"
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={() => {
            const a = audioRef.current
            if (a) {
              setCur(a.currentTime)
            }
          }}
        />
      </div>
    </ModalChrome>
  )
}

export function AudioTrackInline({
  src,
  doc,
  viewerContext,
}: {
  src: string
  doc: Api.Document
  viewerContext?: MediaViewerContext | null
}) {
  const { t } = useTranslation()
  const { title, performer } = getAudioTrackMeta(doc)
  const dur = getAudioDurationSeconds(doc)
  const durLabel = dur != null ? formatVideoDuration(Math.floor(dur)) : ""
  const displayTitle = title || t("chat.previewAudio")
  const [full, setFull] = useState(false)

  const line2 = [performer, durLabel].filter(Boolean).join(performer && durLabel ? " · " : "")

  return (
    <>
      <div className="msg-audio-track-wrap">
        <button type="button" className="msg-audio-track" data-media-state="preview" onClick={() => setFull(true)}>
          <span className="msg-audio-track__cover" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M7 14V4l9-1v10" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
              <circle cx="6" cy="14" r="2.5" fill="#fff" />
              <circle cx="15" cy="13" r="2.5" fill="#fff" />
            </svg>
          </span>
          <span className="msg-audio-track__text">
            <span className="msg-audio-track__title">{displayTitle}</span>
            {line2 ? <span className="msg-audio-track__sub">{line2}</span> : null}
          </span>
        </button>
        {viewerContext?.sentAtLabel ? (
          <div className="media-inline-meta-foot">{viewerContext.sentAtLabel}</div>
        ) : null}
      </div>
      {full ? (
        <AudioFullModal
          src={src}
          onClose={() => setFull(false)}
          title={displayTitle}
          performer={performer}
          durationSec={dur}
        />
      ) : null}
    </>
  )
}
