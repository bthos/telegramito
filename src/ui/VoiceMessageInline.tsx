import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatVideoDuration } from "../telegram/documentVideoMeta"
import { waveformHeights } from "./mediaWaveform"
import type { MediaViewerContext } from "./mediaViewerContext"
import { ModalChrome } from "./ModalChrome"

function VoiceFullModal({
  src,
  onClose,
  caption,
  durationSec,
  ariaLabel,
  labelClose,
}: {
  src: string
  onClose: () => void
  caption: string
  durationSec: number | null
  ariaLabel: string
  labelClose: string
}) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tcur, setTcur] = useState(0)
  const [playing, setPlaying] = useState(false)
  const total = durationSec ?? 0
  const bars = waveformHeights(40, 13)
  const playedFrac = total > 0 ? Math.min(1, tcur / total) : 0

  return (
    <ModalChrome onClose={onClose} ariaLabel={ariaLabel} className="media-modal-backdrop--surface">
      <div className="voice-full-modal" data-media-state="full">
        <div className="voice-full-modal__head">
          <span className="voice-full-modal__spacer" />
          <button type="button" className="voice-full-modal__close" onClick={onClose} aria-label={labelClose}>
            ×
          </button>
        </div>
        <div className="voice-full-modal__player">
          <button
            type="button"
            className="voice-full-modal__play"
            aria-label={playing ? t("chat.voicePause") : t("chat.voicePlay")}
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
          <div className="voice-full-modal__wave-col">
            <div className="msg-voice-wave msg-voice-wave--lg" aria-hidden>
              {bars.map((h, i) => {
                const frac = i / Math.max(1, bars.length - 1)
                const cls = frac < playedFrac - 1e-6
                  ? "msg-voice-wave__bar msg-voice-wave__bar--played"
                  : Math.abs(frac - playedFrac) < 0.03
                    ? "msg-voice-wave__bar msg-voice-wave__bar--head"
                    : "msg-voice-wave__bar"
                return <i key={i} className={cls} style={{ height: `${h}px` }} />
              })}
            </div>
            <div className="voice-full-modal__times">
              <span>{formatVideoDuration(Math.floor(tcur))}</span>
              {total > 0 ? (
                <span className="voice-full-modal__slash">
                  {" "}
                  / {formatVideoDuration(Math.floor(total))}
                </span>
              ) : null}
            </div>
          </div>
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
              setTcur(a.currentTime)
            }
          }}
        />
        {caption.trim() ? (
          <div className="voice-full-modal__transcript">
            <div className="voice-full-modal__transcript-label">{t("chat.voiceTranscriptLabel")}</div>
            <div className="voice-full-modal__transcript-body">{caption}</div>
          </div>
        ) : (
          <p className="voice-full-modal__transcript-hint msg-media-card__muted">{t("chat.voiceTranscriptPlaceholder")}</p>
        )}
      </div>
    </ModalChrome>
  )
}

export function VoiceMessageInline({
  src,
  durationSec,
  viewerContext,
}: {
  src: string
  durationSec: number | null
  viewerContext?: MediaViewerContext | null
}) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [tcur, setTcur] = useState(0)
  const [full, setFull] = useState(false)
  const seed = (viewerContext?.sentAtLabel.length ?? 1) * 17 + 3
  const bars = waveformHeights(36, seed)
  const total = durationSec ?? 0
  const playedFrac = total > 0 ? Math.min(1, tcur / total) : 0

  useEffect(() => {
    const a = audioRef.current
    if (!a) {
      return
    }
    const onTime = () => setTcur(a.currentTime)
    a.addEventListener("timeupdate", onTime)
    return () => a.removeEventListener("timeupdate", onTime)
  }, [])

  const durLabel = total > 0 ? formatVideoDuration(Math.floor(total)) : "—:—"
  const caption = viewerContext?.caption ?? ""

  return (
    <>
      <div className="msg-voice-inline" data-media-state="preview">
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          className="visually-hidden"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <button
          type="button"
          className="msg-voice-inline__play"
          aria-label={playing ? t("chat.voicePause") : t("chat.voicePlay")}
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
          {playing ? (
            <span className="msg-voice-inline__pp-pause" aria-hidden>
              ❚❚
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="#fff" aria-hidden>
              <path d="M3 2l9 5-9 5z" />
            </svg>
          )}
        </button>
        <div className="msg-voice-inline__col">
          <div className="msg-voice-wave" aria-hidden>
            {bars.map((h, i) => {
              const frac = i / Math.max(1, bars.length - 1)
              const cls = frac < playedFrac - 1e-6
                ? "msg-voice-wave__bar msg-voice-wave__bar--played"
                : Math.abs(frac - playedFrac) < 0.03
                  ? "msg-voice-wave__bar msg-voice-wave__bar--head"
                  : "msg-voice-wave__bar"
              return <i key={i} className={cls} style={{ height: `${h}px` }} />
            })}
          </div>
          <div className="msg-voice-inline__meta">
            <span className="msg-voice-inline__elapsed">{formatVideoDuration(Math.floor(tcur))}</span>
            <span className="msg-voice-inline__dur" aria-hidden>
              {" "}
              / {durLabel}
            </span>
            <button type="button" className="msg-voice-inline__expand" onClick={() => setFull(true)}>
              {t("chat.expandVoice")}
            </button>
          </div>
        </div>
      </div>
      {full ? (
        <VoiceFullModal
          src={src}
          onClose={() => setFull(false)}
          caption={caption}
          durationSec={durationSec}
          ariaLabel={t("chat.voiceViewerDialog")}
          labelClose={t("chat.imageViewerClose")}
        />
      ) : null}
    </>
  )
}
