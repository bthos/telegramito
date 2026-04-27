import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useEffect, useRef, useState } from "react"
import { isSameOptionBytes } from "../telegram/pollOptions"
import {
  type PollOptionBytes,
  pollOptionCount,
  pollOptionPct,
  pollUserHasVoted,
  shouldShowPollResultBreakdown,
} from "../telegram/pollResultsUtils"
import { asTwe } from "../telegram/twe"
import { renderMessageEntities } from "./MessageTextContent"
import { makeBlobUrl } from "./messageMediaBlobUtils"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"

export function useWpPreview(m: Api.Message, c: TelegramClient | null, no: boolean) {
  const [u, setU] = useState<string | null>(null)
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (last.current) {
      URL.revokeObjectURL(last.current)
      last.current = null
    }
    setU(null)
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
  const res = media.results.className === "PollResults" ? (media.results as Api.PollResults) : null
  const closed = Boolean(pollP.closed)
  const tot = res?.totalVoters ?? 0
  const hasVoted = res ? pollUserHasVoted(pollP, res) : false
  const showStats = res ? shouldShowPollResultBreakdown(res, hasVoted, closed) : false
  return (
    <div className="msg-poll">
      <div className="msg-poll-question">
        {client ? renderMessageEntities(q, qE, client, t) : <span className="msg-text-richtext">{q}</span>}
        {pollP.quiz ? <span> · {t("chat.pollQuiz")}</span> : null}
        {pollP.closed ? <span> — {t("chat.pollClosed")}</span> : null}
      </div>
      {res?.min && !hasVoted && !closed
        ? <p className="msg-poll-hint" role="note">{t("chat.pollResultsAfterVote")}</p>
        : null}
      <ol className="msg-poll-options">
        {pollP.answers.map((a, i) => {
          const { text, entities } = asTwe((a as Api.PollAnswer).text)
          const n = pollOptionCount(res, a.option)
          const pct = pollOptionPct(n, tot)
          const o = res?.results?.find(
            (r) => isSameOptionBytes(r.option as PollOptionBytes, (a as Api.PollAnswer).option as PollOptionBytes)
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
                {client
                  ? renderMessageEntities(text, entities, client, t)
                  : <span className="msg-text-richtext">{text}</span>}
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
      {tot > 0
        ? (
            <div className="msg-poll-total">
              {t("chat.pollTotal", { n: tot })}
            </div>
          )
        : null}
      {pollP.quiz && res?.solution
        ? (
            <div className="msg-poll-sol">
              {t("chat.pollAnswer")}
              {" "}
              {res.solution}
            </div>
          )
        : null}
    </div>
  )
}

export function WebPageView({
  m, no, t, thumb,
}: { m: Api.Message; no: boolean; t: MessageMediaTranslateFn; thumb: string | null }) {
  if (m.media?.className !== "MessageMediaWebPage" || no) {
    return null
  }
  const w0 = (m.media as Api.MessageMediaWebPage).webpage
  if (!w0 || w0.className === "WebPageNotModified" || w0.className === "WebPageEmpty") {
    return null
  }
  if (w0.className !== "WebPage") {
    return null
  }
  const w = w0 as Api.WebPage
  return (
    <a className="msg-webpage" href={w.url} target="_blank" rel="noopener noreferrer" title={t("chat.openLink")}>
      {thumb ? <img className="msg-wp-preview" src={thumb} alt="" /> : null}
      {w.siteName ? <div className="msg-wp-site">{w.siteName}</div> : null}
      {w.title ? <div className="msg-wp-title">{w.title}</div> : null}
      {w.description ? <div className="msg-wp-descr">{w.description.length > 300 ? `${w.description.slice(0, 300)}…` : w.description}</div> : null}
    </a>
  )
}
