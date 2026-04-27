import type { BigInteger } from "big-integer"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useCallback, useEffect, useState, type MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import { getCustomEmojiObjectUrl } from "../telegram/customEmojiCache"
import { MessageReactionRepliersPop } from "./MessageReactionRepliersPop"
import { reactionKey, reactionsEqual, myReactionsList } from "./reactionRepliersUi"

function reKey(c: Api.ReactionCount, i: number) {
  return `${reactionKey(c.reaction)}-${i}`
}

function CustomReactionEmoji({ documentId, client }: { documentId: BigInteger; client: TelegramClient }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let a = true
    void getCustomEmojiObjectUrl(client, documentId).then((u) => {
      if (a) {
        setUrl(u)
      }
    })
    return () => {
      a = false
    }
  }, [client, documentId])
  if (url) {
    return <img className="msg-reaction-emoji--custom" src={url} alt="" width={18} height={18} decoding="async" />
  }
  return <span className="msg-reaction-emoji--ph" aria-hidden />
}

function reactionButtonLabel(
  re: Api.TypeReaction,
  t: (k: string) => string
): string {
  if (re.className === "ReactionEmoji") {
    return (re as Api.ReactionEmoji).emoticon
  }
  if (re.className === "ReactionCustomEmoji") {
    return t("chat.reactionRepliersCustom")
  }
  return "·"
}

export function MessageReactionsView({
  reactions,
  client,
  entity,
  messageId,
  onUpdate,
}: {
  reactions: Api.TypeMessageReactions | undefined
  client: TelegramClient | null
  entity: unknown | null
  messageId: number
  onUpdate?: () => void
}) {
  const { t } = useTranslation()
  const interactive = Boolean(client && entity != null && onUpdate != null)
  const [repliers, setRepliers] = useState<{
    ax: number
    ay: number
    re: Api.TypeReaction
    label: string
  } | null>(null)

  const myReactions = myReactionsList(
    reactions?.className === "MessageReactions" ? (reactions as Api.MessageReactions).recentReactions : undefined
  )
  const list = reactions?.className === "MessageReactions" ? (reactions as Api.MessageReactions).results ?? [] : []
  const hasReactions = list.length > 0

  const openRepliers = useCallback(
    (e: MouseEvent, re: Api.TypeReaction) => {
      e.stopPropagation()
      if (!interactive || re.className === "ReactionPaid" || re.className === "ReactionEmpty") {
        return
      }
      const el = e.currentTarget
      if (!(el instanceof HTMLElement)) {
        return
      }
      const r = el.getBoundingClientRect()
      setRepliers({
        ax: r.left + r.width / 2,
        ay: r.top,
        re,
        label: reactionButtonLabel(re, t),
      })
    },
    [interactive, t]
  )

  if (!reactions && !interactive) {
    return null
  }

  if (reactions && reactions.className !== "MessageReactions") {
    return null
  }

  if (!hasReactions && !interactive) {
    return null
  }

  return (
    <>
    <div
      className="msg-reactions"
      role={interactive ? "group" : "list"}
      aria-label={interactive ? t("chat.reactions") : undefined}
    >
      {list.map((c, i) => {
        const n = c.count
        if (n < 0) {
          return null
        }
        const re = c.reaction
        const mine = myReactions.some((m) => reactionsEqual(m, re))
        if (re.className === "ReactionEmoji") {
          const e = re as Api.ReactionEmoji
          const el = (
            <span className="msg-reaction-emoji" aria-hidden>
              {e.emoticon}
            </span>
          )
          if (interactive) {
            return (
              <button
                type="button"
                key={reKey(c, i)}
                className={`msg-reaction${mine ? " msg-reaction--mine" : ""}`}
                title={t("chat.reactionCount", { n: String(n) })}
                onClick={(ev) => {
                  openRepliers(ev, re)
                }}
                aria-pressed={mine}
              >
                {el}
                {n > 0 ? <span className="msg-reaction-count">{n}</span> : null}
              </button>
            )
          }
          return (
            <span className="msg-reaction" key={reKey(c, i)} title={String(n)}>
              {el}
              {n > 0 ? <span className="msg-reaction-count">{n}</span> : null}
            </span>
          )
        }
        if (re.className === "ReactionCustomEmoji" && client) {
          const e = re as Api.ReactionCustomEmoji
          const el = <CustomReactionEmoji documentId={e.documentId} client={client} />
          if (interactive) {
            return (
              <button
                type="button"
                key={reKey(c, i)}
                className={`msg-reaction${mine ? " msg-reaction--mine" : ""}`}
                title={t("chat.reactionCount", { n: String(n) })}
                onClick={(ev) => {
                  openRepliers(ev, re)
                }}
                aria-pressed={mine}
              >
                {el}
                {n > 0 ? <span className="msg-reaction-count">{n}</span> : null}
              </button>
            )
          }
          return (
            <span className="msg-reaction" key={reKey(c, i)} title={String(n)}>
              {el}
              {n > 0 ? <span className="msg-reaction-count">{n}</span> : null}
            </span>
          )
        }
        return null
      })}
    </div>
    {repliers != null && client && entity != null && onUpdate != null && reactions != null
      && reactions.className === "MessageReactions" ? (
        <MessageReactionRepliersPop
        open
        anchorX={repliers.ax}
        anchorY={repliers.ay}
        client={client}
        entity={entity}
        messageReactions={reactions}
        messageId={messageId}
        targetReaction={repliers.re}
        reactionLabel={repliers.label}
        t={t}
        onClose={() => {
          setRepliers(null)
        }}
        onUpdated={() => {
          setRepliers(null)
          onUpdate()
        }}
      />
      ) : null}
    </>
  )
}
