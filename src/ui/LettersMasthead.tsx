import { type ComponentType, type SVGProps } from "react"
import { useTranslation } from "react-i18next"
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
}: Props) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const chatsChrome = shellTab === "chats"

  return (
    <header className="letters-masthead" role="banner" aria-label={t("letters.mastheadAria")}>
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
