import { Api } from "telegram"
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParentalSettings } from "../context/ParentalContext"
import { useTelegram } from "../context/TelegramContext"
import { useMinWidth } from "../hooks/useMinWidth"
import { useNarrowView } from "../hooks/useNarrowView"
import { usePeriodicTick } from "../hooks/usePeriodicTick"
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
import { ChatView, THREAD_HEADER_ACTIONS_ID, THREAD_HEADER_CENTER_ID } from "./ChatView"
import { ChatsListPanel } from "./ChatsListPanel"
import { LettersMasthead } from "./LettersMasthead"
import { LettersChatRailProvider } from "./LettersChatRailContext"
import { LettersRightRailColumn } from "./LettersRightRailColumn"
import { SettingsView } from "./SettingsView"
import { PinDialog } from "./PinDialog"
import { RequestsView } from "./RequestsView"
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

export function MainShell() {
  const { t, i18n } = useTranslation()
  const { settings, setSettings, parentUnlocked, setParentUnlocked } = useParentalSettings()
  const { dialogs, refreshDialogs, logOut, lastMessageTick, client, hasMoreDialogs, dialogsLoadingMore, loadMoreDialogs } = useTelegram()
  const [tab, setTab] = useState<Tab>("chats")
  const [correspondenceTab, setCorrespondenceTab] = useState<CorrespondenceTab>("letters")
  const [selected, setSelected] = useState<Dialog | null>(null)
  /** Desktop day mail: scroll `ChatView` to this message id once opened. */
  const [lettersDayMailFocusMessageId, setLettersDayMailFocusMessageId] = useState<number | null>(
    null,
  )
  const [showPin, setShowPin] = useState(false)
  const [modePinToParent, setModePinToParent] = useState(false)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [deniedPeerIds, setDeniedPeerIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  /** Same breakpoint intent as `PAGE_WIDTH_SMALL` (960) in telegram-react for “small page”. */
  const narrow = useNarrowView(BP.narrowMax)
  const lettersThreeCol = useMinWidth(BP.lettersThreeColMin)

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
    })()
  }, [settings])

  const dialogsForCorrespondence = useMemo(
    () => filterDialogsByCorrespondenceTab(dialogs, correspondenceTab),
    [dialogs, correspondenceTab],
  )

  /** Correspondence rail + parental rules; excludes masthead search (search must not collapse the thread). */
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
  return (
    <div
      className={`app-root app-root--main app-root--mode-${settings.appMode}${tab === "chats" ? " app-root--letters-chats" : ""}`}
    >
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
          void logOut()
        }}
      />

      <div className="app-body app-body--fill">
        {tab === "chats" ? (
          narrow ? (
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
                  />
                </div>
              </div>
            ) : (
              <div className="chats-narrow-list">
                <ChatsListPanel
                  search={search}
                  onSearchChange={setSearch}
                  nightListHidden={nightHidden}
                  nightWindow={nightHidden ? { start: settings.nightMode.start, end: settings.nightMode.end } : undefined}
                  dialogs={childListDialogs}
                  selected={selected}
                  onSelect={handleSelectChat}
                  onRequestForHidden={handleRequestForHidden}
                  settings={settings}
                  hasMoreDialogs={hasMoreDialogs}
                  loadMoreDialogs={loadMoreDialogs}
                  dialogsLoadingMore={dialogsLoadingMore}
                  loadedDialogCount={dialogs.length}
                  client={client}
                  lettersMode
                  correspondentsDialogs={lettersCorrespondentsDialogs}
                  circlesDialogs={lettersCirclesDialogs}
                  bulletinChannelPeers={bulletinPeers}
                  onSelectBulletinPeer={handleBulletinSelect}
                />
              </div>
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
                    search={search}
                    onSearchChange={setSearch}
                    nightListHidden={nightHidden}
                    nightWindow={nightHidden ? { start: settings.nightMode.start, end: settings.nightMode.end } : undefined}
                    dialogs={childListDialogs}
                    selected={selected}
                    onSelect={handleSelectChat}
                    onRequestForHidden={handleRequestForHidden}
                    settings={settings}
                    hasMoreDialogs={hasMoreDialogs}
                    loadMoreDialogs={loadMoreDialogs}
                    dialogsLoadingMore={dialogsLoadingMore}
                    loadedDialogCount={dialogs.length}
                    client={client}
                    lettersMode
                    showSearch={false}
                    correspondentsDialogs={lettersCorrespondentsDialogs}
                    circlesDialogs={lettersCirclesDialogs}
                    bulletinChannelPeers={bulletinPeers}
                    onSelectBulletinPeer={handleBulletinSelect}
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
            <RequestsView dialogs={dialogs} />
          </div>
        ) : null}
      </div>
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
    </div>
  )
}
