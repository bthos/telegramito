import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useEffect, useRef, useState } from "react"
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

export function useWpPreview(m: Api.Message, c: TelegramClient | null, no: boolean) {
  const [u, setU] = useState<string | null>(null)
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (last.current) {
      URL.revokeObjectURL(last.current)
      last.current = null
    }
    queueMicrotask(() => {
      setU(null)
    })
    if (no || !c) {
      return
    }
    if (m.media?.className !== "MessageMediaWebPage") {
      return
    }
    const w = (m.media as Api.MessageMediaWebPage).webpage
    if (!w || w.className !== "WebPage" || !(w as Api.WebPage).photo) {
      return
    }
    let a = true
    void c.downloadMedia(m, { thumb: 0 } as { thumb: number }).then((b) => {
      if (!a || b == null) {
        return
      }
      const o = makeBlobUrl(b, "image/jpeg")
      if (a) {
        if (last.current) {
          URL.revokeObjectURL(last.current)
        }
        last.current = o
        setU(o)
      }
    })
    return () => {
      a = false
      if (last.current) {
        URL.revokeObjectURL(last.current)
        last.current = null
      }
    }
  }, [c, m, m.id, no, m.media])
  return u
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
  m, no, t, thumb, viewerContext,
}: {
  m: Api.Message
  no: boolean
  t: MessageMediaTranslateFn
  thumb: string | null
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
    const compact = Boolean(thumb)
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
    return (
      <>
        <div className="msg-webpage-stack" data-media-state="preview">
          <a
            className={compact ? "msg-webpage msg-webpage--compact" : "msg-webpage"}
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            title={t("chat.openLink")}
          >
            {compact ? (
              <>
                <img className="msg-wp-thumb" src={thumb!} alt="" />
                <div className="msg-webpage__col">{inner}</div>
              </>
            ) : (
              <>
                {inner}
                {thumb ? <img className="msg-wp-preview" src={thumb} alt="" /> : null}
              </>
            )}
          </a>
          <div className="msg-webpage-toolbar">
            <button type="button" className="msg-webpage-iv" onClick={() => setIvOpen(true)}>
              {te("chat.webIvOpen")}
            </button>
          </div>
        </div>
        {ivOpen ? (
          <WebIvModal
            w={w}
            caption={viewerContext?.caption ?? ""}
            thumbUrl={thumb}
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
