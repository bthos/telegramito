import type { MouseEvent, ReactNode } from "react"

import { Api } from "telegram"

import type { TelegramClient } from "telegram"

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

}: {

  reply: Api.TypeMessageReplyHeader | undefined

  client: TelegramClient | null

  /** When TL omits quote text, resolve the target from loaded history by id. */

  resolveRepliedMessage?: (replyToMsgId: number) => Api.Message | undefined

  /** Jump in-thread to {@link Api.MessageReplyHeader#replyToMsgId}. */

  onGoToQuoted?: (messageId: number) => void

}) {

  const { t } = useTranslation()

  const goToLabel = t("chat.goToQuotedMessage")

  if (!reply || reply.className !== "MessageReplyHeader") {

    return null

  }

  const h = reply as Api.MessageReplyHeader

  const quotedId =

    typeof h.replyToMsgId === "number" && h.replyToMsgId > 0 ? h.replyToMsgId : null



  if (h.quote && (h.quoteText?.length ?? 0) > 0) {

    const ent = h.quoteEntities ?? []

    const inner =

      client ? (

        renderMessageEntities(h.quoteText ?? "", ent, client, t)

      ) : (

        h.quoteText

      )

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

  const id = h.replyToMsgId

  const resolved =

    typeof id === "number" && id > 0 ? resolveRepliedMessage?.(id) : undefined

  const fromHistory = getRepliedMessagePreviewText(resolved, t)

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


