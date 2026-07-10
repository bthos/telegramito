import { type ComponentType, type SVGProps, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useHardwareBackLayer } from "../hooks/useHardwareBack"
import { useTheme } from "../context/ThemeContext"
import type { AppMode } from "../parental/types"
import type { ThemePreference } from "../theme/storage"
import type { CorrespondenceTab } from "../util/correspondenceFilter"
import { Button, TextField } from "./ds"
import { ChildModeIcon, ParentModeIcon } from "./ModeToggleIcons"
import { SignOutIcon } from "./SignOutIcon"
import { DarkThemeIcon, LightThemeIcon, SystemThemeIcon } from "./ThemeToggleIcons"

const THEME_TOGGLES: {
  pref: ThemePreference
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { pref: "light", Icon: LightThemeIcon },
  { pref: "system", Icon: SystemThemeIcon },
  { pref: "dark", Icon: DarkThemeIcon },
]

type ShellTab = "chats" | "settings" | "requests"

type Props = {
  dateLine: string
  correspondenceTab: CorrespondenceTab
  onCorrespondenceTab: (t: CorrespondenceTab) => void
  search: string
  onSearchChange: (value: string) => void
  onWrite: () => void
  shellTab: ShellTab
  onShellTab: (t: ShellTab) => void
  showParentShellNav: boolean
  appMode: AppMode
  onAppMode: (m: AppMode) => void
  onSignOut: () => void
  /** ≤700px: one-row compact chrome; shell nav + tools move to desk sheet. */
  compact?: boolean
  /** Compact: search icon expanded to full-width field. */
  searchExpanded?: boolean
  onSearchExpandedChange?: (open: boolean) => void
  onOpenDesk?: () => void
  /** Tablet band: ☙ opens day-mail slide-over (not shown when `compact`). */
  showDayMailButton?: boolean
  onOpenDayMail?: () => void
  /** Scroll-hide on list / day-mail screens. */
  chromeHidden?: boolean
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.35rem" height="1.35rem" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function LettersMasthead({
  dateLine,
  correspondenceTab,
  onCorrespondenceTab,
  search,
  onSearchChange,
  onWrite,
  shellTab,
  onShellTab,
  showParentShellNav,
  appMode,
  onAppMode,
  onSignOut,
  compact = false,
  searchExpanded = false,
  onSearchExpandedChange,
  onOpenDesk,
  showDayMailButton = false,
  onOpenDayMail,
  chromeHidden = false,
}: Props) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const chatsChrome = shellTab === "chats"
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (compact && searchExpanded) {
      searchInputRef.current?.focus()
    }
  }, [compact, searchExpanded])

  useHardwareBackLayer(
    searchExpanded,
    () => onSearchExpandedChange?.(false),
  )

  if (compact) {
    const rootClass = [
      "letters-masthead",
      "letters-masthead--compact",
      searchExpanded ? "letters-masthead--search-open" : "",
      chromeHidden ? "letters-masthead--chrome-hidden" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return (
      <header className={rootClass} role="banner" aria-label={t("letters.mastheadAria")}>
        {searchExpanded ? (
          <div className="letters-masthead__compact-search">
            <TextField
              ref={searchInputRef}
              type="search"
              variant="search"
              name="letters-q-mobile"
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value)
              }}
              placeholder={t("chat.search")}
              aria-label={t("chat.search")}
              autoComplete="off"
            />
            <Button
              variant="ghostIcon"
              type="button"
              className="letters-masthead__icon-btn"
              aria-label={t("common.close")}
              title={t("common.close")}
              onClick={() => {
                onSearchChange("")
                onSearchExpandedChange?.(false)
              }}
            >
              ×
            </Button>
          </div>
        ) : (
          <>
            <div className="letters-masthead__compact-lead">
              <h1 className="letters-masthead__wordmark" translate="no">
                {t("appName")}
              </h1>
              <p className="letters-masthead__dateline">{dateLine}</p>
            </div>
            <div className="letters-masthead__compact-actions">
              <Button
                variant="ghostIcon"
                type="button"
                className="letters-masthead__icon-btn"
                aria-label={t("chat.search")}
                title={t("chat.search")}
                onClick={() => {
                  onSearchExpandedChange?.(true)
                }}
              >
                <SearchIcon />
              </Button>
              <Button
                variant="ghostIcon"
                type="button"
                className="letters-masthead__icon-btn"
                aria-label={t("letters.deskSheetTitle")}
                title={t("letters.deskSheetTitle")}
                onClick={() => {
                  onOpenDesk?.()
                }}
              >
                <MenuIcon />
              </Button>
            </div>
          </>
        )}
      </header>
    )
  }

  return (
    <header
      className={`letters-masthead${chromeHidden ? " letters-masthead--chrome-hidden" : ""}`.trim()}
      role="banner"
      aria-label={t("letters.mastheadAria")}
    >
      <div className="letters-masthead__lead">
        <div className="letters-masthead__brandmark">
          <h1 className="letters-masthead__wordmark" translate="no">
            {t("appName")}
          </h1>
        </div>
        <p className="letters-masthead__dateline">{dateLine}</p>
      </div>
      <div className="letters-masthead__trail">
        <div className="letters-masthead__trail-cluster">
          {showParentShellNav ? (
            <nav className="letters-masthead__shell-nav" aria-label={t("letters.appNavAria")}>
              <button
                type="button"
                className={shellTab === "chats" ? "letters-nav-pill is-active" : "letters-nav-pill"}
                onClick={() => {
                  onShellTab("chats")
                }}
                aria-current={shellTab === "chats" ? "page" : undefined}
              >
                {t("chats")}
              </button>
              <button
                type="button"
                className={shellTab === "settings" ? "letters-nav-pill is-active" : "letters-nav-pill"}
                onClick={() => {
                  onShellTab("settings")
                }}
                aria-current={shellTab === "settings" ? "page" : undefined}
              >
                {t("settings")}
              </button>
              <button
                type="button"
                className={shellTab === "requests" ? "letters-nav-pill is-active" : "letters-nav-pill"}
                onClick={() => {
                  onShellTab("requests")
                }}
                aria-current={shellTab === "requests" ? "page" : undefined}
              >
                {t("requestsTab")}
              </button>
            </nav>
          ) : null}
          {showParentShellNav && chatsChrome ? (
            <span className="letters-masthead__sep" aria-hidden>
              ·
            </span>
          ) : null}
          {chatsChrome ? (
            <nav className="letters-masthead__nav" aria-label={t("letters.navAria")}>
              {(["letters", "drafts", "returned"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={correspondenceTab === k ? "letters-nav-pill is-active" : "letters-nav-pill"}
                  onClick={() => {
                    onCorrespondenceTab(k)
                  }}
                  aria-current={correspondenceTab === k ? "page" : undefined}
                >
                  {t(`letters.tab.${k}`)}
                </button>
              ))}
            </nav>
          ) : null}
          {chatsChrome ? (
            <>
              <span className="letters-masthead__sep" aria-hidden>
                ·
              </span>
              <div className="letters-masthead__search">
                <TextField
                  type="search"
                  variant="search"
                  name="letters-q"
                  value={search}
                  onChange={(e) => {
                    onSearchChange(e.target.value)
                  }}
                  placeholder={t("chat.search")}
                  aria-label={t("chat.search")}
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                className="letters-masthead__write"
                onClick={onWrite}
                aria-label={t("letters.write")}
                title={t("letters.write")}
              >
                {t("letters.write")}
              </button>
            </>
          ) : null}
        </div>
        <div className="letters-masthead__tools">
          {showDayMailButton && chatsChrome ? (
            <Button
              variant="ghostIcon"
              type="button"
              className="letters-masthead__day-mail-btn"
              aria-label={t("letters.dayMailAria")}
              title={t("letters.dayMailAria")}
              onClick={() => {
                onOpenDayMail?.()
              }}
            >
              ☙
            </Button>
          ) : null}
          <div className="app-mode-toggle" role="group" aria-label={t("mode.headerToggle")}>
            <button
              type="button"
              className={appMode === "child" ? "app-mode-toggle__btn is-active" : "app-mode-toggle__btn"}
              onClick={() => {
                onAppMode("child")
              }}
              aria-pressed={appMode === "child"}
              aria-label={t("mode.child")}
              title={t("mode.child")}
            >
              <span className="app-mode-toggle__ic" aria-hidden>
                <ChildModeIcon />
              </span>
            </button>
            <button
              type="button"
              className={appMode === "parent" ? "app-mode-toggle__btn is-active" : "app-mode-toggle__btn"}
              onClick={() => {
                onAppMode("parent")
              }}
              aria-pressed={appMode === "parent"}
              aria-label={t("mode.parent")}
              title={t("mode.parent")}
            >
              <span className="app-mode-toggle__ic" aria-hidden>
                <ParentModeIcon />
              </span>
            </button>
          </div>
          <div className="app-mode-toggle" role="group" aria-label={t("theme.label")}>
            {THEME_TOGGLES.map(({ pref, Icon }) => {
              const active = theme === pref
              return (
                <button
                  key={pref}
                  type="button"
                  className={active ? "app-mode-toggle__btn is-active" : "app-mode-toggle__btn"}
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
          <Button
            variant="ghostIcon"
            type="button"
            className="letters-masthead__signout"
            aria-label={t("signOut")}
            title={t("signOut")}
            onClick={() => {
              void onSignOut()
            }}
          >
            <SignOutIcon />
          </Button>
        </div>
      </div>
    </header>
  )
}
