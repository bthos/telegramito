import { Api } from "telegram"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParentalSettings } from "../context/ParentalContext"
import { useTelegram } from "../context/TelegramContext"
import { useMaxWidth } from "../hooks/useMaxWidth"
import { useMinWidth } from "../hooks/useMinWidth"
import { useNarrowView } from "../hooks/useNarrowView"
import { usePeriodicTick } from "../hooks/usePeriodicTick"
import { useScrollChromeHide } from "../hooks/useScrollChromeHide"
import { installHardwareBackRoot, useHardwareBackLayer } from "../hooks/useHardwareBack"
import { BP } from "../layout/breakpoints"
import type { Dialog } from "telegram/tl/custom/dialog"
import { getPendingRequests } from "../parental/storage"
import { getDialogPreviewText } from "../telegram/dialogPreview"
import { getPeerInfo, isBroadcastChannelDialog, isPrivateUserDialog } from "../telegram/dialogUtils"
import { requestChatAccessForDialog } from "../parental/requestAccess"
import { isNightListHidden, isPrivateOmittedInChildListForDeny } from "../parental/policy"
import type { AppMode } from "../parental/types"
import {
  filterDialogsByCorrespondenceTab,
  dialogIsArchived,
  type CorrespondenceTab,
} from "../util/correspondenceFilter"
import { formatLiteraryDateLine } from "../util/literaryDate"
import { localCalendarDayKey, resolveMorningMobileTab } from "../util/lettersRituals"
import {
  getCoReadingBookmarks,
  getLastMorningDayMailDate,
  setLastMorningDayMailDate,
  type CoReadingBookmark,
} from "../util/lettersRitualsStorage"
import { ChatView, THREAD_HEADER_ACTIONS_ID, THREAD_HEADER_CENTER_ID } from "./ChatView"
import { ChatsListPanel } from "./ChatsListPanel"
import { DayMailRail } from "./DayMailRail"
import { LettersCorrespondenceSeg } from "./LettersCorrespondenceSeg"
import { LettersDayMailSlideOver } from "./LettersDayMailSlideOver"
import { LettersDeskSheet } from "./LettersDeskSheet"
import { LettersMasthead } from "./LettersMasthead"
import { LettersChatRailProvider } from "./LettersChatRailContext"
import { LettersMobileTabBar, type MobileShellTab } from "./LettersMobileTabBar"
import { LettersRightRailColumn } from "./LettersRightRailColumn"
import { LettersWriteFab } from "./LettersWriteFab"
import { SettingsView } from "./SettingsView"
import { PinDialog } from "./PinDialog"
import { RequestsView } from "./RequestsView"
import { SignOutConfirmDialog } from "./SignOutConfirmDialog"
import { Button } from "./ds"
import { BackIcon } from "./BackIcon"

type Tab = "chats" | "settings" | "requests"

function filterDialogs(
  dialogs: Dialog[],
  q: string,
  tr: (k: string) => string
): Dialog[] {
  const s = q.trim().toLowerCase()
  if (s.length === 0) return dialogs
  return dialogs.filter((d) => {
    const { name } = getPeerInfo(d)
    if (name.toLowerCase().includes(s)) return true
    return getDialogPreviewText(d, tr).toLowerCase().includes(s)
  })
}

function countDayMailBadge(dialogs: Dialog[]): number {
  let n = 0
  for (const d of dialogs) {
    const m = d.message
    const ts = m && typeof m.date === "number" ? m.date : 0
    if ((d.unreadCount ?? 0) >= 1 && ts > 0) {
      n++
      if (n >= 14) break
    }
  }
  return n
}

export function MainShell() {
  const { t, i18n } = useTranslation()
  const { settings, setSettings, parentUnlocked, setParentUnlocked } = useParentalSettings()
  const { dialogs, refreshDialogs, logOut, lastMessageTick, client, hasMoreDialogs, dialogsLoadingMore, loadMoreDialogs } = useTelegram()
  const [tab, setTab] = useState<Tab>("chats")
  const [correspondenceTab, setCorrespondenceTab] = useState<CorrespondenceTab>("letters")
  const [selected, setSelected] = useState<Dialog | null>(null)
  const [lettersDayMailFocusMessageId, setLettersDayMailFocusMessageId] = useState<number | null>(
    null,
  )
  const [showPin, setShowPin] = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)
  const [modePinToParent, setModePinToParent] = useState(false)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [deniedPeerIds, setDeniedPeerIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileShellTab>("letters")
  const [deskSheetOpen, setDeskSheetOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [dayMailSlideOpen, setDayMailSlideOpen] = useState(false)
  const [coReadingBookmarks, setCoReadingBookmarks] = useState<CoReadingBookmark[]>([])
  const mobilePanelRef = useRef<HTMLDivElement>(null)

  const mobileCompact = useMaxWidth(BP.mobileCompactMax)
  const mobileStack = useNarrowView(BP.mobileCompactMax)
  const lettersThreeCol = useMinWidth(BP.lettersThreeColMin)
  const showTabletDayMailBtn = !mobileCompact && !lettersThreeCol

  const literaryDateLine = formatLiteraryDateLine(new Date(), i18n.language)

  const bulletinPeers = useMemo(() => {
    return dialogs
      .filter((d) => !dialogIsArchived(d))
      .filter((d) => {
        const e = d.entity
        if (e?.className !== "Channel") return false
        const c = e as Api.Channel
        return Boolean(c.broadcast) && !c.megagroup
      })
      .slice(0, 8)
      .map((d) => {
        const { key, name } = getPeerInfo(d)
        const rawDate = (d as { date?: unknown }).date
        const ts = typeof rawDate === "number" ? rawDate : undefined
        return {
          key,
          name,
          unreadCount: d.unreadCount ?? 0,
          lastMessageUnix: ts,
        }
      })
  }, [dialogs])

  const focusComposer = useCallback(() => {
    document.getElementById("letters-compose-textarea")?.focus()
  }, [])

  const consumeLettersJump = useCallback(() => {
    setLettersDayMailFocusMessageId(null)
  }, [])

  const handleSelectChat = useCallback((d: Dialog) => {
    setLettersDayMailFocusMessageId(null)
    setSelected(d)
  }, [])

  const handleDayMailSelect = useCallback((d: Dialog, opts?: { focusMessageId?: number }) => {
    setSelected(d)
    const fid = opts?.focusMessageId
    setLettersDayMailFocusMessageId(typeof fid === "number" && fid > 0 ? fid : null)
  }, [])

  const handleBulletinSelect = useCallback(
    (peerKey: string) => {
      const di = dialogs.find((x) => getPeerInfo(x).key === peerKey)
      if (di) {
        handleSelectChat(di)
      }
    },
    [dialogs, handleSelectChat],
  )

  useEffect(() => {
    if (!client) return
    void refreshDialogs()
  }, [client, lastMessageTick, refreshDialogs])

  usePeriodicTick(30_000)

  // Hardware back: root install (once per session)
  const [exitArmed, setExitArmed] = useState(false)
  useEffect(() => installHardwareBackRoot(setExitArmed), [])

  // Hardware back: open chat layer (mobile stacked layout only)
  useHardwareBackLayer(mobileStack && selected != null, () => setSelected(null))

  // Hardware back: settings/requests subpage (mobile only)
  useHardwareBackLayer(mobileCompact && tab !== "chats", () => setTab("chats"))

  useEffect(() => {
    if (!mobileCompact || tab !== "chats") {
      return
    }
    let cancelled = false
    void (async () => {
      const [lastDate, bookmarks] = await Promise.all([
        getLastMorningDayMailDate(),
        getCoReadingBookmarks(),
      ])
      if (cancelled) {
        return
      }
      setCoReadingBookmarks(bookmarks)
      const today = localCalendarDayKey()
      const nextTab = resolveMorningMobileTab({
        enabled: settings.morningDayMailEnabled,
        lastMorningDayMailDate: lastDate,
        today,
      })
      if (nextTab === "dayMail") {
        setMobileTab("dayMail")
        await setLastMorningDayMailDate(today)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mobileCompact, tab, settings.morningDayMailEnabled])

  const refreshCoReadingBookmarks = useCallback(async () => {
    const bookmarks = await getCoReadingBookmarks()
    setCoReadingBookmarks(bookmarks)
  }, [])

  useEffect(() => {
    if (deskSheetOpen && settings.appMode === "parent") {
      void refreshCoReadingBookmarks()
    }
  }, [deskSheetOpen, refreshCoReadingBookmarks, settings.appMode])

  const handleCoReadingNavigate = useCallback(
    (bookmark: CoReadingBookmark) => {
      const di = dialogs.find((x) => getPeerInfo(x).key === bookmark.chatId)
      if (!di) {
        return
      }
      handleDayMailSelect(di, { focusMessageId: bookmark.messageId })
      setDeskSheetOpen(false)
      if (mobileCompact) {
        setMobileTab("letters")
      }
    },
    [dialogs, handleDayMailSelect, mobileCompact],
  )

  useEffect(() => {
    if (settings.appMode === "parent") {
      queueMicrotask(() => {
        setParentUnlocked(true)
      })
    } else {
      queueMicrotask(() => {
        setParentUnlocked(false)
      })
    }
  }, [settings.appMode, setParentUnlocked])

  useEffect(() => {
    if (settings.appMode === "child" && (tab === "requests" || tab === "settings")) {
      queueMicrotask(() => {
        setTab("chats")
      })
    }
  }, [settings.appMode, tab])

  useEffect(() => {
    void (async () => {
      const rq = await getPendingRequests()
      setDeniedPeerIds(
        new Set(
          rq.filter((r) => r.status === "denied").map((r) => r.targetId)
        )
      )
      setPendingRequestCount(rq.filter((r) => r.status === "pending").length)
    })()
  }, [settings])

  const dialogsForCorrespondence = useMemo(
    () => filterDialogsByCorrespondenceTab(dialogs, correspondenceTab),
    [dialogs, correspondenceTab],
  )

  const dialogsEligibleToRetainSelection = useMemo(() => {
    if (settings.appMode !== "child") {
      return dialogsForCorrespondence
    }
    if (deniedPeerIds.size === 0) {
      return dialogsForCorrespondence
    }
    return dialogsForCorrespondence.filter((d) => {
      if (!isPrivateUserDialog(d)) {
        return true
      }
      const { key } = getPeerInfo(d)
      return !isPrivateOmittedInChildListForDeny(
        settings.appMode,
        true,
        key,
        deniedPeerIds,
      )
    })
  }, [dialogsForCorrespondence, settings.appMode, deniedPeerIds])

  const childListDialogs = useMemo(
    () => filterDialogs(dialogsEligibleToRetainSelection, deferredSearch, t),
    [dialogsEligibleToRetainSelection, deferredSearch, t],
  )

  const lettersCorrespondentsDialogs = useMemo(
    () => childListDialogs.filter(isPrivateUserDialog),
    [childListDialogs],
  )
  const lettersCirclesDialogs = useMemo(
    () =>
      childListDialogs.filter(
        (d) =>
          !isPrivateUserDialog(d) && !isBroadcastChannelDialog(d),
      ),
    [childListDialogs],
  )

  const lettersRailDigest = useMemo(
    () => ({
      dialogs: childListDialogs,
      selectedKey: selected ? getPeerInfo(selected).key : null,
      onSelect: handleDayMailSelect,
    }),
    [childListDialogs, selected, handleDayMailSelect],
  )
  const lettersRailSelectedKey = selected ? getPeerInfo(selected).key : null
  const dayMailBadgeCount = useMemo(() => countDayMailBadge(dialogs), [dialogs])

  useEffect(() => {
    if (!selected) {
      return
    }
    const sk = getPeerInfo(selected).key
    const retain = dialogsEligibleToRetainSelection.some((d) => getPeerInfo(d).key === sk)
    const stillLoaded = dialogs.some((d) => getPeerInfo(d).key === sk)
    if (!retain || !stillLoaded) {
      queueMicrotask(() => {
        setSelected(null)
      })
    }
  }, [dialogs, dialogsEligibleToRetainSelection, selected])

  useEffect(() => {
    if (settings.appMode !== "child" || !selected) {
      return
    }
    if (!isPrivateUserDialog(selected)) {
      return
    }
    const { key } = getPeerInfo(selected)
    if (deniedPeerIds.has(key)) {
      queueMicrotask(() => {
        setSelected(null)
      })
    }
  }, [deniedPeerIds, selected, settings.appMode])

  const handleRequestForHidden = useCallback(async (d: Dialog) => {
    await requestChatAccessForDialog(d)
  }, [])

  const canEditSettings =
    settings.appMode === "parent" || !settings.pinHash || parentUnlocked

  const setAppMode = (appMode: AppMode) => {
    if (appMode === settings.appMode) {
      return
    }
    if (appMode === "child") {
      void setSettings((prev) => ({ ...prev, appMode: "child" }))
      return
    }
    if (settings.appMode === "child" && settings.pinHash) {
      setModePinToParent(true)
      setShowPin(true)
      return
    }
    void setSettings((prev) => ({ ...prev, appMode: "parent" }))
  }

  const closePin = () => {
    setShowPin(false)
    setModePinToParent(false)
  }
  const nightHidden = isNightListHidden(
    settings.nightMode,
    new Date(),
    settings.appMode
  )
  useEffect(() => {
    if (!nightHidden || settings.appMode !== "child") {
      return
    }
    queueMicrotask(() => {
      setSelected((s) => (s != null ? null : s))
    })
  }, [nightHidden, settings.appMode])

  const showMobileTabBar =
    mobileCompact && tab === "chats" && !selected && !deskSheetOpen
  const showCompactMasthead =
    mobileCompact && tab === "chats" && !selected
  const mastheadChromeHidden = useScrollChromeHide(
    mobilePanelRef,
    showCompactMasthead && (mobileTab === "letters" || mobileTab === "dayMail"),
  )

  const handleMobileTabSelect = useCallback((next: MobileShellTab) => {
    if (next === "desk") {
      setDeskSheetOpen(true)
      return
    }
    setMobileTab(next)
    setDeskSheetOpen(false)
  }, [])

  const listPanelCommon = {
    search,
    onSearchChange: setSearch,
    nightListHidden: nightHidden,
    nightWindow: nightHidden ? { start: settings.nightMode.start, end: settings.nightMode.end } as const : undefined,
    selected,
    onSelect: handleSelectChat,
    onRequestForHidden: handleRequestForHidden,
    settings,
    hasMoreDialogs,
    loadMoreDialogs,
    dialogsLoadingMore,
    loadedDialogCount: dialogs.length,
    client,
    lettersMode: true as const,
    showSearch: !mobileCompact,
    correspondentsDialogs: lettersCorrespondentsDialogs,
    circlesDialogs: lettersCirclesDialogs,
    bulletinChannelPeers: bulletinPeers,
    onSelectBulletinPeer: handleBulletinSelect,
    correspondenceTab,
  }

  const mobileListBody = (
    <div
      ref={mobilePanelRef}
      className="letters-mobile-panel"
      role="tabpanel"
      id={`letters-mobile-panel-${mobileTab}`}
      aria-labelledby={`letters-mobile-tab-${mobileTab}`}
    >
      {mobileTab === "letters" ? (
        <>
          <LettersCorrespondenceSeg value={correspondenceTab} onChange={setCorrespondenceTab} />
          <div className="letters-mobile-panel-scroll chats-narrow-list">
            <ChatsListPanel {...listPanelCommon} dialogs={childListDialogs} />
          </div>
          <LettersWriteFab onClick={focusComposer} />
        </>
      ) : null}
      {mobileTab === "dayMail" ? (
        <div className="letters-mobile-panel-scroll letters-mobile-day-mail">
          <DayMailRail
            dialogs={childListDialogs}
            selectedKey={lettersRailSelectedKey}
            onSelect={handleDayMailSelect}
            client={client}
          />
        </div>
      ) : null}
      {mobileTab === "circles" ? (
        <div className="letters-mobile-panel-scroll chats-narrow-list">
          <ChatsListPanel
            {...listPanelCommon}
            dialogs={lettersCirclesDialogs}
            circlesOnly
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div
      className={`app-root app-root--main app-root--mode-${settings.appMode}${tab === "chats" ? " app-root--letters-chats" : ""}${mobileCompact ? " app-root--letters-mobile" : ""}`}
    >
      {showCompactMasthead ? (
        <LettersMasthead
          dateLine={literaryDateLine}
          correspondenceTab={correspondenceTab}
          onCorrespondenceTab={setCorrespondenceTab}
          search={search}
          onSearchChange={setSearch}
          onWrite={focusComposer}
          shellTab={tab}
          onShellTab={setTab}
          showParentShellNav={settings.appMode === "parent"}
          appMode={settings.appMode}
          onAppMode={setAppMode}
          onSignOut={() => {
            setSignOutConfirmOpen(true)
          }}
          compact
          searchExpanded={searchExpanded}
          onSearchExpandedChange={setSearchExpanded}
          onOpenDesk={() => {
            setDeskSheetOpen(true)
          }}
          chromeHidden={mastheadChromeHidden}
        />
      ) : tab === "chats" && !(mobileCompact && selected) ? (
        <LettersMasthead
          dateLine={literaryDateLine}
          correspondenceTab={correspondenceTab}
          onCorrespondenceTab={setCorrespondenceTab}
          search={search}
          onSearchChange={setSearch}
          onWrite={focusComposer}
          shellTab={tab}
          onShellTab={setTab}
          showParentShellNav={settings.appMode === "parent"}
          appMode={settings.appMode}
          onAppMode={setAppMode}
          onSignOut={() => {
            setSignOutConfirmOpen(true)
          }}
          showDayMailButton={showTabletDayMailBtn}
          onOpenDayMail={() => {
            setDayMailSlideOpen(true)
          }}
        />
      ) : null}

      <div className="app-body app-body--fill">
        {tab === "chats" ? (
          mobileStack ? (
            selected ? (
              <div className="chats-narrow">
                <div className="thread-header thread-header--mobile">
                  <Button
                    variant="ghostIcon"
                    type="button"
                    className="thread-header__back"
                    onClick={() => {
                      setSelected(null)
                    }}
                    aria-label={t("common.back")}
                    title={t("common.back")}
                  >
                    <BackIcon />
                  </Button>
                  <div className="thread-header__center" id={THREAD_HEADER_CENTER_ID} aria-live="polite" />
                  <div className="thread-header__actions" id={THREAD_HEADER_ACTIONS_ID} />
                </div>
                <div className="chats-narrow__thread">
                  <ChatView
                    key={getPeerInfo(selected).key}
                    dialog={selected}
                    settings={settings}
                    showTitle={false}
                    lettersLayout
                    lettersJumpToMessageId={lettersDayMailFocusMessageId}
                    onLettersJumpToMessageConsumed={consumeLettersJump}
                    onCoReadingBookmarked={refreshCoReadingBookmarks}
                  />
                </div>
              </div>
            ) : (
              mobileListBody
            )
          ) : (
            <LettersChatRailProvider
              digest={lettersRailDigest}
              selectedKey={lettersRailSelectedKey}
            >
              <div
                className={`chats-layout${lettersThreeCol ? " chats-layout--letters-three" : ""}`}
              >
                <aside className="chat-aside letters-correspondents-aside" aria-label={t("letters.correspondentsAria")}>
                  <ChatsListPanel
                    {...listPanelCommon}
                    dialogs={childListDialogs}
                    showSearch={false}
                  />
                </aside>
                <div className="chat-main chat-main--letters">
                  {selected ? (
                    <ChatView
                      key={getPeerInfo(selected).key}
                      dialog={selected}
                      settings={settings}
                      lettersLayout
                      lettersThreePane={lettersThreeCol}
                      lettersJumpToMessageId={lettersDayMailFocusMessageId}
                      onLettersJumpToMessageConsumed={consumeLettersJump}
                      onCoReadingBookmarked={refreshCoReadingBookmarks}
                    />
                  ) : (
                    <div className="empty-chat" role="status">
                      <div className="empty-chat__icon" aria-hidden />
                      <p className="empty-chat__t">{t("chat.noChat")}</p>
                      <p className="empty-chat__d muted small">{t("chat.emptyHint")}</p>
                    </div>
                  )}
                </div>
                {lettersThreeCol ? (
                  <aside
                    className="letters-day-mail-aside"
                    aria-label={t("letters.railAsideAria")}
                  >
                    <LettersRightRailColumn />
                  </aside>
                ) : null}
              </div>
            </LettersChatRailProvider>
          )
        ) : null}

        {tab === "settings" ? (
          <div className="one-col one-col--scroll">
            {mobileCompact ? (
              <div className="letters-mobile-subpage-bar">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setTab("chats")
                  }}
                >
                  {t("common.back")}
                </Button>
              </div>
            ) : null}
            <SettingsView
              canEdit={canEditSettings}
              onRequestPin={() => {
                setShowPin(true)
              }}
            />
          </div>
        ) : null}
        {tab === "requests" ? (
          <div className="one-col one-col--scroll">
            {mobileCompact ? (
              <div className="letters-mobile-subpage-bar">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setTab("chats")
                  }}
                >
                  {t("common.back")}
                </Button>
              </div>
            ) : null}
            <RequestsView dialogs={dialogs} />
          </div>
        ) : null}
      </div>

      {exitArmed ? (
        <div className="letters-wax-seal-toast" role="status">
          <span>{t("common.pressBackToExit")}</span>
        </div>
      ) : null}

      {showMobileTabBar ? (
        <LettersMobileTabBar
          active={mobileTab}
          onSelect={handleMobileTabSelect}
          dayMailBadge={dayMailBadgeCount}
        />
      ) : null}

      <LettersDeskSheet
        open={deskSheetOpen}
        onClose={() => {
          setDeskSheetOpen(false)
        }}
        appMode={settings.appMode}
        onAppMode={setAppMode}
        showParentRows={settings.appMode === "parent"}
        pendingRequestCount={pendingRequestCount}
        morningDayMailEnabled={settings.morningDayMailEnabled}
        onMorningDayMailEnabled={(enabled) => {
          void setSettings((prev) => ({ ...prev, morningDayMailEnabled: enabled }))
        }}
        waxSealSendEnabled={settings.waxSealSendEnabled}
        onWaxSealSendEnabled={(enabled) => {
          void setSettings((prev) => ({ ...prev, waxSealSendEnabled: enabled }))
        }}
        eveningSummaryPreciseEnabled={settings.eveningSummaryPreciseEnabled}
        onEveningSummaryPreciseEnabled={(enabled) => {
          void setSettings((prev) => ({ ...prev, eveningSummaryPreciseEnabled: enabled }))
        }}
        coReadingBookmarks={settings.appMode === "parent" ? coReadingBookmarks : []}
        onCoReadingNavigate={handleCoReadingNavigate}
        onOpenSettings={() => {
          setTab("settings")
        }}
        onOpenRequests={() => {
          setTab("requests")
        }}
        onSignOut={() => {
          setSignOutConfirmOpen(true)
        }}
      />

      <LettersDayMailSlideOver
        open={dayMailSlideOpen}
        onClose={() => {
          setDayMailSlideOpen(false)
        }}
        dialogs={childListDialogs}
        selectedKey={lettersRailSelectedKey}
        onSelect={handleDayMailSelect}
        client={client}
      />

      <PinDialog
        open={showPin}
        onClose={closePin}
        onSuccess={() => {
          setParentUnlocked(true)
          if (modePinToParent) {
            setModePinToParent(false)
            void setSettings((prev) => ({ ...prev, appMode: "parent" }))
          }
        }}
      />

      <SignOutConfirmDialog
        open={signOutConfirmOpen}
        onClose={() => {
          setSignOutConfirmOpen(false)
        }}
        onConfirm={() => {
          setSignOutConfirmOpen(false)
          void logOut()
        }}
      />
    </div>
  )
}
