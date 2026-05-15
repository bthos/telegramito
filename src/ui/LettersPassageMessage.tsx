import type { MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { usePeerName } from "../hooks/usePeerName"
import { formatMessageTime } from "../util/timeFormat"
import type { MessageClusterRole } from "../telegram/messageBubbleGroup"
import { getTickState } from "../telegram/messageTickState"
import { MessageReplyView } from "./MessageReplyView"
import { MessageMediaView } from "./MessageMediaView"
import { MessageTextContent } from "./MessageTextContent"
import { MessageReactionsView } from "./MessageReactionsView"
import { TickIcon } from "./TickIcon"
import { EmojiOutlineIcon } from "./ChatChromeIcons"
import { Button } from "./ds"

type Props = {
  message: Api.Message
  rowIndex: number
  gutterClass: string
  clusterRole: MessageClusterRole | undefined
  isGroup: boolean
  peerDisplayName: string
  client: TelegramClient | null
  entity: Dialog["entity"]
  readOutboxMaxId: number
  isBroadcastChannel: boolean
  highlightedMessageId: number | null
  showMessageIds: boolean
  filterGifs: boolean
  noPreview: boolean
  patchMessageReactions: (id: number, next: Api.MessageReactions) => void
  refreshMessagesById: (ids: number[]) => void | Promise<void>
  /** Letters: opens emoji reaction picker — only this control triggers it (not the message body). */
  onLettersReactionPicker?: (e: MouseEvent<HTMLButtonElement>, m: Api.Message) => void
  mediaViewerCaption: string
  resolveRepliedMessage?: (replyToMsgId: number) => Api.Message | undefined
  onGoToQuoted?: (messageId: number) => void | Promise<void>
}

function clusterShowsSenderLine(role: MessageClusterRole | undefined): boolean {
  return role === undefined || role === "single" || role === "first"
}

/**
 * Letters v2 transcript row — two-column “passage” layout (speaker · body); reactions sit with the speaker.
 * @see `.artefacts/features/2026-05-15-letters-v2/handoff/README.md`
 */
export function LettersPassageMessage({
  message: m,
  rowIndex,
  gutterClass,
  clusterRole,
  isGroup,
  peerDisplayName,
  client,
  entity,
  readOutboxMaxId,
  isBroadcastChannel,
  highlightedMessageId,
  showMessageIds,
  filterGifs,
  noPreview,
  onLettersReactionPicker,
  patchMessageReactions,
  refreshMessagesById,
  mediaViewerCaption,
  resolveRepliedMessage,
  onGoToQuoted,
}: Props) {
  const { t, i18n } = useTranslation()
  const mid = m.id ?? 0
  const fromId = m.className === "Message" ? m.fromId : undefined
  const senderPeerName = usePeerName(fromId, client)

  const isOut = Boolean(m.out)
  const showLine = clusterShowsSenderLine(clusterRole)

  const postAuthorTrimmed = typeof m.postAuthor === "string" ? m.postAuthor.trim() : ""
  const peerTitleTrimmed = peerDisplayName.trim()
  const senderTrimmed = senderPeerName.trim()

  let speakerLabel: string
  if (isOut) {
    speakerLabel = t("letters.passageYou")
  } else if (isGroup) {
    speakerLabel =
      senderTrimmed
      || postAuthorTrimmed
      || peerTitleTrimmed
      || t("letters.passageUnknownSender")
  } else {
    speakerLabel =
      peerTitleTrimmed || senderTrimmed || postAuthorTrimmed || t("letters.passageUnknownSender")
  }

  const tickState =
    isOut && m.className === "Message"
      ? getTickState(m, readOutboxMaxId, { isBroadcastChannel })
      : null
  let tickAria = ""
  if (tickState === "sent") tickAria = t("chat.tickSent")
  else if (tickState === "delivered") tickAria = t("chat.tickDelivered")
  else if (tickState === "read") tickAria = t("chat.tickRead")

  const timeIso = new Date(m.date * 1000).toISOString()
  const timeFmt = formatMessageTime(m.date, i18n.language)

  const searchHit =
    highlightedMessageId != null && mid === highlightedMessageId
      ? " letters-passage--search-hit"
      : ""

  const canOpenReactionPicker = Boolean(
    client != null && entity != null && onLettersReactionPicker != null,
  )

  return (
    <li
      className={`${gutterClass} letters-passage${searchHit}`}
      data-chat-row-index={rowIndex}
      data-chat-message-id={String(mid)}
      data-msg-out={isOut ? "1" : "0"}
    >
      <article className="letters-passage__sheet">
        <div className="letters-passage__grid">
          <div className="letters-passage__speaker">
            <time className="letters-passage__speaker-time" dateTime={timeIso}>
              {timeFmt}
            </time>
            {showLine ? (
              <span
                className={
                  isOut
                    ? "letters-passage__speaker-name letters-passage__speaker-name--self"
                    : "letters-passage__speaker-name"
                }
              >
                {speakerLabel ? `\u2014 ${speakerLabel}` : "\u00A0"}
              </span>
            ) : (
              <span className="letters-passage__speaker-name letters-passage__speaker-name--spacer" aria-hidden>
                {"\u00A0"}
              </span>
            )}
            {isOut && tickState != null ? (
              <div className="letters-passage__ticks" aria-live="polite">
                <TickIcon state={tickState} label={tickAria} />
              </div>
            ) : null}
            {canOpenReactionPicker || m.reactions != null ? (
              <div className="letters-passage__reactions-slot" aria-label={t("letters.passageMarginAria")}>
                <div className="letters-passage__reactions">
                  <MessageReactionsView
                    reactions={m.reactions}
                    client={client}
                    entity={entity ?? null}
                    messageId={mid}
                    onUpdate={(fromUpdate) => {
                      if (fromUpdate != null && fromUpdate.className === "MessageReactions") {
                        patchMessageReactions(mid, fromUpdate as Api.MessageReactions)
                        return
                      }
                      void refreshMessagesById([mid])
                    }}
                  />
                </div>
                {canOpenReactionPicker ? (
                  <Button
                    type="button"
                    variant="ghostIcon"
                    size="sm"
                    className="letters-passage__reaction-picker"
                    aria-label={t("chat.addReaction")}
                    title={t("chat.addReaction")}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onLettersReactionPicker?.(ev, m)
                    }}
                  >
                    <EmojiOutlineIcon />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            className={
              isOut ? "letters-passage__body letters-passage__body--out" : "letters-passage__body letters-passage__body--in"
            }
          >
            {showMessageIds ? (
              <div className="msg-debug-id-row" translate="no">
                <span className="msg-debug-id">{t("chat.messageIdLabel", { id: String(mid) })}</span>
              </div>
            ) : null}
            <MessageReplyView
              reply={m.replyTo}
              client={client}
              resolveRepliedMessage={resolveRepliedMessage}
              onGoToQuoted={onGoToQuoted}
            />
            <div className="msg-media-thumb">
              <MessageMediaView
                message={m}
                client={client}
                noPreview={noPreview}
                filterGifs={filterGifs}
                t={t}
                viewerContext={{
                  peerTitle: peerDisplayName,
                  sentAtLabel: timeFmt,
                  caption: mediaViewerCaption,
                }}
                pollVoter={
                  client && entity
                    ? {
                        entity,
                        onVoted: () => {
                          void refreshMessagesById([mid])
                        },
                      }
                    : undefined
                }
              />
            </div>
            <p className="msg-text letters-passage__prose">
              <MessageTextContent message={m} client={client} noPreview={noPreview} t={t} />
            </p>
          </div>
        </div>
      </article>
    </li>
  )
}
