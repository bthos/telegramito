import type { MouseEvent, ReactNode } from "react"
import { useEffect } from "react"

import { Api } from "teleproto"

import type { TelegramClient } from "teleproto"

import { useTranslation } from "react-i18next"

import { getRepliedMessagePreviewText } from "../telegram/dialogPreview"

import { renderMessageEntities } from "./MessageTextContent"

function ReplyNavShell({
  className,
  children,
  quotedId,
  onGoToQuoted,
  goToLabel,
}: {
  className: string
  children: ReactNode
  quotedId: number | null
  /** When set together with quotedId, the strip is clickable and scrolls to the message. */
  onGoToQuoted?: (messageId: number) => void
  goToLabel: string
}) {
  if (quotedId != null && quotedId > 0 && onGoToQuoted) {
    return (
      <button
        type="button"
        className={className}
        aria-label={`${goToLabel} (${quotedId})`}
        title={goToLabel}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation()
          void onGoToQuoted(quotedId)
        }}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={className} role="note">
      {children}
    </div>
  )
}

export function MessageReplyView({
  reply,
  client,
  resolveRepliedMessage,
  onGoToQuoted,
  onNeedsResolve,
}: {
  reply: Api.TypeMessageReplyHeader | undefined
  client: TelegramClient | null
  /** When TL omits quote text, resolve the target from loaded history by id. */
  resolveRepliedMessage?: (replyToMsgId: number) => Api.Message | undefined
  /** Jump in-thread to {@link Api.MessageReplyHeader#replyToMsgId}. */
  onGoToQuoted?: (messageId: number) => void
  /**
   * Called when the reply target has no quote text and isn't in loaded
   * history, so the caller can fetch it by id (e.g. `refreshMessagesById`).
   * Without this, a reply into history the client hasn't loaded yet
   * (common in large/active groups) renders the raw "Re: message #id"
   * fallback forever instead of resolving once fetched.
   */
  onNeedsResolve?: (replyToMsgId: number) => void
}) {
  const { t } = useTranslation()
  const goToLabel = t("chat.goToQuotedMessage")

  const h = reply && reply.className === "MessageReplyHeader" ? (reply as Api.MessageReplyHeader) : null
  const quotedId = typeof h?.replyToMsgId === "number" && h.replyToMsgId > 0 ? h.replyToMsgId : null
  const hasQuoteText = Boolean(h?.quote && (h.quoteText?.length ?? 0) > 0)
  const id = h?.replyToMsgId
  const resolved =
    !hasQuoteText && typeof id === "number" && id > 0 ? resolveRepliedMessage?.(id) : undefined
  const fromHistory = getRepliedMessagePreviewText(resolved, t)
  const isStub = h != null && !hasQuoteText && (fromHistory == null || fromHistory.length === 0)

  useEffect(() => {
    if (isStub && quotedId != null) {
      onNeedsResolve?.(quotedId)
    }
    // Only re-fire when the target id (or the resolve status for it) changes —
    // not on every unrelated re-render of the message list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStub, quotedId])

  if (!h) {
    return null
  }

  if (hasQuoteText) {
    const ent = h.quoteEntities ?? []
    const inner = client ? renderMessageEntities(h.quoteText ?? "", ent, client, t) : h.quoteText
    return (
      <ReplyNavShell
        className="msg-reply msg-reply--quote"
        quotedId={quotedId}
        onGoToQuoted={onGoToQuoted}
        goToLabel={goToLabel}
      >
        {inner}
      </ReplyNavShell>
    )
  }

  if (fromHistory != null && fromHistory.length > 0) {
    return (
      <ReplyNavShell
        className="msg-reply"
        quotedId={quotedId}
        onGoToQuoted={onGoToQuoted}
        goToLabel={goToLabel}
      >
        {fromHistory}
      </ReplyNavShell>
    )
  }

  return (
    <ReplyNavShell
      className="msg-reply msg-reply--stub"
      quotedId={quotedId}
      onGoToQuoted={onGoToQuoted}
      goToLabel={goToLabel}
    >
      {t("chat.reToMessage", { id: id ?? 0 })}
    </ReplyNavShell>
  )
}
