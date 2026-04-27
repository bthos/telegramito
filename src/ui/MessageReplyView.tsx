import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { renderMessageEntities } from "./MessageTextContent"
import { useTranslation } from "react-i18next"

export function MessageReplyView({
  reply,
  client,
}: {
  reply: Api.TypeMessageReplyHeader | undefined
  client: TelegramClient | null
}) {
  const { t } = useTranslation()
  if (!reply || reply.className !== "MessageReplyHeader") {
    return null
  }
  const h = reply as Api.MessageReplyHeader
  if (h.quote && (h.quoteText?.length ?? 0) > 0) {
    const ent = h.quoteEntities ?? []
    if (client) {
      return (
        <div className="msg-reply msg-reply--quote" role="note">
          {renderMessageEntities(h.quoteText ?? "", ent, client, t)}
        </div>
      )
    }
    return (
      <div className="msg-reply msg-reply--quote" role="note">
        {h.quoteText}
      </div>
    )
  }
  const id = h.replyToMsgId
  return (
    <div className="msg-reply msg-reply--stub" role="note">
      {t("chat.replyingTo", { id: id ?? 0 })}
    </div>
  )
}
