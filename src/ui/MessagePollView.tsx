import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useCallback, useEffect, useId, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { isSameOptionBytes } from "../telegram/pollOptions"
import {
  isPollOptionChosenRow,
  multiChosenOptionKeysFromResults,
  pollMultiResyncKey,
  pollOptionCount,
  pollOptionPct,
  type PollOptionBytes,
  pollUserHasVoted,
  pollUiAnswers,
  shouldShowPollResultBreakdown,
} from "../telegram/pollResultsUtils"
import { sendPollVote } from "../telegram/reactionsAndPolls"
import { Button } from "./ds"
import { asTwe } from "../telegram/twe"
import { renderMessageEntities } from "./MessageTextContent"
import { MessagePollVotersPop } from "./MessagePollVotersPop"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"

type PollMultiProps = {
  pollP: Api.Poll
  res: Api.PollResults | null
  client: TelegramClient
  t: MessageMediaTranslateFn
  qId: string
  tot: number
  showStats: boolean
  closed: boolean
  busy: boolean
  vote: (bytesList: readonly unknown[]) => void
  setVPop: Dispatch<SetStateAction<{ x: number; y: number; option: unknown } | null>>
  onMultiPendingChange?: (n: number) => void
}

/**
 * Remount when {@link pollMultiResyncKey} changes so checkbox state matches server
 * without a sync `setState` in an effect.
 */
function PollMultiInteractive({
  pollP,
  res,
  client,
  t,
  qId,
  tot,
  showStats,
  closed,
  busy,
  vote,
  setVPop,
  onMultiPendingChange,
}: PollMultiProps) {
  const [multiSel, setMultiSel] = useState(
    () => multiChosenOptionKeysFromResults(pollP, res)
  )
  useEffect(() => {
    onMultiPendingChange?.(multiSel.size)
  }, [multiSel, onMultiPendingChange])
  return (
    <>
      <ol
        className="msg-poll-options msg-poll-options--ctrl"
        aria-describedby={`${qId}-mode`}
      >
        {pollUiAnswers(pollP).map((a, i) => {
          const { text, entities } = asTwe(a.text)
          const n = pollOptionCount(res, a.option)
          const pct = pollOptionPct(n, tot)
          const row = res?.results?.find(
            (r) => isSameOptionBytes(r.option as PollOptionBytes, a.option as PollOptionBytes)
          )
          const ok = Boolean(pollP.quiz && row && row.className === "PollAnswerVoters" && row.correct)
          const optB = a.option
          const optKey = (optB as { toString(): string }).toString()
          const inMulti = multiSel.has(optKey)
          const optId = `${qId}-opt-${i}`
          return (
            <li key={i} className={`msg-poll-row ${ok ? "msg-poll-row--correct" : ""} ${showStats ? "msg-poll-row--stat" : ""}`.trim()}>
              {showStats
                ? (
                    <div className="msg-poll-bgt" aria-hidden>
                      <div
                        className="msg-poll-bgfill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )
                : null}
              <div className="msg-poll-ctrlrow">
                <label
                  className={`msg-poll-opt ${inMulti ? "msg-poll-opt--on" : ""}`.trim()}
                  htmlFor={optId}
                >
                  <input
                    id={optId}
                    className="msg-poll-inp msg-poll-inp--check"
                    type="checkbox"
                    checked={inMulti}
                    disabled={closed || busy}
                    onChange={() => {
                      if (closed || busy) {
                        return
                      }
                      setMultiSel((prev) => {
                        const next = new Set(prev)
                        if (next.has(optKey)) {
                          next.delete(optKey)
                        } else {
                          next.add(optKey)
                        }
                        return next
                      })
                    }}
                  />
                  <span className="msg-poll-opt__txt">
                    {renderMessageEntities(text, entities, client, t)}
                  </span>
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
                </label>
                {showStats && pollP.publicVoters && n > 0
                  ? (
                      <button
                        type="button"
                        className="msg-poll-who"
                        onClick={(e) => {
                          e.stopPropagation()
                          setVPop({ x: e.clientX, y: e.clientY, option: optB })
                        }}
                        aria-label={t("chat.pollVotersOpen")}
                      >
                        {t("chat.pollVotersOpen")}
                      </button>
                    )
                  : null}
              </div>
            </li>
          )
        })}
      </ol>
      {!closed && pollUiAnswers(pollP).length > 0
        ? (
            <div className="msg-poll-multi-actions">
              <Button
                type="button"
                size="sm"
                disabled={busy || multiSel.size === 0}
                onClick={() => {
                  const chosenBytes = pollUiAnswers(pollP)
                    .filter(
                      (a) => multiSel.has(
                        a.option.toString()
                      )
                    )
                    .map((a) => a.option)
                  void vote(chosenBytes)
                }}
              >
                {multiSel.size > 0
                  ? t("chat.pollVoteWithCount", { n: multiSel.size })
                  : t("chat.pollSubmitVote")}
              </Button>
            </div>
          )
        : null}
    </>
  )
}

export function MessagePollView({
  media,
  t,
  client,
  messageId,
  entity,
  onVoted,
}: {
  media: Api.MessageMediaPoll
  t: MessageMediaTranslateFn
  client: TelegramClient
  messageId: number
  entity: unknown
  onVoted: () => void
}) {
  const p = media.poll
  const isPoll = p.className === "Poll"
  const pollP = isPoll ? (p as Api.Poll) : null
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [vPop, setVPop] = useState<{ x: number; y: number; option: unknown } | null>(null)
  const reactId = useId()
  const qId = `poll-q-${messageId}-${reactId.replace(/:/g, "")}`
  const { text: q, entities: qE } = asTwe(pollP?.question ?? "")
  const res =
    media.results?.className === "PollResults"
      ? (media.results as Api.PollResults)
      : null
  const closed = Boolean(pollP?.closed)
  const multi = Boolean(pollP?.multipleChoice)
  const resultRow = (a: Api.PollAnswer) => res?.results?.find(
    (r) => isSameOptionBytes(r.option as PollOptionBytes, a.option as PollOptionBytes)
  )

  const tot = res?.totalVoters ?? 0
  const hasVoted = useMemo(
    () => (pollP && res ? pollUserHasVoted(pollP, res) : false),
    [pollP, res]
  )
  const showStats = useMemo(
    () => (pollP && res ? shouldShowPollResultBreakdown(res, hasVoted, closed) : false),
    [pollP, res, hasVoted, closed]
  )

  const vote = useCallback(
    async (bytesList: readonly unknown[]) => {
      if (bytesList.length === 0) {
        return
      }
      setBusy(true)
      setErr(false)
      try {
        await sendPollVote(client, entity, messageId, bytesList)
        onVoted()
      } catch {
        setErr(true)
      } finally {
        setBusy(false)
      }
    },
    [client, entity, messageId, onVoted]
  )

  const groupRole = multi ? "group" : "radiogroup"
  const radioName = `poll-m${messageId}`

  const [multiPending, setMultiPending] = useState(0)

  const mediaState = useMemo(() => {
    if (busy) {
      return "loading"
    }
    if (!closed && multi && multiPending > 0) {
      return "loading"
    }
    if (closed && showStats) {
      return "full"
    }
    return "preview"
  }, [busy, closed, multi, multiPending, showStats])

  if (!pollP) {
    return null
  }

  return (
    <div className="msg-poll" data-media-state={mediaState}>
      {vPop
        ? (
            <MessagePollVotersPop
              key={`${messageId}-${String(vPop.option)}`}
              anchorX={vPop.x}
              anchorY={vPop.y}
              client={client}
              entity={entity}
              messageId={messageId}
              optionBytes={vPop.option}
              onClose={() => setVPop(null)}
              t={t}
            />
          )
        : null}
      {err ? <p className="small err" role="status">{t("chat.pollVoteError")}</p> : null}
      <div className="msg-poll-head">
        <div className="msg-poll-question" id={qId}>
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
      <div className="msg-poll-answers" role={groupRole} aria-labelledby={qId}>
        <p className="visually-hidden" id={`${qId}-mode`}>
          {multi ? t("chat.pollHelpMultiple") : t("chat.pollHelpSingle")}
        </p>
        {multi
          ? (
              <PollMultiInteractive
                key={pollMultiResyncKey(pollP, res)}
                pollP={pollP}
                res={res}
                client={client}
                t={t}
                qId={qId}
                tot={tot}
                showStats={showStats}
                closed={closed}
                busy={busy}
                vote={(bytes) => { void vote(bytes) }}
                setVPop={setVPop}
                onMultiPendingChange={setMultiPending}
              />
            )
          : (
              <ol
                className="msg-poll-options msg-poll-options--ctrl"
                aria-describedby={`${qId}-mode`}
              >
                {pollUiAnswers(pollP).map((a, i) => {
                  const { text, entities } = asTwe(a.text)
                  const n = pollOptionCount(res, a.option)
                  const pct = pollOptionPct(n, tot)
                  const row = resultRow(a)
                  const ok = Boolean(pollP.quiz && row && row.className === "PollAnswerVoters" && row.correct)
                  const chosen = isPollOptionChosenRow(row)
                  const optB = a.option
                  const isOn = chosen
                  const optId = `${qId}-opt-${i}`
                  return (
                    <li key={i} className={`msg-poll-row ${ok ? "msg-poll-row--correct" : ""} ${showStats ? "msg-poll-row--stat" : ""}`.trim()}>
                      {showStats
                        ? (
                            <div className="msg-poll-bgt" aria-hidden>
                              <div
                                className="msg-poll-bgfill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )
                        : null}
                      <div className="msg-poll-ctrlrow">
                        <label
                          className={`msg-poll-opt ${isOn ? "msg-poll-opt--on" : ""}`.trim()}
                          htmlFor={optId}
                        >
                          <input
                            id={optId}
                            className="msg-poll-inp msg-poll-inp--radio"
                            type="radio"
                            name={radioName}
                            checked={chosen}
                            disabled={closed || busy}
                            onChange={() => {
                              if (closed || busy) {
                                return
                              }
                              void vote([optB])
                            }}
                          />
                          <span className="msg-poll-opt__txt">
                            {renderMessageEntities(text, entities, client, t)}
                          </span>
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
                        </label>
                        {showStats && pollP.publicVoters && n > 0
                          ? (
                              <button
                                type="button"
                                className="msg-poll-who"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setVPop({ x: e.clientX, y: e.clientY, option: optB })
                                }}
                                aria-label={t("chat.pollVotersOpen")}
                              >
                                {t("chat.pollVotersOpen")}
                              </button>
                            )
                          : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
      </div>
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
