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
import { createPortal, flushSync } from "react-dom"
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
import { useViewportMessageSlice } from "../hooks/useViewportMessageSlice"
import { requestChatAccessForDialog } from "../parental/requestAccess"
import { formatMessageDateSeparator, formatMessageTime, getLocalDayKey, getStickyDateTsForRow } from "../util/timeFormat"
import {
  findFirstMessageRowIndexForDayKey,
  getLoadedDayKeyBounds,
  getLoadedDayKeys,
  inclusiveDaySpan,
  parseDayKey,
} from "../util/chatHistoryJump"
import {
  formatTopicUnreadSuffix,
  forumTopicLabel,
  isForumWithSubchats,
  resolveForumTopicIdFromMessage,
  sendInForumThread,
} from "../telegram/forum"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { toMessageList } from "../telegram/messageList"
import { collectCustomEmojiDocumentIdsFromMessages } from "../telegram/customEmojiFromMessages"
import { prefetchCustomEmojiDocuments } from "../telegram/customEmojiCache"
import { appLog } from "../util/appLogger"
import {
  computeMessageClusterRoles,
  type MessageClusterRole,
} from "../telegram/messageBubbleGroup"
import { isInboundUnreadForThread, readInboxMaxIdForThread } from "../telegram/messageUnread"
import { readMaxIdForMarkRead } from "../telegram/markChatRead"
import {
  getTickState,
  isBroadcastChannelEntity,
  readOutboxMaxIdFromDialog,
} from "../telegram/messageTickState"
import { forwardMessageInCurrentChat } from "../telegram/forwardInChat"
import { peerKeyFromPeer } from "../telegram/peerKey"
import { insertAtCursor } from "../util/insertAtCursor"
import { findFirstUnreadRowIndex, insertCatchUpRibbon } from "../util/threadCatchUp"
import { InboundClusterRow } from "./InboundClusterRow"
import { UnreadFilterIcon } from "./ChatFilterIcons"
import { ForumTopicBadge } from "./ForumTopicBadge"
import { ScrollToBottomFab } from "./ScrollToBottomFab"
import { JumpDateCalendarPop } from "./JumpDateCalendarPop"
import { Button } from "./ds"
import { MessageTextContent } from "./MessageTextContent"
import { MessageMediaView } from "./MessageMediaView"
import { MessageReactionPicker } from "./MessageReactionPicker"
import { MessageReactionsView } from "./MessageReactionsView"
import { MessageReplyView } from "./MessageReplyView"
import type { ChatDatedItem } from "./chatDatedItem"
import { MessageListSkeleton } from "./MessageListSkeleton"
import { ChatInfoIcon, SearchInChatIcon } from "./ChatChromeIcons"
import { ChatContextPanel } from "./ChatContextPanel"
import { makeTypingSender, useTypingIndicators } from "../hooks/useTypingIndicators"
import { useDraftAttachments } from "../hooks/useDraftAttachments"
import { useWaxSealSend } from "../hooks/useWaxSealSend"
import { getDialogDraftText } from "../util/dialogDraft"
import { addCoReadingBookmark } from "../util/lettersRitualsStorage"
import { getDialogPreviewText } from "../telegram/dialogPreview"
import { AttachMenu } from "./AttachMenu"
import { AttachmentPreviewStrip } from "./AttachmentPreviewStrip"
import { AttachUploadProgress } from "./AttachUploadProgress"
import { TickIcon } from "./TickIcon"
import { EmojiPickerButton } from "./EmojiPicker"
import { TypingIndicator } from "./TypingIndicator"
import { LettersLetterHeader } from "./LettersLetterHeader"
import { ChatViewInChatSearch } from "./ChatViewInChatSearch"
import { LettersPassageMessage } from "./LettersPassageMessage"
import { LettersFreshMailPill } from "./LettersFreshMailPill"
import { LettersThreadInsights } from "./LettersThreadInsights"
import { useLettersChatRailOptional } from "./LettersChatRailContext"

type Props = {
  dialog: Dialog
  settings: ParentalSettings
  /** When the shell renders its own top bar (narrow layout), skip the title row. */
  showTitle?: boolean
  /** Letters v2 layout: editorial chrome, jump strip, compose copy. */
  lettersLayout?: boolean
  /** Desktop three-pane Letters layout: chat info + calendar dock into the right rail instead of an overlay. */
  lettersThreePane?: boolean
  /** Letters day mail rail: scroll to this message id once; parent clears via `onLettersJumpToMessageConsumed`. */
  lettersJumpToMessageId?: number | null
  onLettersJumpToMessageConsumed?: () => void
  onCoReadingBookmarked?: () => void
}

type ChatListItem = ChatDatedItem

const MAX_COMPOSE_HEIGHT = 120

/** DOM mount for narrow layout chat title (see `MainShell` mobile header). */
export const THREAD_HEADER_CENTER_ID = "thread-header-center"

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
        <span className="thread-header__unread-caption">{t("chat.messagesUnreadOnly")}</span>
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

export function ChatView({
  dialog,
  settings,
  showTitle = true,
  lettersLayout = false,
  lettersThreePane = false,
  lettersJumpToMessageId = null,
  onLettersJumpToMessageConsumed,
  onCoReadingBookmarked,
}: Props) {
  const { t, i18n } = useTranslation()
  const { client, lastMessageTick, refreshDialogs } = useTelegram()
  const { typers } = useTypingIndicators(dialog.entity, client)
  const notifyTyping = useMemo(
    () => makeTypingSender(dialog.entity, client),
    [dialog.entity, client],
  )
  /** Compose text lives in the textarea DOM to avoid re-rendering the whole chat on every keystroke. */
  const draftRef = useRef("")
  /** Updated only when `trim().length > 0` toggles — keeps Send button / Enter-to-send in sync cheaply. */
  const [draftNonempty, setDraftNonempty] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const jumpDateButtonRef = useRef<HTMLButtonElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  /** Snapshot selection when textarea blurs (emoji picker, etc.). */
  const textareaSelectionRef = useRef({ start: 0, end: 0 })
  const [jumpCalOpen, setJumpCalOpen] = useState(false)
  const [freshMailDismissed, setFreshMailDismissed] = useState(false)
  const [reactionTarget, setReactionTarget] = useState<{ id: number; x: number; y: number } | null>(null)
  const [replyingTo, setReplyingTo] = useState<Api.Message | null>(null)
  const [messageActionError, setMessageActionError] = useState<string | null>(null)
  const [hasTelegramDraft, setHasTelegramDraft] = useState(false)
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    markFailed,
  } = useDraftAttachments()
  const [attachPickErr, setAttachPickErr] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    sent: number
    total: number
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { key, name } = getPeerInfo(dialog)

  const isForum = useMemo(
    () => isForumWithSubchats(dialog.entity ?? undefined),
    [dialog.entity],
  )

  const isGroup = useMemo(() => {
    const e = dialog.entity
    if (e == null) return false
    if (e.className === "Chat") return true
    if (e.className === "Channel" && (e as Api.Channel).megagroup === true) return true
    return false
  }, [dialog.entity])

  const participantsCount = useMemo(() => {
    const e = dialog.entity
    if (e == null) {
      return null
    }
    if (e.className === "Chat") {
      const n = (e as Api.Chat).participantsCount
      return typeof n === "number" ? n : null
    }
    if (e.className === "Channel") {
      const c = e as Api.Channel
      if (c.megagroup && typeof c.participantsCount === "number") {
        return c.participantsCount
      }
    }
    return null
  }, [dialog.entity])

  const [searchMode, setSearchMode] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null)
  const [scrollLayoutBump, setScrollLayoutBump] = useState(0)
  const messageScrollTopBeforeSearchRef = useRef(0)
  const highlightTimerRef = useRef<number | null>(null)
  const pendingScrollToMessageIdRef = useRef<number | null>(null)

  const [slidePanelOpen, setSlidePanelOpen] = useState(false)
  const lettersRailCtx = useLettersChatRailOptional()
  /** Info + calendar dock into the Letters right rail only at `lettersThreePane` widths. */
  const dockInfoInLettersRail = Boolean(
    lettersLayout && lettersThreePane && lettersRailCtx,
  )
  /**
   * Two-pane Letters desktop: masthead widgets belong in slide-out (`ChatContextPanel`), not Center.
   */
  const dockLettersChromeInContextPanel = Boolean(
    lettersLayout && lettersRailCtx && !lettersThreePane,
  )
  const stripLettersChromeFromCenterMasthead = Boolean(
    dockInfoInLettersRail || dockLettersChromeInContextPanel,
  )

  /** Narrow shell (`MainShell` `chats-narrow`): save compose width — Send is arrow-only. */
  const lettersSendIconOnly = lettersLayout && !showTitle

  const isPanelOpen = dockInfoInLettersRail
    ? Boolean(lettersRailCtx!.lettersInfoOpen)
    : slidePanelOpen

  const setPanelOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      if (dockInfoInLettersRail && lettersRailCtx) {
        if (typeof next === "function") {
          lettersRailCtx.setLettersInfoOpen((prev) => next(prev))
        } else {
          lettersRailCtx.setLettersInfoOpen(next)
        }
      } else if (typeof next === "function") {
        setSlidePanelOpen(next)
      } else {
        setSlidePanelOpen(next)
      }
    },
    [dockInfoInLettersRail, lettersRailCtx],
  )

  useEffect(() => {
    queueMicrotask(() => {
      setSlidePanelOpen(false)
    })
  }, [key])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current != null) {
        clearTimeout(highlightTimerRef.current)
      }
    }
  }, [])

  const readOutboxMaxId = useMemo(() => readOutboxMaxIdFromDialog(dialog), [dialog])

  const isBroadcastChannel = useMemo(
    () => isBroadcastChannelEntity(dialog.entity),
    [dialog.entity],
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

  const {
    topics,
    topicId,
    setTopicId,
    topicsErr,
    topicsLoading,
    refreshForumTopics,
  } = useForumTopics(client, dialog.entity, isForum, lastMessageTick)

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

  useEffect(() => {
    pendingScrollToMessageIdRef.current = null
    queueMicrotask(() => {
      setSearchMode(false)
    })
  }, [convKey])

  useEffect(() => {
    clearAttachments()
    queueMicrotask(() => {
      setAttachPickErr(null)
    })
  }, [convKey, clearAttachments])

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

  useLayoutEffect(() => {
    listForViewLengthRef.current = listForView.length
  }, [listForView])

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
  const [headerCenterHost, setHeaderCenterHost] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    queueMicrotask(() => {
      setHeaderActionsHost(document.getElementById(THREAD_HEADER_ACTIONS_ID))
      setHeaderCenterHost(document.getElementById(THREAD_HEADER_CENTER_ID))
    })
  }, [key])

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

  const messageByIdLoaded = useMemo(() => {
    const map = new Map<number, Api.Message>()
    for (const msg of list) {
      const mid = msg.id
      if (typeof mid === "number") {
        map.set(mid, msg)
      }
    }
    return map
  }, [list])

  const resolveRepliedMessage = useCallback(
    (replyToMsgId: number) => messageByIdLoaded.get(replyToMsgId),
    [messageByIdLoaded],
  )

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
    queueMicrotask(() => {
      setMessagesUnreadOnly(false)
    })
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
    if (!lettersLayout || messagesUnreadOnly) {
      return out
    }
    const readMax = readInboxMaxIdForThread(dialog, isForum, topicId, topics)
    if (readMax <= 0) {
      return out
    }
    return insertCatchUpRibbon(out, readMax)
  }, [dialog, isForum, lettersLayout, listForView, messagesUnreadOnly, topicId, topics])

  const readInboxMaxId = useMemo(
    () => readInboxMaxIdForThread(dialog, isForum, topicId, topics),
    [dialog, isForum, topicId, topics],
  )

  const {
    scrollFabVisible,
    stickyRowIndex,
    onScroll,
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

  const {
    sliceActive,
    sliceStart,
    sliceEnd,
    topSpacerPx,
    bottomSpacerPx,
    onViewportSliceScroll,
    expandToRowIndex,
  } = useViewportMessageSlice({
    scrollRef,
    datedList,
    convKey,
    loadingOlder,
  })

  const handleMessageScroll = useCallback(() => {
    onScroll()
    onViewportSliceScroll()
  }, [onScroll, onViewportSliceScroll])

  const catchUpRowIndex = useMemo(
    () => datedList.findIndex((row) => row.kind === "catchup"),
    [datedList],
  )

  const threadUnreadCount = dialog.unreadCount ?? 0

  const showFreshMailPill =
    lettersLayout &&
    !freshMailDismissed &&
    catchUpRowIndex >= 0 &&
    threadUnreadCount > 0 &&
    scrollFabVisible

  const scrollToFirstUnread = useCallback(() => {
    const idx = findFirstUnreadRowIndex(datedList, readInboxMaxId)
    if (idx < 0) {
      scrollToLatestMessages()
      setFreshMailDismissed(true)
      return
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    flushSync(() => {
      expandToRowIndex(idx)
    })
    const root = scrollRef.current
    const node = root?.querySelector(`[data-chat-row-index="${idx}"]`) as HTMLElement | null
    node?.scrollIntoView({ block: "start", behavior: reducedMotion ? "instant" : "smooth" })
    setFreshMailDismissed(true)
  }, [datedList, expandToRowIndex, readInboxMaxId, scrollToLatestMessages])

  useEffect(() => {
    setFreshMailDismissed(false)
  }, [convKey])

  useEffect(() => {
    if (catchUpRowIndex < 0) {
      return
    }
    if (stickyRowIndex > catchUpRowIndex) {
      setFreshMailDismissed(true)
    }
  }, [catchUpRowIndex, stickyRowIndex])

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
  const sortedJumpDayKeys = useMemo(() => {
    const keys = [...getLoadedDayKeys(datedList)]
    keys.sort()
    return keys.length > 24 ? keys.slice(-24) : keys
  }, [datedList])

  const loadedDaysSpan = useMemo(() => {
    if (loadedDayBounds.min == null || loadedDayBounds.max == null) {
      return null
    }
    return inclusiveDaySpan(loadedDayBounds.min, loadedDayBounds.max)
  }, [loadedDayBounds.min, loadedDayBounds.max])

  const loadedWindowSinceLabel = useMemo(() => {
    if (loadedDayBounds.min == null) {
      return null
    }
    const { y, m, d } = parseDayKey(loadedDayBounds.min)
    const unixSec = Math.floor(new Date(y, m, d).getTime() / 1000)
    return formatMessageDateSeparator(unixSec, i18n.language)
  }, [loadedDayBounds.min, i18n.language])

  const toggleJumpCalendar = useCallback(() => {
    setJumpCalOpen((v) => !v)
  }, [])

  const forumTopicTitlePlain = useMemo(() => {
    const tp = currentForumTopic
    if (!tp || typeof tp !== "object") return ""
    const rawTitle = (tp as { title?: unknown }).title
    if (typeof rawTitle === "string") return rawTitle
    if (
      rawTitle &&
      typeof rawTitle === "object" &&
      "text" in rawTitle &&
      typeof (rawTitle as { text: unknown }).text === "string"
    ) {
      return (rawTitle as { text: string }).text
    }
    return ""
  }, [currentForumTopic])

  const ribbonStrandUpper = useMemo(() => {
    /* Forum megagroups: ribbon shows peer title; active topic stays in picker + dropdown row (no duplicate strand). */
    const raw =
      isForum
        ? name.trim()
        : forumTopicTitlePlain.trim().length > 0
          ? forumTopicTitlePlain.trim()
          : name.trim()
    const u = raw.toUpperCase()
    return u.length <= 38 ? u : `${u.slice(0, 37)}…`
  }, [forumTopicTitlePlain, isForum, name])

  const lettersLettersKicker = useMemo(() => {
    if (searchMode) return null
    const showRibbon =
      isGroup || isBroadcastChannel || isPrivateUserDialog(dialog)
    if (!showRibbon) return null

    let accent: string
    if (isGroup) {
      accent =
        participantsCount != null
          ? ` ● ${t("letters.headerHandsWriting", { count: participantsCount })}`
          : ` ● ${t("letters.headerHandsFallback")}`
    } else if (isBroadcastChannel) {
      accent = ` ● ${t("letters.headerBroadcastRibbon")}`
    } else {
      accent = ` ● ${t("letters.headerDmRibbon")}`
    }

    return (
      <p className="letters-letter-header__kicker-print" role="presentation">
        <span className="letters-letter-header__kicker-plain">{ribbonStrandUpper}</span>
        <span className="letters-letter-header__kicker-accent">{accent}</span>
      </p>
    )
  }, [
    searchMode,
    isGroup,
    isBroadcastChannel,
    dialog,
    participantsCount,
    ribbonStrandUpper,
    t,
  ])

  /** Hide duplicate masthead heading when ribbon already shows peer name (forums always; others when no forum-topic strand). */
  const lettersTitleVisuallyHidden =
    !searchMode &&
    (isGroup || isBroadcastChannel || isPrivateUserDialog(dialog)) &&
    (forumTopicTitlePlain.trim().length === 0 || isForum)

  const lettersLettersMetaLine = useMemo(() => {
    if (searchMode) {
      return null
    }
    if (isGroup && participantsCount != null) {
      return (
        <p className="letters-letter-header__meta muted small" role="status">
          {t("letters.headerBundleMeta", {
            participants: participantsCount,
            unread: dialog.unreadCount ?? 0,
          })}
        </p>
      )
    }
    if (!isGroup) {
      return (
        <p className="letters-letter-header__meta muted small" role="status">
          {t("letters.headerDmUnread", { unread: dialog.unreadCount ?? 0 })}
        </p>
      )
    }
    return null
  }, [searchMode, isGroup, participantsCount, dialog.unreadCount, t])

  const lettersLettersWindowLine = useMemo(() => {
    if (searchMode || loadedDaysSpan == null || loadedWindowSinceLabel == null) {
      return null
    }
    return (
      <p className="letters-letter-header__window muted small" role="status">
        {t("letters.headerCorrespondenceWindow", {
          days: loadedDaysSpan,
          since: loadedWindowSinceLabel,
        })}
      </p>
    )
  }, [searchMode, loadedDaysSpan, loadedWindowSinceLabel, t])

  const insightsJumpEnabled =
    !searchMode &&
    sortedJumpDayKeys.length > 0 &&
    loadedDayBounds.min != null &&
    loadedDayBounds.max != null

  const jumpToDayKey = useCallback(
    (dayKey: string) => {
      const rowIdx = findFirstMessageRowIndexForDayKey(datedList, dayKey)
      if (rowIdx == null) {
        return
      }
      const row = datedList[rowIdx]
      const anchorId =
        row.kind === "msg" && row.message.id != null ? String(row.message.id) : null
      const root = scrollRef.current
      flushSync(() => {
        expandToRowIndex(rowIdx)
      })
      const alignToDay = () => {
        const node = anchorId
          ? (root?.querySelector(
              `[data-chat-message-id="${CSS.escape(anchorId)}"]`,
            ) as HTMLElement | null)
          : (root?.querySelector(
              `[data-chat-day-key="${CSS.escape(dayKey)}"]`,
            ) as HTMLElement | null)
        node?.scrollIntoView({ block: "start", behavior: "smooth" })
      }
      alignToDay()
    },
    [datedList, expandToRowIndex],
  )

  const lettersThreadInsightsWidget = useMemo(
    () => (
      <LettersThreadInsights
        layout="full"
        messages={listForView}
        locale={i18n.language}
        activeDayKey={
          stickyDateTs != null ? getLocalDayKey(stickyDateTs) : undefined
        }
        onPickDay={insightsJumpEnabled ? jumpToDayKey : undefined}
        onOpenCalendar={
          insightsJumpEnabled ? () => setJumpCalOpen(true) : undefined
        }
        calendarLabel={t("chat.jumpToDate")}
      />
    ),
    [
      insightsJumpEnabled,
      i18n.language,
      jumpToDayKey,
      listForView,
      stickyDateTs,
      t,
    ],
  )

  const lettersPanelChromeBundles = useMemo(() => {
    /**
     * One masthead bundle for Letters info UI: ribbon, insights, correspondence meta.
     * - Slide / mobile overlay (`overlay`): heading lives in shell / thread `#thread-title`.
     * - Right rail (`rail`): visible `h2` for accessibility in the docked column.
     */
    const overlay = (
      <LettersLetterHeader
        title={name}
        renderHeading={false}
        titleVisuallyHidden={lettersTitleVisuallyHidden}
        layoutVariant="stacked"
        kickerLine={lettersLettersKicker}
        trailingInTitleRow={null}
        insights={lettersThreadInsightsWidget}
        metaLine={lettersLettersMetaLine}
        windowLine={lettersLettersWindowLine}
        jumpStrip={null}
      />
    )
    const rail = (
      <LettersLetterHeader
        titleHeadingLevel="h2"
        title={name}
        titleVisuallyHidden={lettersTitleVisuallyHidden}
        layoutVariant="stacked"
        kickerLine={lettersLettersKicker}
        trailingInTitleRow={null}
        insights={lettersThreadInsightsWidget}
        metaLine={lettersLettersMetaLine}
        windowLine={lettersLettersWindowLine}
        jumpStrip={null}
      />
    )
    return { overlay, rail }
  }, [
    lettersLettersKicker,
    lettersLettersMetaLine,
    lettersLettersWindowLine,
    lettersThreadInsightsWidget,
    lettersTitleVisuallyHidden,
    name,
  ])

  const lettersThreadChromeForSlidePanel =
    lettersLayout &&
    !searchMode &&
    (dockLettersChromeInContextPanel || (!showTitle && !dockInfoInLettersRail))
      ? lettersPanelChromeBundles.overlay
      : null

  const lettersRailContextChrome = lettersPanelChromeBundles.rail

  const openSearchMode = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      messageScrollTopBeforeSearchRef.current = el.scrollTop
    }
    setSearchMode(true)
    setPanelOpen(false)
  }, [setSearchMode, setPanelOpen])

  const lettersPanelTools = useMemo(() => {
    if (!lettersLayout) {
      return null
    }
    return (
      <div className="context-panel__letters-tools-row">
        {!isForum ? (
          <button
            type="button"
            className="btn-icon"
            aria-label={t("chat.searchInChat")}
            title={t("chat.searchInChat")}
            onClick={() => {
              openSearchMode()
            }}
          >
            <SearchInChatIcon />
          </button>
        ) : null}
        {showUnreadToggle ? (
          <UnreadOnlyMessagesToggle active={messagesUnreadOnly} onToggle={toggleUnreadOnly} />
        ) : null}
      </div>
    )
  }, [
    isForum,
    lettersLayout,
    messagesUnreadOnly,
    openSearchMode,
    showUnreadToggle,
    t,
    toggleUnreadOnly,
  ])

  useEffect(() => {
    if (!dockInfoInLettersRail || !lettersRailCtx) {
      return
    }
    if (!lettersRailCtx.lettersInfoOpen) {
      lettersRailCtx.setLettersInfoSlot(null)
      return
    }

    const closeRail = (): void => {
      lettersRailCtx.setLettersInfoOpen(false)
    }

    lettersRailCtx.setLettersInfoSlot(
      <ChatContextPanel
        key={`${convKey}-rail-info`}
        presentation="lettersRail"
        entity={
            dialog.entity as
              | Api.User
              | Api.Chat
              | Api.Channel
              | null
              | undefined
          }
          peerName={name}
          peerId={key}
          client={client}
          isOpen
          onClose={closeRail}
          isForum={isForum}
          onOpenInChatSearch={() => {
            openSearchMode()
          }}
          onAfterBlock={() => void refreshDialogs()}
          lettersThreadChrome={lettersRailContextChrome}
          lettersPanelTools={lettersPanelTools}
          omitQuickInChatSearch
        />
    )

    return (): void => {
      lettersRailCtx.setLettersInfoSlot(null)
    }
  }, [
    client,
    convKey,
    dialog.entity,
    dialog.unreadCount,
    dockInfoInLettersRail,
    isBroadcastChannel,
    isForum,
    isGroup,
    key,
    lettersPanelTools,
    lettersRailContextChrome,
    lettersRailCtx,
    lettersRailCtx?.lettersInfoOpen,
    loadedDaysSpan,
    loadedWindowSinceLabel,
    openSearchMode,
    participantsCount,
    refreshDialogs,
  ])

  const closeSearchMode = useCallback(() => {
    setSearchMode(false)
    window.setTimeout(() => {
      const el = scrollRef.current
      if (el) {
        el.scrollTop = messageScrollTopBeforeSearchRef.current
      }
    }, 0)
  }, [])

  const jumpToMessageById = useCallback(
    async (id: number) => {
      if (typeof id !== "number" || id <= 0) {
        return
      }
      setMessagesUnreadOnly(false)
      closeSearchMode()
      setPanelOpen(false)
      if (highlightTimerRef.current != null) {
        clearTimeout(highlightTimerRef.current)
      }
      setHighlightedMessageId(id)
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null)
        highlightTimerRef.current = null
      }, 1500)
      await refreshMessagesById([id])
      pendingScrollToMessageIdRef.current = id
      setScrollLayoutBump((b) => b + 1)
    },
    [
      closeSearchMode,
      refreshMessagesById,
      setMessagesUnreadOnly,
      setPanelOpen,
    ],
  )

  const jumpToMessageFromSearch = useCallback(
    async (m: Api.Message) => {
      const id = m.id
      if (typeof id !== "number") {
        return
      }
      try {
        await jumpToMessageById(id)
      } catch {
        appLog.warn("jumpToMessageFromSearch failed", { id })
      }
    },
    [jumpToMessageById],
  )

  const goToQuotedMessage = useCallback(
    async (quotedId: number) => {
      if (typeof quotedId !== "number" || quotedId <= 0) {
        return
      }
      try {
        await jumpToMessageById(quotedId)
      } catch {
        appLog.warn("goToQuotedMessage failed", { id: quotedId })
      }
    },
    [jumpToMessageById],
  )

  const lettersJumpRunSeq = useRef(0)

  useEffect(() => {
    const id = lettersJumpToMessageId
    if (id == null || id <= 0) {
      return
    }
    const seq = ++lettersJumpRunSeq.current
    let cancelled = false
    void (async () => {
      try {
        if (!client || !dialog.entity) {
          if (!cancelled && seq === lettersJumpRunSeq.current) {
            onLettersJumpToMessageConsumed?.()
          }
          return
        }
        if (isForum && topicsLoading) {
          return
        }
        if (isForum) {
          const fetched = await withTransientRetry(client, () =>
            client.getMessages(dialog.entity as never, { ids: [id] }),
          )
          if (cancelled || seq !== lettersJumpRunSeq.current) {
            return
          }
          const full = toMessageList(fetched)[0]
          const forumTopics = topics.filter((x): x is Api.ForumTopic => x.className === "ForumTopic")
          if (full?.className === "Message" && forumTopics.length > 0) {
            const tNext = resolveForumTopicIdFromMessage(full as Api.Message, forumTopics)
            if (tNext != null && tNext !== topicId) {
              setTopicId(tNext)
              return
            }
          }
        }
        await jumpToMessageById(id)
      } catch {
        appLog.warn("lettersJumpToMessage failed", { id })
      }
      if (cancelled || seq !== lettersJumpRunSeq.current) {
        return
      }
      onLettersJumpToMessageConsumed?.()
    })()
    return () => {
      cancelled = true
    }
  }, [
    lettersJumpToMessageId,
    convKey,
    jumpToMessageById,
    onLettersJumpToMessageConsumed,
    isForum,
    topicsLoading,
    topics,
    topicId,
    setTopicId,
    client,
    dialog.entity,
  ])

  useLayoutEffect(() => {
    const id = pendingScrollToMessageIdRef.current
    if (id == null) {
      return
    }
    const idx = datedList.findIndex(
      (row) => row.kind === "msg" && row.message.id === id,
    )
    if (idx < 0) {
      return
    }
    flushSync(() => {
      expandToRowIndex(idx)
    })
    pendingScrollToMessageIdRef.current = null
    const root = scrollRef.current
    const node = root?.querySelector(
      `[data-chat-message-id="${CSS.escape(String(id))}"]`,
    ) as HTMLElement | null
    node?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [datedList, expandToRowIndex, scrollLayoutBump])

  useEffect(() => {
    queueMicrotask(() => {
      setJumpCalOpen(false)
    })
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

  useEffect(() => {
    if (!client || !isForum || topics.length === 0) {
      return
    }
    const ids = topics.flatMap((x) => {
      if (x.className !== "ForumTopic") {
        return []
      }
      return x.iconEmojiId != null ? [x.iconEmojiId] : []
    })
    if (ids.length === 0) {
      return
    }
    const tid = window.setTimeout(() => {
      void prefetchCustomEmojiDocuments(client, ids)
    }, 120)
    return () => {
      window.clearTimeout(tid)
    }
  }, [client, isForum, topics])

  const canCompose =
    !isForum ||
    (!topicsLoading && topicsErr == null && topicId != null && topics.length > 0)

  const showAttach =
    settings.appMode !== "child" || settings.allowOutgoingMedia !== false

  const pendingAttachments = useMemo(
    () => attachments.filter((a) => !a.failed),
    [attachments],
  )

  const canSendNow =
    canCompose &&
    !isUploading &&
    (draftNonempty || pendingAttachments.length > 0)

  const waxSealEnabled =
    lettersLayout &&
    settings.appMode === "parent" &&
    settings.waxSealSendEnabled === true

  const resizeComposeTextareaToContent = useCallback(() => {
    const el = textareaRef.current
    if (!el || lettersLayout) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSE_HEIGHT)}px`
  }, [lettersLayout])

  const applyComposeText = useCallback((text: string) => {
    draftRef.current = text
    const has = text.trim().length > 0
    setDraftNonempty((prev) => (prev === has ? prev : has))
  }, [])

  const clearComposeField = useCallback(() => {
    const ta = textareaRef.current
    if (ta) ta.value = ""
    draftRef.current = ""
    setDraftNonempty(false)
    resizeComposeTextareaToContent()
  }, [resizeComposeTextareaToContent])

  const retryAttachmentSend = async (id: string) => {
    if (!client || !dialog.entity || isUploading) {
      return
    }
    const att = attachments.find((a) => a.id === id)
    if (!att?.failed) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    markFailed(id, false)
    setIsUploading(true)
    setMessageActionError(null)
    try {
      await client.sendFile(dialog.entity, {
        file: att.file,
        caption: "",
        ...(isForum && topicId != null ? { topMsgId: topicId } : {}),
      })
      removeAttachment(id)
      setReplyingTo(null)
      scrollToLatestMessages()
      void refreshHead()
    } catch (e) {
      appLog.warn("sendFile retry", e)
      markFailed(id, true)
      setMessageActionError(
        e instanceof Error ? e.message : t("chat.sendFailed"),
      )
    } finally {
      setIsUploading(false)
    }
  }

  const onSend = async () => {
    if (!client || !dialog.entity || !canCompose || isUploading) {
      return
    }
    const text = (textareaRef.current?.value ?? "").trim()
    const queue = attachments.filter((a) => !a.failed)

    if (queue.length > 0) {
      if (settings.appMode === "child" && settings.allowOutgoingMedia === false) {
        setMessageActionError(t("chat.attachBlockedChild"))
        clearAttachments()
        return
      }
      if (isForum && topicId == null) {
        return
      }

      const captionText = text
      const rId = replyingTo?.className === "Message" ? replyingTo.id : undefined
      const validReply = typeof rId === "number" && rId > 0 ? rId : undefined

      setIsUploading(true)
      setUploadProgress({ sent: 0, total: queue.length })
      setAttachPickErr(null)
      setMessageActionError(null)

      let broke = false
      try {
        let first = true
        for (let i = 0; i < queue.length; i++) {
          const att = queue[i]
          try {
            await client.sendFile(dialog.entity, {
              file: att.file,
              caption: first ? captionText : "",
              replyTo: first ? validReply : undefined,
              ...(isForum && topicId != null ? { topMsgId: topicId } : {}),
            })
            removeAttachment(att.id)
            if (first && captionText) {
              clearComposeField()
            }
            first = false
            setUploadProgress({ sent: i + 1, total: queue.length })
            scrollToLatestMessages()
            setFreshMailDismissed(true)
            void refreshHead()
          } catch (e) {
            appLog.warn("sendFile", e)
            markFailed(att.id, true)
            setMessageActionError(
              e instanceof Error ? e.message : t("chat.sendFailed"),
            )
            broke = true
            break
          }
        }
        if (!broke) {
          setReplyingTo(null)
          setMessageActionError(null)
        }
      } finally {
        setIsUploading(false)
        setUploadProgress(null)
      }
      return
    }

    if (!text) {
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
          text,
          topicId,
          typeof rId === "number" && rId > 0 ? rId : undefined
        )
        clearComposeField()
        setReplyingTo(null)
        setMessageActionError(null)
        scrollToLatestMessages()
        setFreshMailDismissed(true)
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
        message: text,
        ...(typeof rId === "number" && rId > 0 ? { replyTo: rId } : {}),
      })
      clearComposeField()
      setReplyingTo(null)
      setMessageActionError(null)
      scrollToLatestMessages()
      setFreshMailDismissed(true)
      void refreshHead()
    } catch (e) {
      appLog.warn("sendMessage", e)
      setMessageActionError(
        e instanceof Error ? e.message : t("chat.sendFailed")
      )
    }
  }

  const {
    state: waxSealState,
    onSendPointerDown,
    onSendPointerUp,
    onSendPointerLeave,
    onSendClick,
    cancelSeal,
  } = useWaxSealSend({
    enabled: waxSealEnabled,
    reducedMotion,
    onSend: () => {
      void onSend()
    },
  })

  const pickerMessage = useMemo(
    () =>
      reactionTarget == null
        ? null
        : (list.find((m) => m.id === reactionTarget.id) ?? null),
    [list, reactionTarget]
  )

  const dialogPeerKey = getPeerInfo(dialog).key

  useEffect(() => {
    const draftText = getDialogDraftText(dialog)
    setHasTelegramDraft(draftText != null)
    const ta = textareaRef.current
    if (!ta) {
      return
    }
    if (draftText != null) {
      ta.value = draftText
      applyComposeText(draftText)
    } else {
      ta.value = ""
      applyComposeText("")
    }
    resizeComposeTextareaToContent()
  }, [dialogPeerKey, dialog, applyComposeText, resizeComposeTextareaToContent])

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
      queueMicrotask(() => {
        setReactionTarget(null)
      })
    }
  }, [list, reactionTarget])

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    // Letters compose uses a fixed single-line chrome height from CSS.
    if (lettersLayout) {
      el.style.removeProperty("height")
      return
    }
    resizeComposeTextareaToContent()
  }, [lettersLayout, resizeComposeTextareaToContent])

  const openLettersReactionPicker = useCallback(
    (e: MouseEvent<Element>, m: Api.Message) => {
      const mid = m.id
      if (mid == null) {
        return
      }
      if (client == null || dialog.entity == null) {
        return
      }
      if (reactionTarget?.id === mid) {
        setReactionTarget(null)
        return
      }
      const tgt = e.currentTarget
      if (tgt instanceof HTMLElement) {
        const r = tgt.getBoundingClientRect()
        setReactionTarget({ id: mid, x: r.left + r.width / 2, y: r.top })
        return
      }
      setReactionTarget({ id: mid, x: e.clientX, y: e.clientY })
    },
    [client, dialog.entity, reactionTarget],
  )

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
    (item: ChatListItem, rowIndex: number): ReactNode => {
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
            peerDisplayName={name}
            client={client}
            entity={dialog.entity}
            readOutboxMaxId={readOutboxMaxId}
            isBroadcastChannel={isBroadcastChannel}
            highlightedMessageId={highlightedMessageId}
            showMessageIds={settings.showMessageIds}
            filterGifs={filterGifs}
            noPreview={noPreview}
            onLettersReactionPicker={openLettersReactionPicker}
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
          />
          <div className="msg-media-thumb">
            <MessageMediaView
              message={m}
              client={client}
              noPreview={noPreview}
              filterGifs={filterGifs}
              t={t}
              viewerContext={{
                peerTitle: name,
                sentAtLabel: formatMessageTime(m.date, i18n.language),
                caption: typeof m.message === "string" ? m.message.trim() : "",
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
      openLettersReactionPicker,
      patchMessageReactions,
      readOutboxMaxId,
      refreshMessagesById,
      isBroadcastChannel,
      highlightedMessageId,
      t,
      name,
      settings.showMessageIds,
      settings.appMode,
      lettersLayout,
      resolveRepliedMessage,
      goToQuotedMessage,
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

  const ThreadEl = lettersLayout ? "main" : "section"

  return (
    <div
      className="thread-layout"
      data-panel-open={String(!dockInfoInLettersRail && slidePanelOpen)}
    >
      <ThreadEl
        className={lettersLayout ? "thread thread--letters" : "thread"}
        aria-label={name}
        {...(lettersLayout ? { "aria-labelledby": "thread-title" } : {})}
      >
      {showTitle ? (
        searchMode ? (
          <div className="thread-header-row thread-header-row--search">
            <ChatViewInChatSearch
              client={client}
              entity={dialog.entity}
              forumDisabled={isForum}
              peerDisplayName={name}
              onClose={closeSearchMode}
              onPickMessage={(msg) => {
                void jumpToMessageFromSearch(msg)
              }}
            />
          </div>
        ) : lettersLayout ? (
          <div className="thread-header-row thread-header-row--letters">
          <LettersLetterHeader
            titleId="thread-title"
            title={name}
            titleVisuallyHidden={lettersTitleVisuallyHidden}
            layoutVariant={
              stripLettersChromeFromCenterMasthead ? "default" : "stacked"
            }
            kickerLine={
              stripLettersChromeFromCenterMasthead ? null : lettersLettersKicker
            }
              trailingInTitleRow={null}
              insights={
                stripLettersChromeFromCenterMasthead
                  ? null
                  : lettersThreadInsightsWidget
              }
              metaLine={
                stripLettersChromeFromCenterMasthead
                  ? null
                  : lettersLettersMetaLine
              }
              windowLine={
                stripLettersChromeFromCenterMasthead
                  ? null
                  : lettersLettersWindowLine
              }
              jumpStrip={null}
            />
            <div className="thread-header__actions">
              <button
                type="button"
                aria-label={t("chat.info")}
                aria-pressed={isPanelOpen}
                className={isPanelOpen ? "btn-icon btn-icon--active" : "btn-icon"}
                onClick={() => {
                  setPanelOpen((v) => !v)
                }}
              >
                <ChatInfoIcon />
              </button>
            </div>
          </div>
        ) : (
          <div className="thread-header-row">
            <h2 className="thread-h">{name}</h2>
            {showUnreadToggle ? (
              <UnreadOnlyMessagesToggle active={messagesUnreadOnly} onToggle={toggleUnreadOnly} />
            ) : null}
            <button
              type="button"
              className="btn-icon"
              aria-label={t("chat.searchInChat")}
              title={t("chat.searchInChat")}
              onClick={openSearchMode}
            >
              <SearchInChatIcon />
            </button>
            <button
              type="button"
              aria-label={t("chat.info")}
              aria-pressed={isPanelOpen}
              className={isPanelOpen ? "btn-icon btn-icon--active" : "btn-icon"}
              onClick={() => {
                setPanelOpen((v) => !v)
              }}
            >
              <ChatInfoIcon />
            </button>
          </div>
        )
      ) : null}
      {!showTitle && headerCenterHost
        ? createPortal(
            searchMode ? (
              <ChatViewInChatSearch
                client={client}
                entity={dialog.entity}
                forumDisabled={isForum}
                peerDisplayName={name}
                onClose={closeSearchMode}
                onPickMessage={(msg) => {
                  void jumpToMessageFromSearch(msg)
                }}
              />
            ) : lettersLayout ? (
              <h1 id="thread-title" className="thread-header__h">
                {name}
              </h1>
            ) : (
              <h2 className="thread-header__h">{name}</h2>
            ),
            headerCenterHost,
          )
        : null}
      {!showTitle && headerActionsHost
        ? createPortal(
            lettersLayout ? (
              !searchMode ? (
                <button
                  type="button"
                  className={isPanelOpen ? "btn-icon btn-icon--active" : "btn-icon"}
                  aria-label={t("chat.info")}
                  aria-pressed={isPanelOpen}
                  title={t("chat.info")}
                  onClick={() => {
                    setPanelOpen((v) => !v)
                  }}
                >
                  <ChatInfoIcon />
                </button>
              ) : null
            ) : (
              <>
                {!searchMode ? (
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={t("chat.searchInChat")}
                    title={t("chat.searchInChat")}
                    onClick={openSearchMode}
                  >
                    <SearchInChatIcon />
                  </button>
                ) : null}
                {showUnreadToggle ? (
                  <UnreadOnlyMessagesToggle active={messagesUnreadOnly} onToggle={toggleUnreadOnly} />
                ) : null}
              </>
            ),
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
                <ForumTopicBadge topic={currentForumTopic} client={client} />
                {t("chat.forumTopic")}
              </span>
              <select
                className="forum-topic-bar__select"
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
      <div className="message-scroll">
        <div
          className={
            datedList.length > 0
              ? "message-scroll__inner message-scroll__inner--has-date-float"
              : "message-scroll__inner"
          }
          ref={scrollRef}
          onScroll={handleMessageScroll}
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
          onClick={scrollToLatestMessages}
          label={t("chat.scrollToBottom")}
        />
      </div>
      {showFreshMailPill ? (
        <LettersFreshMailPill
          count={threadUnreadCount}
          childMode={settings.appMode === "child"}
          onClick={scrollToFirstUnread}
        />
      ) : null}
      <div className="compose">
        {messageActionError
          ? (
              <p className="msg-action-err" role="alert">
                {messageActionError}
              </p>
            )
          : null}
        {attachPickErr ? (
          <p className="msg-action-err" role="alert">
            {attachPickErr}
          </p>
        ) : null}
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
        {attachments.length > 0 ? (
          <>
            <AttachmentPreviewStrip
              attachments={attachments}
              onRemove={removeAttachment}
              onRetry={(id) => {
                void retryAttachmentSend(id)
              }}
            />
            <AttachUploadProgress
              sent={uploadProgress?.sent ?? 0}
              total={uploadProgress?.total ?? 0}
            />
          </>
        ) : null}
        <div className={lettersLayout ? "compose__row compose__row--letters" : "compose__row"}>
          {!lettersLayout ? (
            <>
              <EmojiPickerButton
                disabled={!canCompose || isUploading}
                onEmojiSelected={(emoji) => {
                  const ta = textareaRef.current
                  if (!ta) return
                  const { newValue, newCursorPos } = insertAtCursor(
                    ta,
                    emoji,
                    textareaSelectionRef.current,
                  )
                  ta.value = newValue
                  applyComposeText(newValue)
                  resizeComposeTextareaToContent()
                  window.setTimeout(() => {
                    ta.focus()
                    ta.setSelectionRange(newCursorPos, newCursorPos)
                    textareaSelectionRef.current = {
                      start: newCursorPos,
                      end: newCursorPos,
                    }
                  }, 0)
                }}
              />
              {showAttach ? (
                <AttachMenu
                  variant="icon"
                  disabled={!canCompose || isUploading}
                  onFilesSelected={(files) => {
                    setAttachPickErr(null)
                    const { rejectedCount } = addFiles(files)
                    if (rejectedCount > 0) {
                      setAttachPickErr(t("chat.attachFileTooLarge"))
                    }
                  }}
                />
              ) : null}
            </>
          ) : null}
          <textarea
            ref={textareaRef}
            id={lettersLayout ? "letters-compose-textarea" : undefined}
            className="input input-compose"
            name="m"
            rows={1}
            defaultValue=""
            onChange={(e) => {
              applyComposeText(e.currentTarget.value)
              notifyTyping?.()
              resizeComposeTextareaToContent()
            }}
            onSelect={(e) => {
              const el = e.currentTarget
              textareaSelectionRef.current = {
                start: el.selectionStart,
                end: el.selectionEnd,
              }
            }}
            onBlur={(e) => {
              textareaSelectionRef.current = {
                start: e.currentTarget.selectionStart,
                end: e.currentTarget.selectionEnd,
              }
            }}
            placeholder={
              lettersLayout
                ? t("chat.messagePlaceholderLetters")
                : t("chat.messagePlaceholder")
            }
            disabled={!canCompose || isUploading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (canSendNow) void onSend()
              }
            }}
          />
          {lettersLayout ? (
            <>
              <EmojiPickerButton
                disabled={!canCompose || isUploading}
                onEmojiSelected={(emoji) => {
                  const ta = textareaRef.current
                  if (!ta) return
                  const { newValue, newCursorPos } = insertAtCursor(
                    ta,
                    emoji,
                    textareaSelectionRef.current,
                  )
                  ta.value = newValue
                  applyComposeText(newValue)
                  resizeComposeTextareaToContent()
                  window.setTimeout(() => {
                    ta.focus()
                    ta.setSelectionRange(newCursorPos, newCursorPos)
                    textareaSelectionRef.current = {
                      start: newCursorPos,
                      end: newCursorPos,
                    }
                  }, 0)
                }}
              />
              {showAttach ? (
                <AttachMenu
                  variant="letters"
                  lettersIconOnly={lettersSendIconOnly}
                  disabled={!canCompose || isUploading}
                  onFilesSelected={(files) => {
                    setAttachPickErr(null)
                    const { rejectedCount } = addFiles(files)
                    if (rejectedCount > 0) {
                      setAttachPickErr(t("chat.attachFileTooLarge"))
                    }
                  }}
                />
              ) : null}
            </>
          ) : null}
          <Button
            className={
              lettersSendIconOnly
                ? `btn-send btn-send--letters-icon-only${waxSealState.sealing ? " btn-send--sealing" : ""}`
                : `btn-send${waxSealState.sealing ? " btn-send--sealing" : ""}`
            }
            type="button"
            onPointerDown={waxSealEnabled ? onSendPointerDown : undefined}
            onPointerUp={waxSealEnabled ? onSendPointerUp : undefined}
            onPointerLeave={waxSealEnabled ? onSendPointerLeave : undefined}
            onClick={() => {
              if (waxSealEnabled) {
                onSendClick()
              } else {
                void onSend()
              }
            }}
            aria-label={
              hasTelegramDraft && lettersLayout
                ? t("letters.continueLetter")
                : lettersSendIconOnly
                  ? t("chat.send")
                  : lettersLayout
                    ? t("chat.sendArrow")
                    : t("chat.send")
            }
            disabled={!canSendNow}
            title={waxSealEnabled ? t("letters.waxSealHint") : undefined}
          >
            {hasTelegramDraft && lettersLayout
              ? t("letters.continueLetterShort")
              : lettersSendIconOnly
                ? "→"
                : lettersLayout
                  ? t("chat.sendArrow")
                  : t("chat.send")}
          </Button>
        </div>
      </div>
      {waxSealState.undoOpen ? (
        <div className="letters-wax-seal-toast" role="status">
          <span>{t("letters.waxSealPending", { seconds: waxSealState.undoSecondsLeft })}</span>
          <Button type="button" size="sm" variant="ghost" onClick={cancelSeal}>
            {t("letters.waxSealUndo")}
          </Button>
        </div>
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
      </ThreadEl>
      {!dockInfoInLettersRail ? (
        <ChatContextPanel
          entity={
            dialog.entity as
              | import("telegram").Api.User
              | import("telegram").Api.Chat
              | import("telegram").Api.Channel
              | null
              | undefined
          }
          peerName={name}
          peerId={key}
          client={client}
          isOpen={slidePanelOpen}
          onClose={() => setPanelOpen(false)}
          isForum={isForum}
          onOpenInChatSearch={() => {
            openSearchMode()
          }}
          onAfterBlock={() => void refreshDialogs()}
          lettersThreadChrome={lettersThreadChromeForSlidePanel}
          lettersPanelTools={lettersPanelTools}
          omitQuickInChatSearch={lettersLayout}
        />
      ) : null}
    </div>
  )
}
