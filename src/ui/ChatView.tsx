import { Api } from "teleproto"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal, flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { useTelegram } from "../context/TelegramContext"
import { isPrivateChatHidden, shouldFilterGifs, shouldHideLinkPreviews } from "../parental/policy"
import type { ParentalSettings } from "../parental/types"
import { getPeerInfo, isUserContactForPolicy, isPrivateUserDialog } from "../telegram/dialogUtils"
import { useForumTopics } from "../hooks/useForumTopics"
import { useChatMessages } from "../hooks/useChatMessages"
import { useReadReceipt } from "../hooks/useReadReceipt"
import { useChatScroll } from "../hooks/useChatScroll"
import { useViewportMessageSlice } from "../hooks/useViewportMessageSlice"
import { useChatCompose } from "../hooks/useChatCompose"
import { useChatJumpNavigation } from "../hooks/useChatJumpNavigation"
import { requestChatAccessForDialog } from "../parental/requestAccess"
import { formatMessageDateSeparator, getLocalDayKey, getStickyDateTsForRow } from "../util/timeFormat"
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
} from "../telegram/forum"
import { collectCustomEmojiDocumentIdsFromMessages } from "../telegram/customEmojiFromMessages"
import { prefetchCustomEmojiDocuments } from "../telegram/customEmojiCache"
import { computeMessageClusterRoles, type MessageClusterRole } from "../telegram/messageBubbleGroup"
import { readInboxMaxIdForThread } from "../telegram/messageUnread"
import { readMaxIdForMarkRead } from "../telegram/markChatRead"
import { isBroadcastChannelEntity } from "../telegram/messageTickState"
import { findFirstUnreadRowIndex, insertCatchUpRibbon } from "../util/threadCatchUp"
import { ForumTopicBadge } from "./ForumTopicBadge"
import { Button } from "./ds"
import { PinnedMessageBanner } from "./PinnedMessageBanner"
import { usePinnedMessages } from "../hooks/usePinnedMessages"
import { EphemeralNoticeRibbon } from "./EphemeralNoticeRibbon"
import { useEphemeralNotice } from "../hooks/useEphemeralNotice"
import { peerKeyFromEntity } from "../telegram/peerKey"
import { nextPinnedIndex } from "../telegram/pinnedMessages"
import type { ChatDatedItem } from "./chatDatedItem"
import { ChatInfoIcon, SearchInChatIcon } from "./ChatChromeIcons"
import { ChatContextPanel } from "./ChatContextPanel"
import { makeTypingSender, useTypingIndicators } from "../hooks/useTypingIndicators"
import { LettersLetterHeader } from "./LettersLetterHeader"
import { ChatViewInChatSearch } from "./ChatViewInChatSearch"
import { LettersThreadInsights } from "./LettersThreadInsights"
import { useLettersChatRailOptional } from "./LettersChatRailContext"
import { UnreadOnlyMessagesToggle } from "./UnreadOnlyMessagesToggle"
import { ChatComposer } from "./ChatComposer"
import { ChatMessageList } from "./ChatMessageList"
import { filterListForView } from "./chatListForView"
import { isInitialLoad as deriveIsInitialLoad } from "./chatInitialLoad"
import { alignRowInScroller } from "../util/scrollerAlign"
import type { ReactionTarget } from "./chatReactionAnchor"

type Props = {
  dialog: Dialog
  settings: ParentalSettings
  /** When the shell renders its own top bar (narrow layout), skip the title row. */
  showTitle?: boolean
  /** Letters v2 layout: editorial chrome, jump strip, compose copy. */
  lettersLayout?: boolean
  /** Desktop three-pane Letters layout: chat info + calendar dock into the right rail instead of an overlay. */
  lettersThreePane?: boolean
  /** Focus id from any jump source (day mail, co-reading, Passages); parent clears via `onLettersJumpToMessageConsumed`. */
  lettersJumpToMessageId?: number | null
  onLettersJumpToMessageConsumed?: () => void
  onCoReadingBookmarked?: () => void
  /** Opens in-chat search pre-filled with this query once (Passages "see all in this chat"). */
  lettersInChatSearchSeed?: string | null
  onLettersInChatSearchSeedConsumed?: () => void
}

type ChatListItem = ChatDatedItem

/** DOM mount for narrow layout chat title (see `MainShell` mobile header). */
export const THREAD_HEADER_CENTER_ID = "thread-header-center"

/** DOM mount for narrow layout unread toggle (see `MainShell` mobile header). */
export const THREAD_HEADER_ACTIONS_ID = "thread-header-actions"

export function ChatView({
  dialog,
  settings,
  showTitle = true,
  lettersLayout = false,
  lettersThreePane = false,
  lettersJumpToMessageId = null,
  onLettersJumpToMessageConsumed,
  onCoReadingBookmarked,
  lettersInChatSearchSeed = null,
  onLettersInChatSearchSeedConsumed,
}: Props) {
  const { t, i18n } = useTranslation()
  const { client, lastMessageTick, refreshDialogs } = useTelegram()
  const { typers } = useTypingIndicators(dialog.entity, client)
  const notifyTyping = useMemo(
    () => makeTypingSender(dialog.entity, client),
    [dialog.entity, client],
  )
  const scrollRef = useRef<HTMLDivElement | null>(null)
  /** Shared between `useChatScroll` and `useChatJumpNavigation` — see `useChatScroll`'s `jumpSettlingRef` doc. */
  const jumpSettlingRef = useRef(false)
  /** Live mirror of the jump request — `useChatMessages` reads it once per initial load to land straight on the target. */
  const pendingOpenJumpIdRef = useRef<number | null>(lettersJumpToMessageId)
  pendingOpenJumpIdRef.current = lettersJumpToMessageId
  const jumpDateButtonRef = useRef<HTMLButtonElement | null>(null)
  const [jumpCalOpen, setJumpCalOpen] = useState(false)
  const [freshMailDismissed, setFreshMailDismissed] = useState(false)
  const [reactionTarget, setReactionTarget] = useState<ReactionTarget | null>(null)
  const [replyingTo, setReplyingTo] = useState<Api.Message | null>(null)
  const [messageActionError, setMessageActionError] = useState<string | null>(null)

  const { key, name } = getPeerInfo(dialog)
  const { show: showEphemeralNotice, dismiss: dismissEphemeralNotice } =
    useEphemeralNotice(peerKeyFromEntity(dialog.entity))

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

  // listForViewLength for the unread-seek effect inside useChatMessages.
  // We track it via a ref that is updated each render so the async effect sees a current value.
  const listForViewLengthRef = useRef(0)

  const {
    list,
    hasMoreOlder,
    loadingOlder,
    hasMoreNewer,
    loadingNewer,
    refreshHead,
    refreshMessagesById,
    loadOlder,
    loadNewer,
    loadAroundMessageId,
    returnToLiveTail,
    transcriptEpoch,
    auxMessagesById,
    patchMessageReactions,
    initialLoadDone,
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
    pendingOpenJumpIdRef,
  })

  const isInitialLoad = deriveIsInitialLoad(list.length)

  const { pinned: pinnedMessages, refresh: refreshPinnedMessages } = usePinnedMessages({
    client,
    entity: dialog.entity,
    topicId: isForum ? (topicId ?? undefined) : undefined,
  })
  const [pinnedBannerIndex, setPinnedBannerIndex] = useState(0)
  const [pinnedBannerDismissed, setPinnedBannerDismissed] = useState(false)
  useEffect(() => {
    setPinnedBannerIndex(0)
    setPinnedBannerDismissed(false)
  }, [convKey])

  const listForView = useMemo(() => {
    const readMax = readInboxMaxIdForThread(dialog, isForum, topicId, topics)
    return filterListForView(list, messagesUnreadOnly, readMax)
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
    // Aux first, transcript second — a transcript row is always fresher than a
    // preview-cache copy of the same id.
    const map = new Map<number, Api.Message>(auxMessagesById)
    for (const msg of list) {
      const mid = msg.id
      if (typeof mid === "number") {
        map.set(mid, msg)
      }
    }
    return map
  }, [list, auxMessagesById])

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
    hasMoreNewer,
    loadingNewer,
    loadNewer,
    returnToLiveTail,
    transcriptEpoch,
    convKey,
    hasPendingJump: lettersJumpToMessageId != null && lettersJumpToMessageId > 0,
    jumpSettlingRef,
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
    transcriptEpoch,
    loadingOlder,
  })

  const handleMessageScroll = useCallback(() => {
    onScroll()
    onViewportSliceScroll()
  }, [onScroll, onViewportSliceScroll])

  const {
    searchMode,
    highlightedMessageId,
    openSearchMode,
    closeSearchMode,
    jumpToMessageById,
    jumpToMessageFromSearch,
    goToQuotedMessage,
  } = useChatJumpNavigation({
    scrollRef,
    datedList,
    expandToRowIndex,
    client,
    dialog,
    convKey,
    isForum,
    topicsLoading,
    topics,
    topicId,
    setTopicId,
    loadAroundMessageId,
    setMessagesUnreadOnly,
    setPanelOpen,
    lettersJumpToMessageId,
    onLettersJumpToMessageConsumed,
    initialLoadDone,
    jumpSettlingRef,
  })

  const [inChatSearchSeed, setInChatSearchSeed] = useState<string | null>(null)

  useEffect(() => {
    const seed = lettersInChatSearchSeed?.trim()
    if (!seed) {
      return
    }
    setInChatSearchSeed(seed)
    openSearchMode()
    onLettersInChatSearchSeedConsumed?.()
  }, [lettersInChatSearchSeed, openSearchMode, onLettersInChatSearchSeedConsumed])

  const closeInChatSearch = useCallback(() => {
    setInChatSearchSeed(null)
    closeSearchMode()
  }, [closeSearchMode])

  const compose = useChatCompose({
    client,
    dialog,
    settings,
    lettersLayout,
    lettersSendIconOnly,
    isForum,
    topicId,
    topicsLoading,
    topicsErr,
    topicsLength: topics.length,
    replyingTo,
    setReplyingTo,
    messageActionError,
    setMessageActionError,
    scrollToLatestMessages,
    refreshHead,
    onFreshMailDismissed: () => setFreshMailDismissed(true),
    notifyTyping: notifyTyping ?? undefined,
    dialogPeerKey: key,
    convKey,
  })

  const handlePinToggle = useCallback(
    async (m: Api.Message, pin: boolean) => {
      setReactionTarget(null)
      setMessageActionError(null)
      const id = m.id
      if (!client || dialog.entity == null || typeof id !== "number") {
        return
      }
      try {
        if (pin) {
          await client.pinMessage(dialog.entity as never, id, { notify: false })
        } else {
          await client.unpinMessage(dialog.entity as never, id)
        }
        void refreshMessagesById([id])
        refreshPinnedMessages()
      } catch {
        setMessageActionError(t(pin ? "chat.pinFailed" : "chat.unpinFailed"))
      }
    },
    [client, dialog.entity, refreshMessagesById, refreshPinnedMessages, t],
  )

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
    if (root && node) {
      alignRowInScroller(root, node, { align: "start", smooth: !reducedMotion })
    }
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
    !stripLettersChromeFromCenterMasthead &&
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
        if (root && node) {
          alignRowInScroller(root, node, { align: "start", smooth: true })
        }
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

  /** Search moved to the thread header (AC4), so this row is unread-only now. */
  const lettersPanelTools = useMemo(() => {
    if (!lettersLayout || !showUnreadToggle) {
      return null
    }
    return (
      <div className="context-panel__letters-tools-row">
        <UnreadOnlyMessagesToggle active={messagesUnreadOnly} onToggle={toggleUnreadOnly} />
      </div>
    )
  }, [lettersLayout, messagesUnreadOnly, showUnreadToggle, toggleUnreadOnly])

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
    name,
    openSearchMode,
    participantsCount,
    refreshDialogs,
  ])

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
              forumDisabled={isForum && topicId == null}
              topicId={isForum ? (topicId ?? undefined) : undefined}
              peerDisplayName={name}
              seedQuery={inChatSearchSeed}
              onClose={closeInChatSearch}
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
              {/* AC4: direct in-chat search, always shown — forum-no-topic is explained inside the bar. */}
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
                forumDisabled={isForum && topicId == null}
                topicId={isForum ? (topicId ?? undefined) : undefined}
                peerDisplayName={name}
                seedQuery={inChatSearchSeed}
                onClose={closeInChatSearch}
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
                <>
                  {/* AC4: same direct search affordance as the wide Letters header. */}
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
                </>
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
      {!pinnedBannerDismissed && !(isForum && topicId == null) && pinnedMessages.length > 0 ? (
        <PinnedMessageBanner
          messages={pinnedMessages}
          index={pinnedBannerIndex}
          onJump={(id) => {
            void jumpToMessageById(id)
            setPinnedBannerIndex((i) => nextPinnedIndex(i, pinnedMessages.length))
          }}
          onDismiss={() => setPinnedBannerDismissed(true)}
          t={t}
        />
      ) : null}
      {showEphemeralNotice ? (
        <EphemeralNoticeRibbon onDismiss={dismissEphemeralNotice} />
      ) : null}
      <ChatMessageList
        scrollRef={scrollRef}
        jumpDateButtonRef={jumpDateButtonRef}
        datedList={datedList}
        settings={settings}
        lettersLayout={lettersLayout}
        client={client}
        dialog={dialog}
        isGroup={isGroup}
        peerDisplayName={name}
        loadingOlder={loadingOlder}
        isInitialLoad={isInitialLoad}
        onScroll={handleMessageScroll}
        sliceActive={sliceActive}
        sliceStart={sliceStart}
        sliceEnd={sliceEnd}
        topSpacerPx={topSpacerPx}
        bottomSpacerPx={bottomSpacerPx}
        stickyDateLabel={stickyDateLabel}
        stickyDateTs={stickyDateTs}
        loadedDayKeys={loadedDayKeys}
        loadedDayBounds={loadedDayBounds}
        jumpCalOpen={jumpCalOpen}
        onToggleJumpCalendar={toggleJumpCalendar}
        onJumpToDayKey={jumpToDayKey}
        onDismissJumpCalendar={() => setJumpCalOpen(false)}
        highlightedMessageId={highlightedMessageId}
        clusterRoleByMessageId={clusterRoleByMessageId}
        resolveRepliedMessage={resolveRepliedMessage}
        goToQuotedMessage={goToQuotedMessage}
        patchMessageReactions={patchMessageReactions}
        refreshMessagesById={refreshMessagesById}
        refreshHead={refreshHead}
        filterGifs={filterGifs}
        noPreview={noPreview}
        reactionTarget={reactionTarget}
        setReactionTarget={setReactionTarget}
        setReplyingTo={setReplyingTo}
        setMessageActionError={setMessageActionError}
        handlePinToggle={handlePinToggle}
        onCoReadingBookmarked={onCoReadingBookmarked}
        isForum={isForum}
        topicId={topicId}
        list={list}
        scrollFabVisible={scrollFabVisible}
        onScrollToLatest={scrollToLatestMessages}
        threadUnreadCount={threadUnreadCount}
        showFreshMailPill={showFreshMailPill}
        onScrollToFirstUnread={scrollToFirstUnread}
        typers={typers}
      />
      <ChatComposer lettersLayout={lettersLayout} compose={compose} />
      </ThreadEl>
      {!dockInfoInLettersRail ? (
        <ChatContextPanel
          entity={
            dialog.entity as
              | import("teleproto").Api.User
              | import("teleproto").Api.Chat
              | import("teleproto").Api.Channel
              | null
              | undefined
          }
          peerName={name}
          peerId={key}
          client={client}
          isOpen={slidePanelOpen}
          onClose={() => setPanelOpen(false)}
          isForum={isForum && topicId == null}
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
