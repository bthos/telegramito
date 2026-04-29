import { Api } from "telegram"
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import type { Dialog } from "telegram/tl/custom/dialog"
import { useTelegram } from "../context/TelegramContext"
import { isPrivateChatHidden, shouldFilterGifs, shouldHideLinkPreviews } from "../parental/policy"
import type { ParentalSettings } from "../parental/types"
import { getReplyToPreviewText } from "../telegram/dialogPreview"
import { getPeerInfo, isUserContactForPolicy, isPrivateUserDialog } from "../telegram/dialogUtils"
import { useForumTopics } from "../hooks/useForumTopics"
import { useChatMessages } from "../hooks/useChatMessages"
import { useReadReceipt } from "../hooks/useReadReceipt"
import { useChatScroll } from "../hooks/useChatScroll"
import { requestChatAccessForDialog } from "../parental/requestAccess"
import { formatMessageDateSeparator, formatMessageTime, getLocalDayKey, getStickyDateTsForRow } from "../util/timeFormat"
import {
  findSepRowIndexForDayKey,
  getLoadedDayKeyBounds,
  getLoadedDayKeys,
} from "../util/chatHistoryJump"
import {
  formatTopicUnreadSuffix,
  forumTopicLabel,
  isForumWithSubchats,
  sendInForumThread,
} from "../telegram/forum"
import { collectCustomEmojiDocumentIdsFromMessages } from "../telegram/customEmojiFromMessages"
import { prefetchCustomEmojiDocuments } from "../telegram/customEmojiCache"
import { appLog } from "../util/appLogger"
import {
  computeMessageClusterRoles,
  type MessageClusterRole,
} from "../telegram/messageBubbleGroup"
import { isInboundUnreadForThread, readInboxMaxIdForThread } from "../telegram/messageUnread"
import { readMaxIdForMarkRead } from "../telegram/markChatRead"
import { forwardMessageInCurrentChat } from "../telegram/forwardInChat"
import { InboundClusterRow } from "./InboundClusterRow"
import { ForumTopicIcon, UnreadFilterIcon } from "./ChatFilterIcons"
import { ScrollToBottomFab } from "./ScrollToBottomFab"
import { JumpDateCalendarPop } from "./JumpDateCalendarPop"
import { Button } from "./ds"
import { MessageTextContent } from "./MessageTextContent"
import { MessageMediaView } from "./MessageMediaView"
import { MessageReactionPicker } from "./MessageReactionPicker"
import { MessageReactionsView } from "./MessageReactionsView"
import { MessageReplyView } from "./MessageReplyView"
import {
  ChatMessagesVirtualList,
  type ChatDatedItem,
  type ChatMessagesVirtualListHandle,
} from "./ChatMessagesVirtualList"
import { MessageListSkeleton } from "./MessageListSkeleton"

type Props = {
  dialog: Dialog
  settings: ParentalSettings
  /** When the shell renders its own top bar (narrow layout), skip the title row. */
  showTitle?: boolean
}

type ChatListItem = ChatDatedItem

const VIRTUAL_MSG_THRESHOLD = 48

/** DOM mount for narrow layout unread toggle (see `MainShell` mobile header). */
export const THREAD_HEADER_ACTIONS_ID = "thread-header-actions"

function UnreadOnlyMessagesToggle({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const uid = useId()
  const labelId = `${uid}-unread-only-lbl`
  return (
    <div className="thread-header__unread">
      <span id={labelId} className="thread-header__unread-label">
        <UnreadFilterIcon />
        <span>{t("chat.messagesUnreadOnly")}</span>
      </span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={active}
        aria-labelledby={labelId}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            onToggle()
          }
        }}
        onClick={onToggle}
      >
        <span className="switch__track" aria-hidden>
          <span className="switch__thumb" />
        </span>
      </button>
    </div>
  )
}

export function ChatView({ dialog, settings, showTitle = true }: Props) {
  const { t, i18n } = useTranslation()
  const { client, lastMessageTick, refreshDialogs } = useTelegram()
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const virtualListRef = useRef<ChatMessagesVirtualListHandle | null>(null)
  const jumpDateButtonRef = useRef<HTMLButtonElement | null>(null)
  const [jumpCalOpen, setJumpCalOpen] = useState(false)
  const [reactionTarget, setReactionTarget] = useState<{ id: number; x: number; y: number } | null>(null)
  const [replyingTo, setReplyingTo] = useState<Api.Message | null>(null)
  const [messageActionError, setMessageActionError] = useState<string | null>(null)

  const { key, name } = getPeerInfo(dialog)
  const isForum = useMemo(
    () => isForumWithSubchats(dialog.entity ?? undefined),
    [dialog.entity]
  )

  const isGroup = useMemo(() => {
    const e = dialog.entity
    if (e == null) return false
    if (e.className === "Chat") return true
    if (e.className === "Channel" && (e as Api.Channel).megagroup === true) return true
    return false
  }, [dialog.entity])

  const allow = new Set(settings.allowlistIds)
  const isPriv = isPrivateUserDialog(dialog)
  const isContact = isUserContactForPolicy(dialog)
  const blocked = isPrivateChatHidden({
    isPrivate: isPriv,
    isContact,
    peerKey: key,
    allowlistIds: allow,
    blockUnknownPrivate: settings.blockUnknownPrivate,
    appMode: settings.appMode,
  })

  const noPreview = shouldHideLinkPreviews(settings)
  const filterGifs = shouldFilterGifs(settings)

  const { topics, topicId, setTopicId, topicsErr, topicsLoading, refreshForumTopics } =
    useForumTopics(client, dialog.entity, isForum, lastMessageTick)

  const currentForumTopic = useMemo((): Api.ForumTopic | undefined => {
    if (!isForum || topicId == null) {
      return undefined
    }
    const tp = topics.find((x) => x.className === "ForumTopic" && x.id === topicId)
    return tp as Api.ForumTopic | undefined
  }, [isForum, topicId, topics])

  const [messagesUnreadOnly, setMessagesUnreadOnly] = useState(false)

  const convKey = useMemo(
    () => `${key}|${isForum ? String(topicId ?? "null") : "direct"}`,
    [key, isForum, topicId]
  )

  // listForViewLength for the unread-seek effect inside useChatMessages.
  // We track it via a ref that is updated each render so the async effect sees a current value.
  const listForViewLengthRef = useRef(0)

  const {
    list,
    hasMoreOlder,
    loadingOlder,
    refreshHead,
    refreshMessagesById,
    loadOlder,
    patchMessageReactions,
  } = useChatMessages({
    client,
    dialog,
    convKey,
    isForum,
    topicId,
    blocked,
    appMode: settings.appMode,
    messagesUnreadOnly,
    listForViewLengthRef,
    lastMessageTick,
  })

  const isInitialLoad = list.length === 0

  const listForView = useMemo(() => {
    if (!messagesUnreadOnly) {
      return list
    }
    const readMax = readInboxMaxIdForThread(dialog, isForum, topicId, topics)
    return list.filter((m) => isInboundUnreadForThread(m, readMax))
  }, [dialog, isForum, list, messagesUnreadOnly, topicId, topics])

  // Keep the ref in sync each render so useChatMessages sees the latest value on next effect run.
  listForViewLengthRef.current = listForView.length

  const showUnreadMessagesEmpty =
    messagesUnreadOnly &&
    list.length > 0 &&
    listForView.length === 0 &&
    !loadingOlder

  const showUnreadToggle =
    !blocked &&
    ((isForum &&
      !topicsLoading &&
      topicsErr == null &&
      topics.length > 0 &&
      topicId != null) ||
      (!isForum && (list.length > 0 || messagesUnreadOnly)))

  const toggleUnreadOnly = useCallback(() => {
    setMessagesUnreadOnly((v) => !v)
  }, [])

  const [headerActionsHost, setHeaderActionsHost] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setHeaderActionsHost(document.getElementById(THREAD_HEADER_ACTIONS_ID))
  }, [])

  const clusterRoleByMessageId = useMemo(() => {
    const roles = computeMessageClusterRoles(listForView)
    const map = new Map<number, MessageClusterRole>()
    for (let i = 0; i < listForView.length; i++) {
      const id = listForView[i].id
      if (id != null) {
        map.set(Number(id), roles[i])
      }
    }
    return map
  }, [listForView])

  const maxMsgIdVisible = useMemo(
    () => readMaxIdForMarkRead(list, { isForum, topic: currentForumTopic }),
    [list, isForum, currentForumTopic]
  )

  useReadReceipt({
    client,
    entity: dialog.entity,
    convKey,
    maxMsgIdVisible,
    isForum,
    topicId,
    blocked,
    appMode: settings.appMode,
    refreshDialogs,
    refreshForumTopics,
  })

  useEffect(() => {
    setMessagesUnreadOnly(false)
  }, [key])

  useEffect(() => {
    if (!isForum || topicId == null) {
      return
    }
    if (topics.length === 0) {
      return
    }
    if (topics.some((x) => x.id === topicId)) {
      return
    }
    setTopicId(topics[0].id)
  }, [isForum, topicId, topics, setTopicId])

  const datedList = useMemo((): ChatListItem[] => {
    const out: ChatListItem[] = []
    let prevDay: string | null = null
    for (const m of listForView) {
      if (!m.id) {
        continue
      }
      const k = getLocalDayKey(m.date)
      if (k !== prevDay) {
        out.push({ kind: "sep", dayKey: k, ts: m.date })
        prevDay = k
      }
      out.push({ kind: "msg", message: m })
    }
    return out
  }, [listForView])

  const {
    scrollFabVisible,
    stickyRowIndex,
    onScroll,
    onVirtualStickyRow,
    scrollToLatestMessages,
  } = useChatScroll({
    scrollRef,
    datedList,
    list,
    loadingOlder,
    hasMoreOlder,
    loadOlder,
    convKey,
  })

  const stickyDateTs = useMemo(
    () => getStickyDateTsForRow(datedList, stickyRowIndex),
    [datedList, stickyRowIndex]
  )
  const stickyDateLabel =
    stickyDateTs != null ? formatMessageDateSeparator(stickyDateTs, i18n.language) : null
  const loadedDayBounds = useMemo(
    () => getLoadedDayKeyBounds(datedList),
    [datedList]
  )
  const loadedDayKeys = useMemo(() => getLoadedDayKeys(datedList), [datedList])

  const toggleJumpCalendar = useCallback(() => {
    setJumpCalOpen((v) => !v)
  }, [])

  const jumpToDayKey = useCallback(
    (dayKey: string) => {
      const idx = findSepRowIndexForDayKey(datedList, dayKey)
      if (idx == null) {
        return
      }
      if (datedList.length > VIRTUAL_MSG_THRESHOLD) {
        virtualListRef.current?.scrollToRowIndex(idx, { align: "start", behavior: "smooth" })
      } else {
        const root = scrollRef.current
        const node = root?.querySelector(
          `[data-chat-day-key="${CSS.escape(dayKey)}"]`
        ) as HTMLElement | null
        node?.scrollIntoView({ block: "start", behavior: "smooth" })
      }
    },
    [datedList]
  )

  useEffect(() => {
    setJumpCalOpen(false)
  }, [convKey])

  useEffect(() => {
    if (!client || list.length === 0) {
      return
    }
    const ids = collectCustomEmojiDocumentIdsFromMessages(list)
    if (ids.length === 0) {
      return
    }
    const tid = window.setTimeout(() => {
      void prefetchCustomEmojiDocuments(client, ids)
    }, 220)
    return () => {
      window.clearTimeout(tid)
    }
  }, [client, list])

  const onSend = async () => {
    if (!client || !dialog.entity || !draft.trim()) {
      return
    }
    if (isForum) {
      if (topicId == null) {
        return
      }
      const rId = replyingTo?.className === "Message" ? replyingTo.id : undefined
      try {
        await sendInForumThread(
          client,
          dialog.entity as NonNullable<Dialog["entity"]>,
          draft,
          topicId,
          typeof rId === "number" && rId > 0 ? rId : undefined
        )
        setDraft("")
        setReplyingTo(null)
        setMessageActionError(null)
        scrollToLatestMessages()
        void refreshHead()
      } catch (e) {
        appLog.warn("sendInForumThread", e)
        setMessageActionError(t("chat.sendFailed"))
      }
      return
    }
    const rId = replyingTo?.className === "Message" ? replyingTo.id : undefined
    try {
      await client.sendMessage(dialog.entity, {
        message: draft,
        ...(typeof rId === "number" && rId > 0 ? { replyTo: rId } : {}),
      })
      setDraft("")
      setReplyingTo(null)
      setMessageActionError(null)
      scrollToLatestMessages()
      void refreshHead()
    } catch (e) {
      appLog.warn("sendMessage", e)
      setMessageActionError(
        e instanceof Error ? e.message : t("chat.sendFailed")
      )
    }
  }

  const canCompose =
    !isForum ||
    (!topicsLoading && topicsErr == null && topicId != null && topics.length > 0)

  const pickerMessage = useMemo(
    () =>
      reactionTarget == null
        ? null
        : (list.find((m) => m.id === reactionTarget.id) ?? null),
    [list, reactionTarget]
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
  }, [reactionTarget])

  useEffect(() => {
    if (reactionTarget == null) {
      return
    }
    if (!list.some((m) => m.id === reactionTarget.id)) {
      setReactionTarget(null)
    }
  }, [list, reactionTarget])

  const onMessageBubbleReactions = useCallback(
    (e: MouseEvent, m: Api.Message) => {
      if (m.id == null) {
        return
      }
      if (client == null || dialog.entity == null) {
        return
      }
      if (reactionTarget?.id === m.id) {
        setReactionTarget(null)
        return
      }
      const s = window.getSelection?.()
      if (s != null && s.toString() !== "") {
        return
      }
      const el = e.target
      if (!(el instanceof Element)) {
        return
      }
      if (
        el.closest(
          "a, input, textarea, select, video, audio, .msg-poll, .msg-reaction, .msg-entity--spoiler, .msg-bubble-action, button, [role=button]"
        )
      ) {
        return
      }
      setReactionTarget({ id: m.id, x: e.clientX, y: e.clientY })
    },
    [client, dialog.entity, reactionTarget]
  )

  const renderDatedItem = useCallback(
    (item: ChatListItem, layout: "list" | "virtual", rowIndex: number): ReactNode => {
      const asVirtual = layout === "virtual"
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
        if (asVirtual) {
          return (
            <div
              className="msg-date"
              role="presentation"
              data-chat-day-key={item.dayKey}
            >
              {timeEl}
            </div>
          )
        }
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
      const clusterRole = m.id != null ? clusterRoleByMessageId.get(m.id) : undefined
      const gutterBase = isOut ? "msg-gutter msg-gutter--out" : "msg-gutter msg-gutter--in"
      const gutterClass =
        clusterRole != null && clusterRole !== "single"
          ? `${gutterBase} msg-gutter--cluster-${clusterRole}`
          : gutterBase
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
          <MessageReplyView reply={m.replyTo} client={client} />
          <MessageMediaView
            message={m}
            client={client}
            noPreview={noPreview}
            filterGifs={filterGifs}
            t={t}
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
          <time className="msg-time" dateTime={new Date(m.date * 1000).toISOString()}>
            {formatMessageTime(m.date, i18n.language)}
          </time>
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
      if (asVirtual) {
        return (
          <div className={gutterClass}>
            {bubbleWithAttribution}
          </div>
        )
      }
      return (
        <li
          className={gutterClass}
          data-chat-row-index={rowIndex}
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
      patchMessageReactions,
      refreshMessagesById,
      t,
    ]
  )

  if (blocked && settings.appMode === "child") {
    return (
      <section className="thread">
        {showTitle ? <h2 className="thread-h">{name}</h2> : null}
        <p>{t("chat.openBlocked")}</p>
        <p className="small muted">{t("chat.blockUnknownHint")}</p>
        <Button
          type="button"
          onClick={() => {
            void requestChatAccessForDialog(dialog)
          }}
        >
          {t("chat.requestAccess")}
        </Button>
      </section>
    )
  }

  return (
    <section className="thread" aria-label={name}>
      {showTitle ? (
        <div className="thread-header-row">
          <h2 className="thread-h">{name}</h2>
          {showUnreadToggle ? (
            <UnreadOnlyMessagesToggle active={messagesUnreadOnly} onToggle={toggleUnreadOnly} />
          ) : null}
        </div>
      ) : null}
      {!showTitle && showUnreadToggle && headerActionsHost
        ? createPortal(
            <UnreadOnlyMessagesToggle active={messagesUnreadOnly} onToggle={toggleUnreadOnly} />,
            headerActionsHost,
          )
        : null}
      {isForum && (
        <div className="forum-topic-bar">
          {topicsLoading ? (
            <p className="small muted" aria-live="polite">
              {t("chat.forumTopicsLoading")}
            </p>
          ) : null}
          {!topicsLoading && topicsErr != null ? (
            <p className="small muted" role="alert">
              {t("chat.forumTopicsError")}: {topicsErr}
            </p>
          ) : null}
          {!topicsLoading && topicsErr == null && topics.length > 0 && topicId != null ? (
            <div className="forum-topic-bar__row">
              <span className="forum-topic-lbl">
                <ForumTopicIcon />
                {t("chat.forumTopic")}
              </span>
              <select
                className="input"
                name="topic"
                aria-label={t("chat.forumTopic")}
                value={String(topicId)}
                onChange={(e) => {
                  setTopicId(Number(e.target.value))
                }}
              >
                {topics.map((x) => (
                  <option key={x.id} value={String(x.id)}>
                    {forumTopicLabel(x)}
                    {formatTopicUnreadSuffix(x)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {!topicsLoading && topicsErr == null && topics.length === 0 ? (
            <p className="small muted" role="status">
              {t("chat.forumNoTopics")}
            </p>
          ) : null}
        </div>
      )}
      {showUnreadMessagesEmpty ? (
        <p className="small muted thread-unread-filter__hint" role="status">
          {t("chat.messagesUnreadEmpty")}
        </p>
      ) : null}
      <div
        className={
          datedList.length > 0
            ? "message-scroll message-scroll--has-date-float"
            : "message-scroll"
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
              onPick={jumpToDayKey}
              onDismiss={() => setJumpCalOpen(false)}
            />
            <div className="message-scroll__date-overlay" aria-live="polite">
              <button
                ref={jumpDateButtonRef}
                type="button"
                className="msg-date-pill msg-date-pill--floating msg-date-pill--jump"
                onClick={toggleJumpCalendar}
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
        ) : datedList.length > VIRTUAL_MSG_THRESHOLD ? (
          <ChatMessagesVirtualList
            ref={virtualListRef}
            scrollRef={scrollRef}
            listEpoch={convKey}
            datedList={datedList}
            loadingOlder={loadingOlder}
            loadingLabel={t("loading")}
            onFirstVisibleRowIndexChange={onVirtualStickyRow}
            renderRow={(item, index) => renderDatedItem(item, "virtual", index)}
          />
        ) : (
          <ul className="msg-list">
            {loadingOlder ? (
              <li className="msg-load-hint" key="load-older" aria-live="polite">
                {t("loading")}
              </li>
            ) : null}
            {datedList.map((item, index) => {
              const k = item.kind === "sep" ? `date-${item.dayKey}` : `msg-${item.message.id}`
              return (
                <Fragment key={k}>
                  {renderDatedItem(item, "list", index)}
                </Fragment>
              )
            })}
          </ul>
        )}
        <ScrollToBottomFab
          visible={scrollFabVisible && datedList.some((x) => x.kind === "msg")}
          onClick={scrollToLatestMessages}
          label={t("chat.scrollToBottom")}
        />
      </div>
      <div className="compose">
        {messageActionError
          ? (
              <p className="msg-action-err" role="alert">
                {messageActionError}
              </p>
            )
          : null}
        {replyingTo
          ? (
              <div className="msg-reply-bar" role="status">
                <span className="msg-reply-bar__line">
                  <span className="msg-reply-bar__lbl">
                    {t("chat.replyingTo")}
                    :
                    {" "}
                  </span>
                  <span className="msg-reply-bar__prev">
                    {getReplyToPreviewText(replyingTo, t)}
                  </span>
                </span>
                <button
                  type="button"
                  className="msg-reply-bar__x"
                  onClick={() => {
                    setReplyingTo(null)
                  }}
                  aria-label={t("chat.clearReplyDraft")}
                >
                  ×
                </button>
              </div>
            )
          : null}
        <div className="compose__row">
          <textarea
            className="input input-compose"
            name="m"
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
            }}
            placeholder={t("chat.messagePlaceholder")}
            disabled={!canCompose}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (canCompose) void onSend()
              }
            }}
          />
          <Button
            className="btn-send"
            type="button"
            onClick={() => { void onSend() }}
            aria-label={t("chat.send")}
            disabled={!canCompose}
          >
            {t("chat.send")}
          </Button>
        </div>
      </div>
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
                  isForum && topicId != null ? topicId : null
                )
                void refreshHead()
              } catch (e) {
                setMessageActionError(
                  e instanceof Error
                    ? e.message
                    : t("chat.forwardFailed")
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
    </section>
  )
}
