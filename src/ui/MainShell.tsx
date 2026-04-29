import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from "react"
import { useTranslation } from "react-i18next"
import { useParentalSettings } from "../context/ParentalContext"
import { useTheme } from "../context/ThemeContext"
import { useTelegram } from "../context/TelegramContext"
import { useNarrowView } from "../hooks/useNarrowView"
import { usePeriodicTick } from "../hooks/usePeriodicTick"
import type { Dialog } from "telegram/tl/custom/dialog"
import { getPendingRequests } from "../parental/storage"
import { getDialogPreviewText } from "../telegram/dialogPreview"
import { getPeerInfo, isPrivateUserDialog } from "../telegram/dialogUtils"
import { requestChatAccessForDialog } from "../parental/requestAccess"
import { isNightListHidden, isPrivateOmittedInChildListForDeny } from "../parental/policy"
import type { AppMode } from "../parental/types"
import type { ThemePreference } from "../theme/storage"
import { ChatView, THREAD_HEADER_ACTIONS_ID } from "./ChatView"
import { ChatsListPanel } from "./ChatsListPanel"
import { SettingsView } from "./SettingsView"
import { PinDialog } from "./PinDialog"
import { RequestsView } from "./RequestsView"
import { Button } from "./ds"
import { BackIcon } from "./BackIcon"
import { ChildModeIcon, ParentModeIcon } from "./ModeToggleIcons"
import { TelegramMark } from "./TelegramMark"
import { SignOutIcon } from "./SignOutIcon"
import { DarkThemeIcon, LightThemeIcon, SystemThemeIcon } from "./ThemeToggleIcons"

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

const THEME_TOGGLES: {
  pref: ThemePreference
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { pref: "light", Icon: LightThemeIcon },
  { pref: "system", Icon: SystemThemeIcon },
  { pref: "dark", Icon: DarkThemeIcon },
]

export function MainShell() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { settings, setSettings, parentUnlocked, setParentUnlocked } = useParentalSettings()
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const { dialogs, refreshDialogs, logOut, lastMessageTick, client, hasMoreDialogs, dialogsLoadingMore, loadMoreDialogs } = useTelegram()
  const [tab, setTab] = useState<Tab>("chats")
  const [selected, setSelected] = useState<Dialog | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [modePinToParent, setModePinToParent] = useState(false)
  const [search, setSearch] = useState("")
  const [deniedPeerIds, setDeniedPeerIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  /** Same breakpoint intent as `PAGE_WIDTH_SMALL` (960) in telegram-react for “small page”. */
  const narrow = useNarrowView(960)

  useEffect(() => {
    if (!client) return
    void refreshDialogs()
  }, [client, lastMessageTick, refreshDialogs])

  usePeriodicTick(30_000)

  useEffect(() => {
    if (settings.appMode === "parent") {
      setParentUnlocked(true)
    } else {
      setParentUnlocked(false)
    }
  }, [settings.appMode, setParentUnlocked])

  useEffect(() => {
    if (settings.appMode === "child" && (tab === "requests" || tab === "settings")) {
      setTab("chats")
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

  const visibleDialogs = useMemo(
    () => filterDialogs(dialogs, search, t),
    [dialogs, search, t]
  )
  const childListDialogs = useMemo(() => {
    if (settings.appMode !== "child") return visibleDialogs
    if (deniedPeerIds.size === 0) return visibleDialogs
    return visibleDialogs.filter((d) => {
      if (!isPrivateUserDialog(d)) return true
      const { key } = getPeerInfo(d)
      return !isPrivateOmittedInChildListForDeny(
        settings.appMode,
        true,
        key,
        deniedPeerIds
      )
    })
  }, [visibleDialogs, settings.appMode, deniedPeerIds])

  useEffect(() => {
    if (settings.appMode !== "child" || !selected) {
      return
    }
    if (!isPrivateUserDialog(selected)) {
      return
    }
    const { key } = getPeerInfo(selected)
    if (deniedPeerIds.has(key)) {
      setSelected(null)
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
      void setSettings({ ...settingsRef.current, appMode: "child" })
      return
    }
    if (settings.appMode === "child" && settings.pinHash) {
      setModePinToParent(true)
      setShowPin(true)
      return
    }
    void setSettings({ ...settingsRef.current, appMode: "parent" })
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
    setSelected((s) => (s != null ? null : s))
  }, [nightHidden, settings.appMode])
  return (
    <div
      className={`app-root app-root--main app-root--mode-${settings.appMode}`}
    >
      <header
        className={`app-topbar app-topbar--mode-${settings.appMode}`}
        role="banner"
      >
        <div className="app-topbar__row app-topbar__row--head">
          <div className="app-topbar__brand">
            <TelegramMark className="app-topbar__logo" />
            <h1 className="app-topbar__title">{t("appName")}</h1>
          </div>
          {settings.appMode === "parent" ? (
            <nav className="app-topbar__tabs" aria-label="main">
              <button
                type="button"
                className={tab === "chats" ? "app-tab is-active" : "app-tab"}
                onClick={() => {
                  setTab("chats")
                }}
              >
                {t("chats")}
              </button>
              <button
                type="button"
                className={tab === "settings" ? "app-tab is-active" : "app-tab"}
                onClick={() => {
                  setTab("settings")
                }}
              >
                {t("settings")}
              </button>
              <button
                type="button"
                className={tab === "requests" ? "app-tab is-active" : "app-tab"}
                onClick={() => {
                  setTab("requests")
                }}
              >
                {t("requestsTab")}
              </button>
            </nav>
          ) : null}
        </div>
        <div className="app-topbar__row app-topbar__row--tools">
          <div className="app-topbar__toggles">
            <div
              className="app-mode-toggle"
              role="group"
              aria-label={t("mode.headerToggle")}
            >
              <button
                type="button"
                className={
                  settings.appMode === "child"
                    ? "app-mode-toggle__btn is-active"
                    : "app-mode-toggle__btn"
                }
                onClick={() => {
                  setAppMode("child")
                }}
                aria-pressed={settings.appMode === "child"}
                aria-label={t("mode.child")}
                title={t("mode.child")}
              >
                <span className="app-mode-toggle__ic" aria-hidden>
                  <ChildModeIcon />
                </span>
              </button>
              <button
                type="button"
                className={
                  settings.appMode === "parent"
                    ? "app-mode-toggle__btn is-active"
                    : "app-mode-toggle__btn"
                }
                onClick={() => {
                  setAppMode("parent")
                }}
                aria-pressed={settings.appMode === "parent"}
                aria-label={t("mode.parent")}
                title={t("mode.parent")}
              >
                <span className="app-mode-toggle__ic" aria-hidden>
                  <ParentModeIcon />
                </span>
              </button>
            </div>
            <div
              className="app-mode-toggle"
              role="group"
              aria-label={t("theme.label")}
            >
              {THEME_TOGGLES.map(({ pref, Icon }) => {
                const active = theme === pref
                return (
                  <button
                    key={pref}
                    type="button"
                    className={
                      active
                        ? "app-mode-toggle__btn is-active"
                        : "app-mode-toggle__btn"
                    }
                    onClick={() => {
                      setTheme(pref)
                    }}
                    aria-pressed={active}
                    aria-label={t(`theme.${pref}`)}
                    title={t(`theme.${pref}`)}
                  >
                    <span className="app-mode-toggle__ic" aria-hidden>
                      <Icon />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="app-topbar__end">
            <Button
              variant="ghostIcon"
              type="button"
              aria-label={t("signOut")}
              title={t("signOut")}
              onClick={() => { void logOut() }}
            >
              <SignOutIcon />
            </Button>
          </div>
        </div>
      </header>

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
                  <h2 className="thread-header__h">{getPeerInfo(selected).name}</h2>
                  <div className="thread-header__actions" id={THREAD_HEADER_ACTIONS_ID} />
                </div>
                <div className="chats-narrow__thread">
                  <ChatView
                    key={getPeerInfo(selected).key}
                    dialog={selected}
                    settings={settings}
                    showTitle={false}
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
                  onSelect={setSelected}
                  onRequestForHidden={handleRequestForHidden}
                  settings={settings}
                  hasMoreDialogs={hasMoreDialogs}
                  loadMoreDialogs={loadMoreDialogs}
                  dialogsLoadingMore={dialogsLoadingMore}
                  loadedDialogCount={dialogs.length}
                />
              </div>
            )
          ) : (
            <div className="chats-layout">
              <aside className="chat-aside" aria-label={t("chats")}>
                <ChatsListPanel
                  search={search}
                  onSearchChange={setSearch}
                  nightListHidden={nightHidden}
                  nightWindow={nightHidden ? { start: settings.nightMode.start, end: settings.nightMode.end } : undefined}
                  dialogs={childListDialogs}
                  selected={selected}
                  onSelect={setSelected}
                  onRequestForHidden={handleRequestForHidden}
                  settings={settings}
                  hasMoreDialogs={hasMoreDialogs}
                  loadMoreDialogs={loadMoreDialogs}
                  dialogsLoadingMore={dialogsLoadingMore}
                  loadedDialogCount={dialogs.length}
                />
              </aside>
              <div className="chat-main">
                {selected ? (
                  <ChatView
                    key={getPeerInfo(selected).key}
                    dialog={selected}
                    settings={settings}
                  />
                ) : (
                  <div className="empty-chat" role="status">
                    <div className="empty-chat__icon" aria-hidden />
                    <p className="empty-chat__t">{t("chat.noChat")}</p>
                    <p className="empty-chat__d muted small">{t("chat.emptyHint")}</p>
                  </div>
                )}
              </div>
            </div>
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
            void setSettings({ ...settingsRef.current, appMode: "parent" })
          }
        }}
      />
    </div>
  )
}
