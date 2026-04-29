import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useFocusTrap } from "../hooks/useFocusTrap"
import {
  availableEntryToTypeReaction,
  getAvailableReactionsForClient,
  pickReactionDisplayDocument,
} from "../telegram/availableReactionsCache"
import { getReactionStaticIconObjectUrl } from "../telegram/customEmojiCache"
import { setMessageReactions } from "../telegram/reactionsAndPolls"

type TChat = (k: string, o?: Record<string, string | number | undefined>) => string

function reactionKey(r: Api.TypeReaction): string {
  if (r.className === "ReactionEmpty") {
    return "e"
  }
  if (r.className === "ReactionEmoji") {
    return `em:${(r as Api.ReactionEmoji).emoticon}`
  }
  if (r.className === "ReactionCustomEmoji") {
    return `c:${String((r as Api.ReactionCustomEmoji).documentId)}`
  }
  return "?"
}

function reactionsEqual(a: Api.TypeReaction, b: Api.TypeReaction): boolean {
  return reactionKey(a) === reactionKey(b)
}

function myReactionsList(recent: readonly Api.TypeMessagePeerReaction[] | undefined): Api.TypeReaction[] {
  if (!recent?.length) {
    return []
  }
  return recent
    .filter((x) => x.className === "MessagePeerReaction" && (x as Api.MessagePeerReaction).my)
    .map((x) => (x as Api.MessagePeerReaction).reaction)
    .filter(
      (r) =>
        r.className === "ReactionEmoji" || r.className === "ReactionCustomEmoji"
    ) as Api.TypeReaction[]
}

function ReactionItem({
  item,
  client,
  isMine,
  busy,
  onPress,
  t,
}: {
  item: Api.AvailableReaction
  client: TelegramClient
  isMine: boolean
  busy: boolean
  onPress: (r: Api.TypeReaction) => void
  t: TChat
}) {
  const tReact = useMemo(() => availableEntryToTypeReaction(item), [item])
  const [ico, setIco] = useState<string | null>(null)
  const displayDoc = useMemo(
    () => (item.className === "AvailableReaction" ? pickReactionDisplayDocument(item) : undefined),
    [item]
  )
  useEffect(() => {
    if (displayDoc == null) {
      return
    }
    let a = true
    void getReactionStaticIconObjectUrl(client, displayDoc).then((u) => {
      if (a) {
        setIco(u)
      }
    })
    return () => {
      a = false
    }
  }, [client, displayDoc])

  if (tReact.className === "ReactionPaid" || tReact.className === "ReactionEmpty") {
    return null
  }

  return (
    <button
      type="button"
      className={`msg-reaction-pop__btn${isMine ? " msg-reaction-pop__btn--on" : ""}`.trim()}
      title={item.premium ? `${item.title} (${t("chat.reactionPremiumOnly")})` : item.title}
      disabled={busy}
      onClick={() => { onPress(tReact) }}
      role="option"
      aria-selected={isMine}
    >
      {ico
        ? <img className="msg-reaction-pick-ico" src={ico} alt={item.title} width={32} height={32} decoding="async" />
        : <span className="msg-reaction-pick-ico msg-reaction-pick-ico--ph" aria-hidden />}
    </button>
  )
}

export function MessageReactionPicker({
  open,
  anchorX,
  anchorY,
  client,
  entity,
  message,
  onClose,
  onUpdated,
  t,
  onReply,
  onForward,
  canReply = true,
}: {
  open: boolean
  anchorX: number
  anchorY: number
  client: TelegramClient
  entity: unknown
  onClose: () => void
  /** When non-null, prefer this `MessageReactions` from `UpdateMessageReactions` over refetch. */
  onUpdated: (reactionsFromUpdate: Api.TypeMessageReactions | null) => void
  message: Api.Message
  t: TChat
  onReply?: () => void
  onForward?: () => void
  canReply?: boolean
}) {
  const { t: tRoot } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<Api.AvailableReaction[]>([])
  const [loadErr, setLoadErr] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(panelRef, open)
  const [place, setPlace] = useState({ top: 0, left: 0 })
  const idBase = useId()
  const headingId = `rep-pop-t-${idBase}`

  const mRe = message.reactions
  const myR = myReactionsList(
    mRe?.className === "MessageReactions" ? (mRe as Api.MessageReactions).recentReactions : undefined
  )
  const msgId = message.id

  useEffect(() => {
    if (!open) {
      return
    }
    let a = true
    setLoadErr(false)
    void (async () => {
      try {
        const raw = await getAvailableReactionsForClient(client)
        if (a) {
          setItems(
            raw.filter(
              (x): x is Api.AvailableReaction =>
                x.className === "AvailableReaction" && !x.inactive
            )
          )
        }
      } catch {
        if (a) {
          setLoadErr(true)
          setItems([])
        }
      }
    })()
    return () => {
      a = false
    }
  }, [client, open])

  const showMessageBar =
    onForward != null
    || (onReply != null && canReply)

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    const el = panelRef.current
    if (!el) {
      return
    }
    const pad = 8
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vpW = window.innerWidth
    const vpH = window.innerHeight
    let top = anchorY + pad
    if (top + h > vpH - pad) {
      top = Math.max(pad, anchorY - h - pad)
    }
    if (top < pad) {
      top = pad
    }
    let left = anchorX - w * 0.15
    left = Math.max(pad, Math.min(left, vpW - w - pad))
    setPlace({ top, left })
  }, [open, anchorX, anchorY, items, loadErr, showMessageBar])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) {
        return
      }
      onClose()
    }
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("mousedown", onDown, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("mousedown", onDown, true)
    }
  }, [open, onClose])

  const apply = useCallback(
    async (next: readonly Api.TypeReaction[]) => {
      if (msgId == null) {
        return
      }
      setBusy(true)
      try {
        const fromUpdate = await setMessageReactions(client, entity, msgId, next)
        onUpdated(fromUpdate)
        onClose()
      } catch {
        /* */
      } finally {
        setBusy(false)
      }
    },
    [client, entity, msgId, onUpdated, onClose]
  )

  const onPress = useCallback(
    async (target: Api.TypeReaction) => {
      if (busy) {
        return
      }
      if (myR.some((r) => reactionsEqual(r, target))) {
        const next = myR.filter((r) => !reactionsEqual(r, target))
        await apply(next)
      } else {
        await apply([...myR, target])
      }
    },
    [apply, myR, busy]
  )

  if (!open) {
    return null
  }

  if (msgId == null) {
    return null
  }

  return (
    <div
      className="msg-reaction-pop"
      ref={panelRef}
      style={{ top: place.top, left: place.left }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      {showMessageBar
        ? (
            <div className="msg-bubble-action-row" role="group" aria-label={t("chat.messageActionsAria")}>
              {onReply != null && canReply
                ? (
                    <button
                      type="button"
                      className="msg-bubble-action"
                      onClick={() => {
                        onReply()
                        onClose()
                      }}
                    >
                      {t("chat.reply")}
                    </button>
                  )
                : null}
              {onForward != null
                ? (
                    <button
                      type="button"
                      className="msg-bubble-action"
                      onClick={() => {
                        onForward()
                      }}
                    >
                      {t("chat.forwardMessage")}
                    </button>
                  )
                : null}
            </div>
          )
        : null}
      <h3 className="visually-hidden" id={headingId}>
        {t("chat.addReaction")}
      </h3>
      {loadErr
        ? (
            <p className="msg-reaction-pop__err small" role="status">
              {tRoot("error")}
            </p>
          )
        : null}
      <div className="msg-reaction-pop__grid" role="listbox" aria-label={t("chat.addReaction")} aria-multiselectable>
        {items.map((it, i) => {
          if (it.className !== "AvailableReaction") {
            return null
          }
          const tR = availableEntryToTypeReaction(it)
          if (tR.className === "ReactionPaid" || tR.className === "ReactionEmpty") {
            return null
          }
          const isMine = myR.some((r) => reactionsEqual(r, tR))
          return (
            <ReactionItem
              key={`${i}-${(it as Api.AvailableReaction).reaction}`}
              item={it}
              client={client}
              isMine={isMine}
              busy={busy}
              onPress={(r) => { void onPress(r) }}
              t={t}
            />
          )
        })}
      </div>
    </div>
  )
}
