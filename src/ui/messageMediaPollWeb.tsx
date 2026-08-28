import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { useCallback, useEffect, useRef, useState } from "react"
import { isSameOptionBytes } from "../telegram/pollOptions"
import {
  type PollOptionBytes,
  pollOptionCount,
  pollOptionPct,
  pollUserHasVoted,
  pollUiAnswers,
  shouldShowPollResultBreakdown,
} from "../telegram/pollResultsUtils"
import { asTwe } from "../telegram/twe"
import { renderMessageEntities } from "./MessageTextContent"
import { makeBlobUrl } from "./messageMediaBlobUtils"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"
import { ModalChrome } from "./ModalChrome"
import type { MediaViewerContext } from "./mediaViewerContext"
import { useTranslation } from "react-i18next"

/** Same rules as link entities — keep previews from becoming javascript: sinks. */
function safeWebHref(href: string): string {
  const t = href.trim()
  const lower = t.toLowerCase()
  if (
    lower.startsWith("javascript:")
    || lower.startsWith("data:")
    || lower.startsWith("vbscript:")
    || lower.startsWith("file:")
  ) {
    return "about:blank"
  }
  if (t.startsWith("tg://") || t.startsWith("mailto:") || t.startsWith("tel:")) {
    return t
  }
  if (t.startsWith("https://") || t.startsWith("http://")) {
    return t
  }
  if (t.startsWith("//")) {
    return `https:${t}`
  }
  if (t.startsWith("t.me/") || t.startsWith("telegram.me/")) {
    return `https://${t}`
  }
  return "about:blank"
}

/** First URL-like token in the message body (Telegram often stores the link here while preview is pending). */
function urlHintFromMessageBody(m: Api.Message): string {
  const raw = typeof m.message === "string" ? m.message.trim() : ""
  if (!raw) {
    return ""
  }
  const parts = raw.split(/\s+/)
  for (const p of parts) {
    if (/^https?:\/\//i.test(p) || p.startsWith("t.me/") || p.startsWith("telegram.me/")) {
      return p
    }
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith("t.me/") || raw.startsWith("telegram.me/")) {
    return raw
  }
  return ""
}

export type WpThumbPhase = "none" | "idle" | "loading" | "ready"

/**
 * Webpage preview image: idle until {@link requestThumb} runs (tap-to-load), then loads a small thumb via MTProto.
 */
export function useWpPreview(
  m: Api.Message,
  c: TelegramClient | null,
  no: boolean,
): {
  thumbUrl: string | null
  thumbPhase: WpThumbPhase
  requestThumb: () => void
} {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<WpThumbPhase>("none")
  const blobRef = useRef<string | null>(null)
  const fetchGen = useRef(0)

  useEffect(() => {
    fetchGen.current += 1
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
    queueMicrotask(() => {
      setThumbUrl(null)
    })

    const wantsThumb =
      !no
      && c != null
      && m.media?.className === "MessageMediaWebPage"
      && (() => {
        const wp = (m.media as Api.MessageMediaWebPage).webpage
        return (
          wp != null
          && wp.className === "WebPage"
          && Boolean((wp as Api.WebPage).photo)
        )
      })()

    queueMicrotask(() => {
      setPhase(wantsThumb ? "idle" : "none")
    })

    return () => {
      fetchGen.current += 1
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current)
        blobRef.current = null
      }
    }
  }, [c, no, m.id, m.media])

  const requestThumb = useCallback(() => {
    if (!c || no) return
    if (m.media?.className !== "MessageMediaWebPage") return
    const wp = (m.media as Api.MessageMediaWebPage).webpage
    if (!wp || wp.className !== "WebPage" || !(wp as Api.WebPage).photo) return

    const gen = fetchGen.current
    setPhase("loading")
    void c.downloadMedia(m, { thumb: 0 } as { thumb: number })
      .then((b) => {
        if (gen !== fetchGen.current) return
        if (b == null) {
          setPhase("none")
          return
        }
        const o = makeBlobUrl(b, "image/jpeg")
        if (blobRef.current) {
          URL.revokeObjectURL(blobRef.current)
        }
        blobRef.current = o
        setThumbUrl(o)
        setPhase("ready")
      })
      .catch(() => {
        if (gen !== fetchGen.current) return
        setPhase("none")
      })
  }, [c, no, m])

  return { thumbUrl, thumbPhase: phase, requestThumb }
}

export function PollReadonly({
  media,
  t,
  client,
}: {
  media: Api.MessageMediaPoll
  t: MessageMediaTranslateFn
  client: TelegramClient | null
}) {
  const p = media.poll
  if (p.className !== "Poll") {
    return null
  }
  const pollP = p as Api.Poll
  const { text: q, entities: qE } = asTwe(pollP.question)
  const res =
    media.results?.className === "PollResults"
      ? (media.results as Api.PollResults)
      : null
  const closed = Boolean(pollP.closed)
  const tot = res?.totalVoters ?? 0
  const hasVoted = res ? pollUserHasVoted(pollP, res) : false
  const showStats = res ? shouldShowPollResultBreakdown(res, hasVoted, closed) : false
  const multi = Boolean(pollP.multipleChoice)
  const mediaState = closed && showStats ? "full" : "preview"
  return (
    <div className="msg-poll" data-media-state={mediaState}>
      <div className="msg-poll-head">
        <div className="msg-poll-question">
          {pollP.quiz ? <span className="msg-poll-qbadge" aria-hidden>★</span> : null}
          <span className="msg-poll-qtext">{renderMessageEntities(q, qE, client, t)}</span>
        </div>
        <p className="msg-poll-subtitle">
          {[
            pollP.quiz ? t("chat.pollQuiz") : null,
            pollP.publicVoters ? t("chat.pollSubtitlePublic") : t("chat.pollSubtitleAnonymous"),
            multi ? t("chat.pollSubtitleMultiple") : t("chat.pollSubtitleSingle"),
            closed ? t("chat.pollClosedLong") : null,
          ].filter(Boolean).join(" · ")}
        </p>
      </div>
      {res?.min && !hasVoted && !closed
        ? <p className="msg-poll-hint" role="note">{t("chat.pollResultsAfterVote")}</p>
        : null}
      <ol className="msg-poll-options">
        {pollUiAnswers(pollP).map((a, i) => {
          const { text, entities } = asTwe(a.text)
          const n = pollOptionCount(res, a.option)
          const pct = pollOptionPct(n, tot)
          const o = res?.results?.find(
            (r) => isSameOptionBytes(r.option as PollOptionBytes, a.option as PollOptionBytes)
          )
          const ok = Boolean(pollP.quiz && o && o.className === "PollAnswerVoters" && o.correct)
          return (
            <li
              key={i}
              className={`${ok ? "msg-poll-row msg-poll-row--correct" : "msg-poll-row"} ${showStats ? "msg-poll-row--stat" : ""}`.trim()}
            >
              {showStats
                ? (
                    <div className="msg-poll-bgt" aria-hidden>
                      <div className="msg-poll-bgfill" style={{ width: `${pct}%` }} />
                    </div>
                  )
                : null}
              <div className="msg-poll-line">
                {renderMessageEntities(text, entities, client, t)}
                {showStats
                  ? (
                      <span
                        className="msg-poll-pct"
                        aria-label={t("chat.pollOptionResult", { n: String(n), pct: String(pct) })}
                      >
                        ·
                        {n}
                        {tot > 0 ? ` (${t("chat.pollPct", { n: String(pct) })})` : ""}
                      </span>
                    )
                  : null}
              </div>
            </li>
          )
        })}
      </ol>
      {!closed && tot > 0
        ? (
            <div className="msg-poll-total">
              {t("chat.pollTotal", { n: tot })}
            </div>
          )
        : null}
      {closed && tot > 0
        ? (
            <div className="msg-poll-foot">
              <span className="msg-poll-foot__badge">{t("chat.pollFinalResults")}</span>
              <span className="msg-poll-foot__meta">{t("chat.pollTotal", { n: tot })}</span>
            </div>
          )
        : null}
      {pollP.quiz && res?.solution
        ? (
            <div className="msg-poll-explain">
              <span className="msg-poll-explain__label">{t("chat.pollSolutionHeading")}</span>
              {res.solution}
            </div>
          )
        : null}
    </div>
  )
}

function WebIvModal({
  w,
  caption,
  thumbUrl,
  safeHref,
  onClose,
}: {
  w: Api.WebPage
  caption: string
  thumbUrl: string | null
  safeHref: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  let host: string
  try {
    const raw = safeHref.startsWith("http") ? safeHref : `https://${safeHref.replace(/^\/\//, "")}`
    host = new URL(raw).hostname
  } catch {
    host = (w.displayUrl || w.url || "").replace(/^https?:\/\//i, "")
  }
  const descrText = w.description && w.description.length > 400
    ? `${w.description.slice(0, 400)}…`
    : (w.description ?? "")

  return (
    <ModalChrome onClose={onClose} ariaLabel={t("chat.webIvDialog")} className="media-modal-backdrop--iv">
      <div className="web-iv" data-media-state="full">
        <header className="web-iv__topbar">
          <span className="web-iv__host">{host}</span>
          <button type="button" className="web-iv__x" onClick={onClose} aria-label={t("chat.imageViewerClose")}>
            ×
          </button>
        </header>
        <div
          className="web-iv__hero"
          style={
            thumbUrl
              ? { backgroundImage: `url(${thumbUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
        <div className="web-iv__body">
          {w.title ? <h2 className="web-iv__title">{w.title}</h2> : null}
          {w.siteName ? <div className="web-iv__by">{w.siteName}</div> : null}
          {descrText ? <p className="web-iv__text">{descrText}</p> : null}
          {caption.trim() ? <blockquote className="web-iv__pull">{caption}</blockquote> : null}
        </div>
        <a className="web-iv__open" href={safeHref} target="_blank" rel="noopener noreferrer">
          {t("chat.openLink")}
        </a>
      </div>
    </ModalChrome>
  )
}

export function WebPageView({
  m, no, t, thumbUrl, thumbPhase, onThumbRequest, viewerContext,
}: {
  m: Api.Message
  no: boolean
  t: MessageMediaTranslateFn
  thumbUrl: string | null
  thumbPhase: WpThumbPhase
  onThumbRequest: () => void
  viewerContext?: MediaViewerContext | null
}) {
  const [ivOpen, setIvOpen] = useState(false)
  const { t: te } = useTranslation()
  if (m.media?.className !== "MessageMediaWebPage" || no) {
    return null
  }
  const w0 = (m.media as Api.MessageMediaWebPage).webpage
  const hint = urlHintFromMessageBody(m)

  if (w0 && w0.className === "WebPage") {
    const w = w0 as Api.WebPage
    const href = (w.url && w.url.trim()) || hint
    if (!href) {
      return (
        <div className="msg-media msg-media--card" role="status">
          <span className="msg-media-card__muted">{t("chat.linkPreviewUnavailable")}</span>
        </div>
      )
    }
    const safe = safeWebHref(href)
    const hasTextMeta = Boolean(w.siteName || w.title || w.description)
    const hasPhoto = Boolean(w.photo)
    const descrText = w.description && w.description.length > 300
      ? `${w.description.slice(0, 300)}…`
      : (w.description ?? "")
    const inner = (
      <>
        {w.siteName ? <div className="msg-wp-site">{w.siteName}</div> : null}
        {w.title ? <div className="msg-wp-title">{w.title}</div> : null}
        {w.description ? <div className="msg-wp-descr">{descrText}</div> : null}
        {!hasTextMeta ? <div className="msg-wp-title">{w.displayUrl || w.url}</div> : null}
      </>
    )
    const showThumbSlot = hasPhoto && thumbPhase !== "none"
    const stack = (
      <div className="msg-webpage-stack" data-media-state="preview">
        {showThumbSlot ? (
          <div className="msg-webpage msg-webpage--compact">
            {thumbPhase === "idle" ? (
              <button
                type="button"
                className="msg-wp-thumb msg-wp-thumb--tap"
                onClick={(e) => {
                  e.stopPropagation()
                  onThumbRequest()
                }}
                aria-label={te("chat.mediaTapToLoad")}
              />
            ) : thumbPhase === "loading" ? (
              <div
                className="msg-wp-thumb msg-wp-thumb--busy placeholder--shimmer"
                aria-busy="true"
                role="status"
              />
            ) : thumbUrl ? (
              <img className="msg-wp-thumb" src={thumbUrl} alt="" />
            ) : null}
            <a
              className="msg-webpage__col"
              href={safe}
              target="_blank"
              rel="noopener noreferrer"
              title={t("chat.openLink")}
            >
              {inner}
            </a>
          </div>
        ) : (
          <a
            className="msg-webpage"
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            title={t("chat.openLink")}
          >
            {inner}
          </a>
        )}
        <div className="msg-webpage-toolbar">
          <button type="button" className="msg-webpage-iv" onClick={() => setIvOpen(true)}>
            {te("chat.webIvOpen")}
          </button>
        </div>
      </div>
    )
    return (
      <>
        {stack}
        {ivOpen ? (
          <WebIvModal
            w={w}
            caption={viewerContext?.caption ?? ""}
            thumbUrl={thumbUrl}
            safeHref={safe}
            onClose={() => setIvOpen(false)}
          />
        ) : null}
      </>
    )
  }

  if (w0?.className === "WebPagePending") {
    const wp = w0 as Api.WebPagePending
    const href = (wp.url && wp.url.trim()) || hint
    if (href) {
      const safe = safeWebHref(href)
      return (
        <div className="msg-webpage-pending-wrap" data-media-state="loading">
          <a className="msg-webpage msg-webpage--pending msg-webpage--pending-skel" href={safe} target="_blank" rel="noopener noreferrer" title={t("chat.openLink")}>
            <div className="msg-webpage-skel-row">
              <div className="msg-wp-skel-thumb placeholder--shimmer" aria-hidden />
              <div className="msg-webpage-skel-col">
                <div className="msg-wp-skel-line placeholder--shimmer" aria-hidden />
                <div className="msg-wp-skel-line msg-wp-skel-line--lg placeholder--shimmer" aria-hidden />
                <div className="msg-wp-skel-line msg-wp-skel-line--sm placeholder--shimmer" aria-hidden />
              </div>
            </div>
            <div className="msg-wp-title">{href}</div>
            <div className="msg-wp-descr msg-media-card__muted">{t("chat.linkPreviewPending")}</div>
          </a>
        </div>
      )
    }
    return (
      <div className="msg-media msg-media--card" role="status">
        <span className="msg-media-card__muted">{t("chat.linkPreviewPending")}</span>
      </div>
    )
  }

  if (w0?.className === "WebPageEmpty") {
    const u = (w0 as Api.WebPageEmpty).url?.trim() || hint
    if (u) {
      const safe = safeWebHref(u)
      return (
        <a className="msg-webpage msg-webpage--fallback" href={safe} target="_blank" rel="noopener noreferrer" title={t("chat.openLink")}>
          <div className="msg-wp-title">{u}</div>
          <div className="msg-wp-descr msg-media-card__muted">{t("chat.previewLink")}</div>
        </a>
      )
    }
  }

  if (w0?.className === "WebPageNotModified") {
    if (hint) {
      const safe = safeWebHref(hint)
      return (
        <a className="msg-webpage msg-webpage--fallback" href={safe} target="_blank" rel="noopener noreferrer" title={t("chat.openLink")}>
          <div className="msg-wp-title">{hint}</div>
        </a>
      )
    }
  }

  if (hint) {
    const safe = safeWebHref(hint)
    return (
      <a className="msg-webpage msg-webpage--fallback" href={safe} target="_blank" rel="noopener noreferrer" title={t("chat.openLink")}>
        <div className="msg-wp-title">{hint}</div>
        <div className="msg-wp-descr msg-media-card__muted">{t("chat.linkPreviewUnavailable")}</div>
      </a>
    )
  }

  return (
    <div className="msg-media msg-media--card" role="status">
      <span className="msg-media-card__muted">{t("chat.linkPreviewUnavailable")}</span>
    </div>
  )
}
