import { Api } from "telegram"
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"
import { useTranslation } from "react-i18next"
import type { Dialog } from "telegram/tl/custom/dialog"
import { useTelegram } from "../context/TelegramContext"
import { isPrivateChatHidden, shouldFilterGifs, shouldHideLinkPreviews } from "../parental/policy"
import type { ParentalSettings } from "../parental/types"
import { getReplyToPreviewText } from "../telegram/dialogPreview"
import { getPeerInfo, isUserContactForPolicy, isPrivateUserDialog } from "../telegram/dialogUtils"
import { useForumTopics } from "../hooks/useForumTopics"
import { requestChatAccessForDialog } from "../parental/requestAccess"
import {
  CHAT_PAGE_SIZE,
  mergeHeadWithTail,
  minMessageId,
  toMessageList,
  uniqueMessagesSort,
} from "../telegram/messageList"
import { formatMessageDateSeparator, formatMessageTime, getLocalDayKey } from "../util/timeFormat"
import {
  formatTopicUnreadSuffix,
  forumTopicLabel,
  getForumThreadMessages,
  isForumWithSubchats,
  sendInForumThread,
  sumTopicUnreadCounts,
} from "../telegram/forum"
import { collectCustomEmojiDocumentIdsFromMessages } from "../telegram/customEmojiFromMessages"
import { prefetchCustomEmojiDocuments } from "../telegram/customEmojiCache"
import { appLog } from "../util/appLogger"
import { forwardMessageInCurrentChat } from "../telegram/forwardInChat"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { Button } from "./ds"
import { MessageTextContent } from "./MessageTextContent"
import { MessageMediaView } from "./MessageMediaView"
import { MessageReactionPicker } from "./MessageReactionPicker"
import { MessageReactionsView } from "./MessageReactionsView"
import { MessageReplyView } from "./MessageReplyView"
import { ChatMessagesVirtualList, type ChatDatedItem } from "./ChatMessagesVirtualList"

type Props = {
  dialog: Dialog
  settings: ParentalSettings
  /** When the shell renders its own top bar (narrow layout), skip the title row. */
  showTitle?: boolean
}

type ChatListItem = ChatDatedItem

const VIRTUAL_MSG_THRESHOLD = 48

export function ChatView({ dialog, settings, showTitle = true }: Props) {
  const { t, i18n } = useTranslation()
  const { client, lastMessageTick } = useTelegram()
  const [list, setList] = useState<Api.Message[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const stickToEndRef = useRef(true)
  const pendingScrollFixRef = useRef<{
    type: "prepend"
    prevTop: number
    prevHeight: number
  } | null>(null)
  const loadGenRef = useRef(0)
  const loadedConvKeyRef = useRef<string | null>(null)
  const lastTickSyncedRef = useRef<number | null>(null)
  const olderLoadThrottleRef = useRef(0)
  const [reactionTarget, setReactionTarget] = useState<{ id: number; x: number; y: number } | null>(null)
  const [replyingTo, setReplyingTo] = useState<Api.Message | null>(null)
  const [messageActionError, setMessageActionError] = useState<string | null>(null)

  const { key, name } = getPeerInfo(dialog)
  const isForum = useMemo(
    () => isForumWithSubchats(dialog.entity ?? undefined),
    [dialog.entity]
  )

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

  const { topics, topicId, setTopicId, topicsErr, topicsLoading } = useForumTopics(
    client,
    dialog.entity,
    isForum,
    lastMessageTick
  )
  const [forumUnreadOnly, setForumUnreadOnly] = useState(false)

  const convKey = useMemo(
    () => `${key}|${isForum ? String(topicId ?? "null") : "direct"}`,
    [key, isForum, topicId]
  )

  const topicsWithUnread = useMemo(
    () => topics.filter((x) => (x.unreadCount ?? 0) > 0),
    [topics]
  )
  const topicsForSelect = useMemo(() => {
    if (!forumUnreadOnly) {
      return topics
    }
    if (topicsWithUnread.length > 0) {
      return topicsWithUnread
    }
    return topics
  }, [forumUnreadOnly, topics, topicsWithUnread])
  const sumTopicUnreads = useMemo(() => sumTopicUnreadCounts(topics), [topics])
  const showUnreadFilterFallback = forumUnreadOnly && topicsWithUnread.length === 0
  const chatListUnread = dialog.unreadCount ?? 0
  const formatUnreadForHint = (n: number) => (n > 99 ? "99+" : String(n))

  const listRef = useRef(list)
  listRef.current = list

  const lastMessageTickRef = useRef(lastMessageTick)
  useEffect(() => {
    lastMessageTickRef.current = lastMessageTick
  }, [lastMessageTick])

  useEffect(() => {
    setForumUnreadOnly(false)
  }, [key])

  useEffect(() => {
    if (!isForum || topicId == null) {
      return
    }
    if (topicsForSelect.length === 0) {
      return
    }
    if (topicsForSelect.some((x) => x.id === topicId)) {
      return
    }
    setTopicId(topicsForSelect[0].id)
  }, [isForum, topicId, topicsForSelect, setTopicId])

  const fetchHeadPage = useCallback(async (): Promise<Api.Message[]> => {
    if (!client || !dialog.entity) {
      return []
    }
    const entity = dialog.entity
    if (isForum) {
      if (topicId == null) {
        return []
      }
      return withTransientRetry(client, () =>
        getForumThreadMessages(
          client,
          entity,
          topicId,
          CHAT_PAGE_SIZE,
          0
        )
      )
    }
    return withTransientRetry(client, async () => {
      const r = await client.getMessages(entity, { limit: CHAT_PAGE_SIZE })
      return toMessageList(r)
    })
  }, [client, dialog.entity, isForum, topicId])

  const refreshHead = useCallback(async () => {
    if (!client || !dialog.entity) {
      return
    }
    if (blocked && settings.appMode === "child") {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    if (loadedConvKeyRef.current !== convKey) {
      return
    }
    try {
      const head = await fetchHeadPage()
      setList((prev) => mergeHeadWithTail(prev, head))
    } catch {
      /* keep existing list */
    }
  }, [
    client,
    dialog.entity,
    isForum,
    topicId,
    blocked,
    settings.appMode,
    convKey,
    fetchHeadPage,
  ])

  const loadOlder = useCallback(async () => {
    if (!client || !dialog.entity || loadingOlder || !hasMoreOlder) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    const cur = listRef.current
    if (cur.length === 0) {
      return
    }
    const minId = minMessageId(cur)
    if (minId == null) {
      return
    }
    const entity = dialog.entity
    setLoadingOlder(true)
    const el = scrollRef.current
    if (el) {
      pendingScrollFixRef.current = {
        type: "prepend",
        prevTop: el.scrollTop,
        prevHeight: el.scrollHeight,
      }
    }
    stickToEndRef.current = false
    try {
      const older: Api.Message[] = await withTransientRetry(client, async () => {
        if (isForum) {
          return getForumThreadMessages(
            client,
            entity,
            topicId!,
            CHAT_PAGE_SIZE,
            minId
          )
        }
        const r = await client.getMessages(entity, {
          limit: CHAT_PAGE_SIZE,
          offsetId: minId,
        })
        return toMessageList(r)
      })
      // An empty “older” page = no more; partial pages (n < CHAT_PAGE_SIZE) are not the end.
      if (older.length === 0) {
        setHasMoreOlder(false)
      }
      setList((prev) => uniqueMessagesSort([...older, ...prev]))
    } catch {
      pendingScrollFixRef.current = null
    } finally {
      setLoadingOlder(false)
    }
  }, [
    client,
    dialog.entity,
    hasMoreOlder,
    isForum,
    loadingOlder,
    topicId,
  ])

  useEffect(() => {
    if (blocked && settings.appMode === "child") {
      return
    }
    if (!client || !dialog.entity) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    loadGenRef.current += 1
    const gen = loadGenRef.current
    loadedConvKeyRef.current = null
    lastTickSyncedRef.current = null
    setReplyingTo(null)
    setMessageActionError(null)
    setList([])
    setHasMoreOlder(true)
    setLoadingOlder(false)
    stickToEndRef.current = true
    void (async () => {
      try {
        if (!client || !dialog.entity) {
          return
        }
        const entity = dialog.entity
        const head: Api.Message[] = await withTransientRetry(client, async () => {
          if (isForum && topicId != null) {
            return getForumThreadMessages(
              client,
              entity,
              topicId,
              CHAT_PAGE_SIZE,
              0
            )
          }
          const r = await client.getMessages(entity, { limit: CHAT_PAGE_SIZE })
          return toMessageList(r)
        })
        if (loadGenRef.current !== gen) {
          return
        }
        setList(mergeHeadWithTail([], head))
        // First batch can be < CHAT_PAGE_SIZE (search/thread quirks or short history) but older
        // pages may still exist. Only a load-older round that returns too few/empty is definitive.
        setHasMoreOlder(head.length > 0)
        loadedConvKeyRef.current = convKey
        lastTickSyncedRef.current = lastMessageTickRef.current
        stickToEndRef.current = true
      } catch {
        if (loadGenRef.current !== gen) {
          return
        }
        setList([])
        // Keep "has more" so scroll-up / refresh can refetch; empty list was often a transient drop.
        setHasMoreOlder(true)
        loadedConvKeyRef.current = convKey
        lastTickSyncedRef.current = lastMessageTickRef.current
      }
    })()
  }, [client, convKey, dialog.entity, isForum, topicId, blocked, settings.appMode])

  useEffect(() => {
    if (blocked && settings.appMode === "child") {
      return
    }
    if (!client || !dialog.entity) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    if (loadedConvKeyRef.current !== convKey) {
      return
    }
    if (lastTickSyncedRef.current === lastMessageTick) {
      return
    }
    lastTickSyncedRef.current = lastMessageTick
    void refreshHead()
  }, [
    lastMessageTick,
    convKey,
    client,
    dialog.entity,
    isForum,
    topicId,
    blocked,
    settings.appMode,
    refreshHead,
  ])

  const datedList = useMemo((): ChatListItem[] => {
    const out: ChatListItem[] = []
    let prevDay: string | null = null
    for (const m of list) {
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
  }, [list])

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

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const p = pendingScrollFixRef.current
    if (p) {
      const h = el.scrollHeight
      el.scrollTop = p.prevTop + (h - p.prevHeight)
      pendingScrollFixRef.current = null
      return
    }
    if (stickToEndRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [list])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    const nearEnd = scrollHeight - scrollTop - clientHeight < 48
    stickToEndRef.current = nearEnd
    if (scrollTop > 200 || !hasMoreOlder || loadingOlder) {
      return
    }
    const now = Date.now()
    if (now - olderLoadThrottleRef.current < 450) {
      return
    }
    olderLoadThrottleRef.current = now
    void loadOlder()
  }, [hasMoreOlder, loadingOlder, loadOlder])

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
        stickToEndRef.current = true
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
      stickToEndRef.current = true
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
    (item: ChatListItem, layout: "list" | "virtual"): ReactNode => {
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
          return <div className="msg-date" role="presentation">{timeEl}</div>
        }
        return (
          <li className="msg-date" role="presentation">
            {timeEl}
          </li>
        )
      }
      const m = item.message
      if (!m.id) {
        return null
      }
      const isOut = Boolean(m.out)
      const bubble = (
        <div
          className={isOut ? "msg-bubble msg-bubble--out" : "msg-bubble msg-bubble--in"}
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
                      void refreshHead()
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
            onUpdate={() => {
              void refreshHead()
            }}
          />
          <time className="msg-time" dateTime={new Date(m.date * 1000).toISOString()}>
            {formatMessageTime(m.date, i18n.language)}
          </time>
        </div>
      )
      if (asVirtual) {
        return (
          <div className={isOut ? "msg-gutter msg-gutter--out" : "msg-gutter msg-gutter--in"}>
            {bubble}
          </div>
        )
      }
      return (
        <li
          className={isOut ? "msg-gutter msg-gutter--out" : "msg-gutter msg-gutter--in"}
        >
          {bubble}
        </li>
      )
    },
    [
      client,
      dialog.entity,
      filterGifs,
      i18n.language,
      noPreview,
      onMessageBubbleReactions,
      refreshHead,
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
      {showTitle ? <h2 className="thread-h">{name}</h2> : null}
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
            <>
              <div className="forum-topic-bar__row">
                <span className="forum-topic-lbl">{t("chat.forumTopic")}</span>
                <select
                  className="input"
                  name="topic"
                  aria-label={t("chat.forumTopic")}
                  value={String(topicId)}
                  onChange={(e) => {
                    setTopicId(Number(e.target.value))
                  }}
                >
                  {topicsForSelect.map((x) => (
                    <option key={x.id} value={String(x.id)}>
                      {forumTopicLabel(x)}
                      {formatTopicUnreadSuffix(x)}
                    </option>
                  ))}
                </select>
              </div>
              <label className="forum-unread-only">
                <input
                  type="checkbox"
                  className="forum-unread-only__input"
                  checked={forumUnreadOnly}
                  onChange={(e) => {
                    setForumUnreadOnly(e.target.checked)
                  }}
                />
                <span>{t("chat.forumTopicUnreadOnly")}</span>
              </label>
              {showUnreadFilterFallback ? (
                <p className="small muted" role="status">
                  {t("chat.forumTopicUnreadEmpty")}
                </p>
              ) : null}
              <p className="small muted forum-unread-hint" role="note">
                {t("chat.forumUnreadExplain", {
                  chat: formatUnreadForHint(chatListUnread),
                  sum: formatUnreadForHint(sumTopicUnreads),
                })}
              </p>
            </>
          ) : null}
          {!topicsLoading && topicsErr == null && topics.length === 0 ? (
            <p className="small muted" role="status">
              {t("chat.forumNoTopics")}
            </p>
          ) : null}
        </div>
      )}
      <div className="message-scroll" ref={scrollRef} onScroll={onScroll}>
        {datedList.length > VIRTUAL_MSG_THRESHOLD ? (
          <ChatMessagesVirtualList
            scrollRef={scrollRef}
            datedList={datedList}
            loadingOlder={loadingOlder}
            loadingLabel={t("loading")}
            renderRow={(item) => renderDatedItem(item, "virtual")}
          />
        ) : (
          <ul className="msg-list">
            {loadingOlder ? (
              <li className="msg-load-hint" key="load-older" aria-live="polite">
                {t("loading")}
              </li>
            ) : null}
            {datedList.map((item) => {
              const k = item.kind === "sep" ? `date-${item.dayKey}` : `msg-${item.message.id}`
              return (
                <Fragment key={k}>
                  {renderDatedItem(item, "list")}
                </Fragment>
              )
            })}
          </ul>
        )}
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
          onUpdated={() => {
            void refreshHead()
          }}
        />
      ) : null}
    </section>
  )
}
