import { Api } from "telegram"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
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
import { getPendingRequests } from "../parental/storage"
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
import { ChatView, THREAD_HEADER_ACTIONS_ID, THREAD_HEADER_CENTER_ID } from "./ChatView"
import { LettersDayMailSlideOver } from "./LettersDayMailSlideOver"
import { LettersDeskSheet } from "./LettersDeskSheet"
import { LettersMobileTabBar } from "./LettersMobileTabBar"
import { MainShellDesktopChatsLayout } from "./MainShellDesktopChatsLayout"
import { MainShellMastheadSection } from "./MainShellMastheadSection"
import { MainShellMobileListPanel } from "./MainShellMobileListPanel"
import { MainShellSubpageShell } from "./MainShellSubpageShell"
import { SettingsView } from "./SettingsView"
import { PinDialog } from "./PinDialog"
import { RequestsView } from "./RequestsView"
import { SignOutConfirmDialog } from "./SignOutConfirmDialog"
import { Button } from "./ds"
import { BackIcon } from "./BackIcon"
import { countDayMailBadge } from "./mainShellDayMailBadge"
import {
  mastheadChromeHideEnabled,
  showCompactMasthead,
  showMobileTabBar,
  showTabletDayMailButton,
} from "./mainShellChromeGate"
import { filterDialogsBySearch } from "./mainShellDialogFilter"
import { useMainShellDialogSelection } from "./useMainShellDialogSelection"
import { useMainShellMobileChrome } from "./useMainShellMobileChrome"

type Tab = "chats" | "settings" | "requests"

export function MainShell() {
  const { t, i18n } = useTranslation()
  const { settings, setSettings, parentUnlocked, setParentUnlocked } = useParentalSettings()
  const {
    dialogs,
    refreshDialogs,
    logOut,
    lastMessageTick,
    client,
    hasMoreDialogs,
    dialogsLoadingMore,
    loadMoreDialogs,
  } = useTelegram()
  const [tab, setTab] = useState<Tab>("chats")
  const [correspondenceTab, setCorrespondenceTab] = useState<CorrespondenceTab>("letters")
  const [showPin, setShowPin] = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)
  const [modePinToParent, setModePinToParent] = useState(false)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [deniedPeerIds, setDeniedPeerIds] = useState<ReadonlySet<string>>(() => new Set())
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const mobilePanelRef = useRef<HTMLDivElement>(null)

  const mobileCompact = useMaxWidth(BP.mobileCompactMax)
  const mobileStack = useNarrowView(BP.mobileCompactMax)
  const lettersThreeCol = useMinWidth(BP.lettersThreeColMin)
  const showTabletDayMailBtn = showTabletDayMailButton({ mobileCompact, lettersThreeCol })

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

  const focusComposer = () => {
    document.getElementById("letters-compose-textarea")?.focus()
  }

  useEffect(() => {
    if (!client) return
    void refreshDialogs()
  }, [client, lastMessageTick, refreshDialogs])

  usePeriodicTick(30_000)

  const [exitArmed, setExitArmed] = useState(false)
  useEffect(() => installHardwareBackRoot(setExitArmed), [])

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
        new Set(rq.filter((r) => r.status === "denied").map((r) => r.targetId)),
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

  const nightHidden = isNightListHidden(settings.nightMode, new Date(), settings.appMode)

  const {
    selected,
    lettersDayMailFocusMessageId,
    consumeLettersJump,
    handleSelectChat,
    handleDayMailSelect,
    handleBulletinSelect,
    clearSelected,
  } = useMainShellDialogSelection({
    dialogs,
    dialogsEligibleToRetainSelection,
    appMode: settings.appMode,
    deniedPeerIds,
    nightHidden,
  })

  const {
    mobileTab,
    deskSheetOpen,
    setDeskSheetOpen,
    searchExpanded,
    setSearchExpanded,
    dayMailSlideOpen,
    setDayMailSlideOpen,
    coReadingBookmarks,
    refreshCoReadingBookmarks,
    handleMobileTabSelect,
    handleCoReadingNavigate,
  } = useMainShellMobileChrome({
    mobileCompact,
    tab,
    morningDayMailEnabled: settings.morningDayMailEnabled,
    appMode: settings.appMode,
    dialogs,
    handleDayMailSelect,
  })

  useHardwareBackLayer(mobileStack && selected != null, clearSelected)

  const childListDialogs = useMemo(
    () => filterDialogsBySearch(dialogsEligibleToRetainSelection, deferredSearch, t),
    [dialogsEligibleToRetainSelection, deferredSearch, t],
  )

  const lettersCorrespondentsDialogs = useMemo(
    () => childListDialogs.filter(isPrivateUserDialog),
    [childListDialogs],
  )
  const lettersCirclesDialogs = useMemo(
    () =>
      childListDialogs.filter(
        (d) => !isPrivateUserDialog(d) && !isBroadcastChannelDialog(d),
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

  const handleRequestForHidden = async (d: Parameters<typeof requestChatAccessForDialog>[0]) => {
    await requestChatAccessForDialog(d)
  }

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

  const hasSelectedChat = selected != null
  const compactMasthead = showCompactMasthead({
    mobileCompact,
    tab,
    hasSelectedChat,
  })
  const mobileTabBarVisible = showMobileTabBar({
    mobileCompact,
    tab,
    hasSelectedChat,
    deskSheetOpen,
  })
  const mastheadChromeHidden = useScrollChromeHide(
    mobilePanelRef,
    mastheadChromeHideEnabled({ showCompactMasthead: compactMasthead, mobileTab }),
  )

  const nightWindow = nightHidden
    ? ({ start: settings.nightMode.start, end: settings.nightMode.end } as const)
    : undefined

  const listPanelCommon = {
    search,
    onSearchChange: setSearch,
    nightListHidden: nightHidden,
    nightWindow,
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

  return (
    <div
      className={`app-root app-root--main app-root--mode-${settings.appMode}${tab === "chats" ? " app-root--letters-chats" : ""}${mobileCompact ? " app-root--letters-mobile" : ""}`}
    >
      <MainShellMastheadSection
        compactMasthead={compactMasthead}
        showDesktopMasthead={tab === "chats" && !(mobileCompact && selected)}
        literaryDateLine={literaryDateLine}
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
        searchExpanded={searchExpanded}
        onSearchExpandedChange={setSearchExpanded}
        chromeHidden={mastheadChromeHidden}
        showTabletDayMailBtn={showTabletDayMailBtn}
        onOpenDayMail={() => {
          setDayMailSlideOpen(true)
        }}
        onOpenDesk={() => {
          setDeskSheetOpen(true)
        }}
      />

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
                    onClick={clearSelected}
                    aria-label={t("common.back")}
                    title={t("common.back")}
                  >
                    <BackIcon />
                  </Button>
                  <div
                    className="thread-header__center"
                    id={THREAD_HEADER_CENTER_ID}
                    aria-live="polite"
                  />
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
              <MainShellMobileListPanel
                panelRef={mobilePanelRef}
                mobileTab={mobileTab}
                correspondenceTab={correspondenceTab}
                onCorrespondenceTab={setCorrespondenceTab}
                listPanelCommon={listPanelCommon}
                childListDialogs={childListDialogs}
                lettersRailSelectedKey={lettersRailSelectedKey}
                onDayMailSelect={handleDayMailSelect}
                client={client}
                settings={settings}
                nightHidden={nightHidden}
                nightWindow={nightWindow}
                deniedPeerIds={deniedPeerIds}
                onWrite={focusComposer}
              />
            )
          ) : (
            <MainShellDesktopChatsLayout
              lettersThreeCol={lettersThreeCol}
              correspondentsAria={t("letters.correspondentsAria")}
              railAsideAria={t("letters.railAsideAria")}
              noChatLabel={t("chat.noChat")}
              emptyHint={t("chat.emptyHint")}
              listPanelCommon={listPanelCommon}
              childListDialogs={childListDialogs}
              selected={selected}
              settings={settings}
              lettersDayMailFocusMessageId={lettersDayMailFocusMessageId}
              onLettersJumpConsumed={consumeLettersJump}
              onCoReadingBookmarked={refreshCoReadingBookmarks}
              lettersRailDigest={lettersRailDigest}
              lettersRailSelectedKey={lettersRailSelectedKey}
            />
          )
        ) : null}

        {tab === "settings" ? (
          <MainShellSubpageShell
            showBack
            backLabel={t("common.back")}
            onBack={() => setTab("chats")}
          >
            <SettingsView
              canEdit={canEditSettings}
              onRequestPin={() => {
                setShowPin(true)
              }}
            />
          </MainShellSubpageShell>
        ) : null}
        {tab === "requests" ? (
          <MainShellSubpageShell
            showBack
            backLabel={t("common.back")}
            onBack={() => setTab("chats")}
          >
            <RequestsView dialogs={dialogs} />
          </MainShellSubpageShell>
        ) : null}
      </div>

      {exitArmed ? (
        <div className="letters-wax-seal-toast" role="status">
          <span>{t("common.pressBackToExit")}</span>
        </div>
      ) : null}

      {mobileTabBarVisible ? (
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
          setDeskSheetOpen(false)
          setTab("settings")
        }}
        onOpenRequests={() => {
          setDeskSheetOpen(false)
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
