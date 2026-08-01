import { Api } from "telegram"
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { useTranslation } from "react-i18next"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { TelegramClient } from "telegram"
import type { ParentalSettings } from "../parental/types"
import { formatMessageDateSeparator, formatMessageTime, getLocalDayKey } from "../util/timeFormat"
import { getTickState, isBroadcastChannelEntity, readOutboxMaxIdFromDialog } from "../telegram/messageTickState"
import type { MessageClusterRole } from "../telegram/messageBubbleGroup"
import { forwardMessageInCurrentChat } from "../telegram/forwardInChat"
import { peerKeyFromPeer } from "../telegram/peerKey"
import { getDialogPreviewText } from "../telegram/dialogPreview"
import { addCoReadingBookmark } from "../util/lettersRitualsStorage"
import { getPeerInfo } from "../telegram/dialogUtils"
import { InboundClusterRow } from "./InboundClusterRow"
import { LettersPassageMessage } from "./LettersPassageMessage"
import { MessageTextContent } from "./MessageTextContent"
import { MessageMediaView } from "./MessageMediaView"
import { MessageReactionsView } from "./MessageReactionsView"
import { MessageReplyView } from "./MessageReplyView"
import { MessageListSkeleton } from "./MessageListSkeleton"
import { JumpDateCalendarPop } from "./JumpDateCalendarPop"
import { ScrollToBottomFab } from "./ScrollToBottomFab"
import { TypingIndicator } from "./TypingIndicator"
import { LettersFreshMailPill } from "./LettersFreshMailPill"
import { TickIcon } from "./TickIcon"
import { MessageReactionPicker } from "./MessageReactionPicker"
import type { ChatDatedItem } from "./chatDatedItem"
import {
  resolveReactionAnchor,
  shouldIgnoreClassicBubbleReactionClick,
  shouldToggleOffReactionPicker,
  type ReactionTarget,
} from "./chatReactionAnchor"

type Props = {
  scrollRef: RefObject<HTMLDivElement | null>
  jumpDateButtonRef: RefObject<HTMLButtonElement | null>
  datedList: readonly ChatDatedItem[]
  settings: ParentalSettings
  lettersLayout: boolean
  client: TelegramClient | null
  dialog: Dialog
  isGroup: boolean
  peerDisplayName: string
  loadingOlder: boolean
  isInitialLoad: boolean
  onScroll: () => void
  sliceActive: boolean
  sliceStart: number
  sliceEnd: number
  topSpacerPx: number
  bottomSpacerPx: number
  stickyDateLabel: string | null
  stickyDateTs: number | null
  loadedDayKeys: ReadonlySet<string>
  loadedDayBounds: { min: string | null; max: string | null }
  jumpCalOpen: boolean
  onToggleJumpCalendar: () => void
  onJumpToDayKey: (key: string) => void
  onDismissJumpCalendar: () => void
  highlightedMessageId: number | null
  clusterRoleByMessageId: Map<number, MessageClusterRole>
  resolveRepliedMessage: (replyToMsgId: number) => Api.Message | undefined
  goToQuotedMessage: (quotedId: number) => void
  patchMessageReactions: (messageId: number, next: Api.MessageReactions) => void
  refreshMessagesById: (ids: readonly number[]) => Promise<void>
  refreshHead: () => Promise<void>
  filterGifs: boolean
  noPreview: boolean
  reactionTarget: ReactionTarget | null
  setReactionTarget: (t: ReactionTarget | null) => void
  setReplyingTo: (m: Api.Message | null) => void
  setMessageActionError: (msg: string | null) => void
  handlePinToggle: (m: Api.Message, pin: boolean) => void
  onCoReadingBookmarked?: () => void
  isForum: boolean
  topicId: number | null
  list: Api.Message[]
  scrollFabVisible: boolean
  onScrollToLatest: () => void
  threadUnreadCount: number
  showFreshMailPill: boolean
  onScrollToFirstUnread: () => void
  typers: string[]
}

export function ChatMessageList({
  scrollRef,
  jumpDateButtonRef,
  datedList,
  settings,
  lettersLayout,
  client,
  dialog,
  isGroup,
  peerDisplayName,
  loadingOlder,
  isInitialLoad,
  onScroll,
  sliceActive,
  sliceStart,
  sliceEnd,
  topSpacerPx,
  bottomSpacerPx,
  stickyDateLabel,
  stickyDateTs,
  loadedDayKeys,
  loadedDayBounds,
  jumpCalOpen,
  onToggleJumpCalendar,
  onJumpToDayKey,
  onDismissJumpCalendar,
  highlightedMessageId,
  clusterRoleByMessageId,
  resolveRepliedMessage,
  goToQuotedMessage,
  patchMessageReactions,
  refreshMessagesById,
  refreshHead,
  filterGifs,
  noPreview,
  reactionTarget,
  setReactionTarget,
  setReplyingTo,
  setMessageActionError,
  handlePinToggle,
  onCoReadingBookmarked,
  isForum,
  topicId,
  list,
  scrollFabVisible,
  onScrollToLatest,
  threadUnreadCount,
  showFreshMailPill,
  onScrollToFirstUnread,
  typers,
}: Props) {
  const { t, i18n } = useTranslation()

  const readOutboxMaxId = useMemo(() => readOutboxMaxIdFromDialog(dialog), [dialog])
  const isBroadcastChannel = useMemo(
    () => isBroadcastChannelEntity(dialog.entity),
    [dialog.entity],
  )

  const openReactionPicker = useCallback(
    (e: MouseEvent<Element>, m: Api.Message, preferCenter: boolean) => {
      const mid = m.id
      if (mid == null || client == null || dialog.entity == null) {
        return
      }
      if (shouldToggleOffReactionPicker(reactionTarget?.id, mid)) {
        setReactionTarget(null)
        return
      }
      const anchor = resolveReactionAnchor(e, { preferCurrentTargetCenter: preferCenter })
      setReactionTarget({ id: mid, ...anchor })
    },
    [client, dialog.entity, reactionTarget?.id, setReactionTarget],
  )

  const onMessageBubbleReactions = useCallback(
    (e: MouseEvent, m: Api.Message) => {
      if (m.id == null || client == null || dialog.entity == null) {
        return
      }
      if (shouldToggleOffReactionPicker(reactionTarget?.id, m.id)) {
        setReactionTarget(null)
        return
      }
      if (shouldIgnoreClassicBubbleReactionClick(e)) {
        return
      }
      const anchor = resolveReactionAnchor(e)
      setReactionTarget({ id: m.id, ...anchor })
    },
    [client, dialog.entity, reactionTarget?.id, setReactionTarget],
  )

  useEffect(() => {
    if (reactionTarget == null) {
      return
    }
    const sc = scrollRef.current
    if (sc == null) {
      return
    }
    const fn = () => {
      setReactionTarget(null)
    }
    sc.addEventListener("scroll", fn, { passive: true })
    return () => {
      sc.removeEventListener("scroll", fn)
    }
  }, [reactionTarget, scrollRef, setReactionTarget])

  useEffect(() => {
    if (reactionTarget == null) {
      return
    }
    if (!list.some((m) => m.id === reactionTarget.id)) {
      queueMicrotask(() => {
        setReactionTarget(null)
      })
    }
  }, [list, reactionTarget, setReactionTarget])

  const pickerMessage = useMemo(
    () =>
      reactionTarget == null
        ? null
        : (list.find((m) => m.id === reactionTarget.id) ?? null),
    [list, reactionTarget],
  )

  const renderDatedItem = useCallback(
    (item: ChatDatedItem, rowIndex: number): ReactNode => {
      if (item.kind === "catchup") {
        const dateLabel = formatMessageDateSeparator(item.ts, i18n.language)
        const childMode = settings.appMode === "child"
        return (
          <li
            className="letters-catchup"
            role="separator"
            aria-label={
              childMode
                ? t("letters.catchUpRibbonAriaChild", { date: dateLabel })
                : t("letters.catchUpRibbonAria", { date: dateLabel })
            }
            data-chat-row-index={rowIndex}
          >
            {childMode
              ? t("letters.catchUpRibbonChild", { date: dateLabel })
              : t("letters.catchUpRibbon", { date: dateLabel })}
          </li>
        )
      }
      if (item.kind === "sep") {
        const timeEl = (
          <time
            className="msg-date-pill"
            dateTime={item.dayKey}
            title={new Date(item.ts * 1000).toLocaleString(i18n.language, {
              dateStyle: "full",
              timeStyle: "short",
              hour12: false,
            })}
          >
            {formatMessageDateSeparator(item.ts, i18n.language)}
          </time>
        )
        return (
          <li
            className="msg-date"
            role="presentation"
            data-chat-row-index={rowIndex}
            data-chat-day-key={item.dayKey}
          >
            {timeEl}
          </li>
        )
      }
      const m = item.message
      if (!m.id) {
        return null
      }
      const isOut = Boolean(m.out)
      const tickState =
        isOut && m.className === "Message"
          ? getTickState(m, readOutboxMaxId, { isBroadcastChannel })
          : null
      let tickAria = ""
      if (tickState === "sent") tickAria = t("chat.tickSent")
      else if (tickState === "delivered") tickAria = t("chat.tickDelivered")
      else if (tickState === "read") tickAria = t("chat.tickRead")
      const clusterRole = m.id != null ? clusterRoleByMessageId.get(m.id) : undefined
      const gutterBase = isOut ? "msg-gutter msg-gutter--out" : "msg-gutter msg-gutter--in"
      const gutterHighlight =
        lettersLayout ? ""
        : highlightedMessageId != null && m.id === highlightedMessageId ? " msg-gutter--search-hit"
        : ""
      const gutterClass =
        (
          clusterRole != null && clusterRole !== "single"
            ? `${gutterBase} msg-gutter--cluster-${clusterRole}`
            : gutterBase
        ) + gutterHighlight
      if (lettersLayout) {
        return (
          <LettersPassageMessage
            message={m}
            rowIndex={rowIndex}
            gutterClass={gutterClass}
            clusterRole={clusterRole}
            isGroup={isGroup}
            peerDisplayName={peerDisplayName}
            client={client}
            entity={dialog.entity}
            readOutboxMaxId={readOutboxMaxId}
            isBroadcastChannel={isBroadcastChannel}
            highlightedMessageId={highlightedMessageId}
            showMessageIds={settings.showMessageIds}
            filterGifs={filterGifs}
            noPreview={noPreview}
            onLettersReactionPicker={(e, msg) => openReactionPicker(e, msg, true)}
            patchMessageReactions={patchMessageReactions}
            refreshMessagesById={refreshMessagesById}
            mediaViewerCaption={typeof m.message === "string" ? m.message.trim() : ""}
            resolveRepliedMessage={resolveRepliedMessage}
            onGoToQuoted={goToQuotedMessage}
          />
        )
      }
      const hasVein = clusterRole === "single" || clusterRole === "last"
      const bubbleClass = [
        "msg-bubble",
        isOut ? "msg-bubble--out" : "msg-bubble--in",
        hasVein ? (isOut ? "msg-bubble--vein-out" : "msg-bubble--vein-in") : "",
      ].filter(Boolean).join(" ")
      const bubble = (
        <div
          className={bubbleClass}
          title={client && dialog.entity ? t("chat.messageClickHint") : undefined}
          onClick={(e) => { onMessageBubbleReactions(e, m) }}
        >
          {settings.showMessageIds ? (
            <div className="msg-debug-id-row" translate="no">
              <span className="msg-debug-id">{t("chat.messageIdLabel", { id: String(m.id) })}</span>
            </div>
          ) : null}
          <MessageReplyView
            reply={m.replyTo}
            client={client}
            resolveRepliedMessage={resolveRepliedMessage}
            onGoToQuoted={goToQuotedMessage}
            onNeedsResolve={(replyId) => { void refreshMessagesById([replyId]) }}
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
                sentAtLabel: formatMessageTime(m.date, i18n.language),
                caption: typeof m.message === "string" ? m.message.trim() : "",
                captionAbove: m.className === "Message" ? Boolean(m.invertMedia) : false,
              }}
              pollVoter={
                client && dialog.entity
                  ? {
                      entity: dialog.entity,
                      onVoted: () => {
                        void refreshMessagesById([m.id!])
                      },
                    }
                  : undefined
              }
            />
          </div>
          <p className="msg-text">
            <MessageTextContent message={m} client={client} noPreview={noPreview} t={t} />
          </p>
          <MessageReactionsView
            reactions={m.reactions}
            client={client}
            entity={dialog.entity ?? null}
            messageId={m.id!}
            onUpdate={(fromUpdate) => {
              if (fromUpdate != null && fromUpdate.className === "MessageReactions") {
                patchMessageReactions(m.id!, fromUpdate as Api.MessageReactions)
                return
              }
              void refreshMessagesById([m.id!])
            }}
          />
          {tickState != null ? (
            <span className="msg-time-row">
              <TickIcon state={tickState} label={tickAria} />
              <time className="msg-time" dateTime={new Date(m.date * 1000).toISOString()}>
                {formatMessageTime(m.date, i18n.language)}
              </time>
            </span>
          ) : (
            <time className="msg-time" dateTime={new Date(m.date * 1000).toISOString()}>
              {formatMessageTime(m.date, i18n.language)}
            </time>
          )}
        </div>
      )
      const bubbleWithAttribution =
        clusterRole != null ? (
          <InboundClusterRow
            message={m}
            clusterRole={clusterRole}
            isGroup={isGroup}
            client={client}
          >
            {bubble}
          </InboundClusterRow>
        ) : bubble
      return (
        <li
          className={gutterClass}
          data-chat-row-index={rowIndex}
          data-chat-message-id={String(m.id)}
        >
          {bubbleWithAttribution}
        </li>
      )
    },
    [
      client,
      clusterRoleByMessageId,
      isGroup,
      dialog.entity,
      filterGifs,
      i18n.language,
      noPreview,
      onMessageBubbleReactions,
      openReactionPicker,
      patchMessageReactions,
      readOutboxMaxId,
      refreshMessagesById,
      isBroadcastChannel,
      highlightedMessageId,
      t,
      peerDisplayName,
      settings.showMessageIds,
      settings.appMode,
      lettersLayout,
      resolveRepliedMessage,
      goToQuotedMessage,
    ],
  )

  return (
    <>
      <div className="message-scroll">
        <div
          className={
            datedList.length > 0
              ? "message-scroll__inner message-scroll__inner--has-date-float"
              : "message-scroll__inner"
          }
          ref={scrollRef}
          onScroll={onScroll}
        >
          {datedList.length > 0 && stickyDateLabel && loadedDayBounds.min != null && loadedDayBounds.max != null ? (
            <>
              <JumpDateCalendarPop
                open={jumpCalOpen}
                anchorRef={jumpDateButtonRef}
                loadedDayKeys={loadedDayKeys}
                minDayKey={loadedDayBounds.min}
                maxDayKey={loadedDayBounds.max}
                initialDayKey={
                  stickyDateTs != null
                    ? getLocalDayKey(stickyDateTs)
                    : loadedDayBounds.max
                }
                onPick={onJumpToDayKey}
                onDismiss={onDismissJumpCalendar}
              />
              <div className="message-scroll__date-overlay" aria-live="polite">
                <button
                  ref={jumpDateButtonRef}
                  type="button"
                  className="msg-date-pill msg-date-pill--floating msg-date-pill--jump"
                  onClick={onToggleJumpCalendar}
                  aria-label={t("chat.jumpToDate")}
                  aria-expanded={jumpCalOpen}
                  title={t("chat.jumpToDate")}
                >
                  {stickyDateLabel}
                </button>
              </div>
            </>
          ) : datedList.length > 0 && stickyDateLabel ? (
            <div className="message-scroll__date-overlay" aria-live="polite">
              <time
                className="msg-date-pill msg-date-pill--floating"
                dateTime={stickyDateTs != null ? getLocalDayKey(stickyDateTs) : undefined}
              >
                {stickyDateLabel}
              </time>
            </div>
          ) : null}
          {isInitialLoad ? (
            <MessageListSkeleton />
          ) : (
            <ul className="msg-list">
              {loadingOlder ? (
                <li className="msg-load-hint" key="load-older" aria-live="polite">
                  {t("loading")}
                </li>
              ) : null}
              {sliceActive && topSpacerPx > 0 ? (
                <li
                  key="msg-list-spacer-top"
                  className="msg-list-spacer"
                  aria-hidden
                  style={{ height: topSpacerPx, flexShrink: 0 }}
                />
              ) : null}
              {(sliceActive
                ? datedList.slice(sliceStart, sliceEnd + 1)
                : datedList
              ).map((item, i) => {
                const index = sliceActive ? sliceStart + i : i
                const k = item.kind === "sep"
                  ? `date-${item.dayKey}`
                  : item.kind === "catchup"
                    ? `catchup-${item.readInboxMaxId}`
                    : `msg-${peerKeyFromPeer(item.message.peerId)}-${item.message.id}`
                return (
                  <Fragment key={k}>
                    {renderDatedItem(item, index)}
                  </Fragment>
                )
              })}
              {sliceActive && bottomSpacerPx > 0 ? (
                <li
                  key="msg-list-spacer-bottom"
                  className="msg-list-spacer"
                  aria-hidden
                  style={{ height: bottomSpacerPx, flexShrink: 0 }}
                />
              ) : null}
            </ul>
          )}
        </div>
        <TypingIndicator typers={typers} />
        <ScrollToBottomFab
          visible={
            scrollFabVisible &&
            !showFreshMailPill &&
            datedList.some((x) => x.kind === "msg")
          }
          unreadBadge={lettersLayout ? undefined : threadUnreadCount}
          onClick={onScrollToLatest}
          label={t("chat.scrollToBottom")}
        />
      </div>
      {showFreshMailPill ? (
        <LettersFreshMailPill
          count={threadUnreadCount}
          childMode={settings.appMode === "child"}
          onClick={onScrollToFirstUnread}
        />
      ) : null}
      {client && dialog.entity && reactionTarget != null && pickerMessage != null ? (
        <MessageReactionPicker
          open
          anchorX={reactionTarget.x}
          anchorY={reactionTarget.y}
          client={client}
          entity={dialog.entity}
          message={pickerMessage}
          t={t}
          canReply={pickerMessage.className === "Message"}
          onReply={() => {
            setReplyingTo(pickerMessage)
            setMessageActionError(null)
          }}
          onPin={
            pickerMessage.className === "Message" && !pickerMessage.pinned
              ? () => { void handlePinToggle(pickerMessage, true) }
              : undefined
          }
          onUnpin={
            pickerMessage.className === "Message" && Boolean(pickerMessage.pinned)
              ? () => { void handlePinToggle(pickerMessage, false) }
              : undefined
          }
          onCoRead={
            settings.appMode === "parent"
              ? () => {
                  const m = pickerMessage
                  if (m.className !== "Message" || m.id == null) {
                    return
                  }
                  const { key, name } = getPeerInfo(dialog)
                  const preview =
                    typeof m.message === "string" && m.message.trim().length > 0
                      ? m.message.trim().slice(0, 120)
                      : getDialogPreviewText(dialog, t)
                  void addCoReadingBookmark({
                    chatId: key,
                    messageId: m.id,
                    chatTitle: name,
                    preview,
                  }).then(() => {
                    onCoReadingBookmarked?.()
                  })
                  setReactionTarget(null)
                }
              : undefined
          }
          onForward={() => {
            const m = pickerMessage
            if (m.id == null) {
              setReactionTarget(null)
              return
            }
            setReactionTarget(null)
            setMessageActionError(null)
            void (async () => {
              if (!client || !dialog.entity) {
                return
              }
              try {
                await forwardMessageInCurrentChat(
                  client,
                  dialog.entity,
                  m,
                  isForum && topicId != null ? topicId : null,
                )
                void refreshHead()
              } catch (e) {
                setMessageActionError(
                  e instanceof Error
                    ? e.message
                    : t("chat.forwardFailed"),
                )
              }
            })()
          }}
          onClose={() => {
            setReactionTarget(null)
          }}
          onUpdated={(fromUpdate) => {
            const id = reactionTarget?.id
            if (typeof id !== "number") {
              void refreshHead()
              return
            }
            if (fromUpdate != null && fromUpdate.className === "MessageReactions") {
              patchMessageReactions(id, fromUpdate as Api.MessageReactions)
              return
            }
            void refreshMessagesById([id])
          }}
        />
      ) : null}
    </>
  )
}
