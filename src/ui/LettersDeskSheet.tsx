import { type ComponentType, type SVGProps, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { useBodyScrollLockAndEscape } from "../hooks/useBodyScrollLockAndEscape"
import { useFocusTrap } from "../hooks/useFocusTrap"
import { useSheetDragDismiss } from "../hooks/useSheetDragDismiss"
import { useTheme } from "../context/ThemeContext"
import type { AppMode } from "../parental/types"
import type { ThemePreference } from "../theme/storage"
import { ChildModeIcon, ParentModeIcon } from "./ModeToggleIcons"
import { SignOutIcon } from "./SignOutIcon"
import { DarkThemeIcon, LightThemeIcon, SystemThemeIcon } from "./ThemeToggleIcons"
import type { CoReadingBookmark } from "../util/lettersRitualsStorage"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"

const THEME_TOGGLES: {
  pref: ThemePreference
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { pref: "light", Icon: LightThemeIcon },
  { pref: "system", Icon: SystemThemeIcon },
  { pref: "dark", Icon: DarkThemeIcon },
]

type Props = {
  open: boolean
  onClose: () => void
  appMode: AppMode
  onAppMode: (m: AppMode) => void
  showParentRows: boolean
  pendingRequestCount: number
  onOpenSettings: () => void
  onOpenRequests: () => void
  onSignOut: () => void
  morningDayMailEnabled?: boolean
  onMorningDayMailEnabled?: (enabled: boolean) => void
  waxSealSendEnabled?: boolean
  onWaxSealSendEnabled?: (enabled: boolean) => void
  eveningSummaryPreciseEnabled?: boolean
  onEveningSummaryPreciseEnabled?: (enabled: boolean) => void
  coReadingBookmarks?: CoReadingBookmark[]
  onCoReadingNavigate?: (bookmark: CoReadingBookmark) => void
}

export function LettersDeskSheet({
  open,
  onClose,
  appMode,
  onAppMode,
  showParentRows,
  pendingRequestCount,
  onOpenSettings,
  onOpenRequests,
  onSignOut,
  morningDayMailEnabled = true,
  onMorningDayMailEnabled,
  waxSealSendEnabled = false,
  onWaxSealSendEnabled,
  eveningSummaryPreciseEnabled = false,
  onEveningSummaryPreciseEnabled,
  coReadingBookmarks = [],
  onCoReadingNavigate,
}: Props) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, open)
  useBodyScrollLockAndEscape(open, onClose)
  useSheetDragDismiss(panelRef, backdropRef, { open, onDismiss: onClose })

  const node = (
    <>
      <div
        ref={backdropRef}
        className={`letters-desk-sheet-backdrop${open ? " letters-desk-sheet-backdrop--open" : ""}`}
        role="presentation"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose()
          }
        }}
      />
      <div
        ref={panelRef}
        className={`letters-desk-sheet${open ? " letters-desk-sheet--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("letters.deskSheetAria")}
        inert={!open}
      >
        <div className="letters-desk-sheet__grip" aria-hidden />
        <h2 className="letters-desk-sheet__title">{t("letters.deskSheetTitle")}</h2>

        <div className="letters-desk-sheet__rows">
          <div className="letters-desk-sheet__row">
            <span className="letters-desk-sheet__row-label">{t("theme.label")}</span>
            <div className="letters-desk-sheet__seg" role="group" aria-label={t("theme.label")}>
              {THEME_TOGGLES.map(({ pref, Icon }) => {
                const active = theme === pref
                return (
                  <button
                    key={pref}
                    type="button"
                    className={active ? "letters-desk-sheet__seg-btn is-active" : "letters-desk-sheet__seg-btn"}
                    onClick={() => {
                      setTheme(pref)
                    }}
                    aria-pressed={active}
                    aria-label={t(`theme.${pref}`)}
                    title={t(`theme.${pref}`)}
                  >
                    <Icon aria-hidden width={16} height={16} />
                  </button>
                )
              })}
            </div>
          </div>
          <p className="letters-desk-sheet__theme-hint">{t("theme.hint")}</p>

          <div className="letters-desk-sheet__row">
            <span className="letters-desk-sheet__row-label">{t("mode.label")}</span>
            <div className="app-mode-toggle letters-desk-sheet__mode" role="group" aria-label={t("mode.headerToggle")}>
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
          </div>

          <div className="letters-desk-sheet__row">
            <span className="letters-desk-sheet__row-label">{t("letters.deskMorningMail")}</span>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={morningDayMailEnabled}
              aria-label={t("letters.deskMorningMail")}
              onClick={() => {
                onMorningDayMailEnabled?.(!morningDayMailEnabled)
              }}
            >
              <span className="switch__track" aria-hidden>
                <span className="switch__thumb" />
              </span>
            </button>
          </div>

          {appMode === "parent" ? (
            <div className="letters-desk-sheet__row">
              <span className="letters-desk-sheet__row-label">{t("letters.deskWaxSeal")}</span>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={waxSealSendEnabled}
                aria-label={t("letters.deskWaxSeal")}
                onClick={() => {
                  onWaxSealSendEnabled?.(!waxSealSendEnabled)
                }}
              >
                <span className="switch__track" aria-hidden>
                  <span className="switch__thumb" />
                </span>
              </button>
            </div>
          ) : null}

          {appMode === "parent" ? (
            <div className="letters-desk-sheet__row">
              <span className="letters-desk-sheet__row-label">{t("letters.deskEveningPrecise")}</span>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={eveningSummaryPreciseEnabled}
                aria-label={t("letters.deskEveningPrecise")}
                onClick={() => {
                  onEveningSummaryPreciseEnabled?.(!eveningSummaryPreciseEnabled)
                }}
              >
                <span className="switch__track" aria-hidden>
                  <span className="switch__thumb" />
                </span>
              </button>
            </div>
          ) : null}

          {showParentRows ? (
            <div className="letters-desk-sheet__bookmarks">
              <h3 className="letters-desk-sheet__bookmarks-title">{t("letters.coReadingDeskTitle")}</h3>
              {coReadingBookmarks.length > 0 ? (
                <ul className="letters-desk-sheet__bookmarks-list" role="list">
                  {coReadingBookmarks.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="letters-desk-sheet__bookmark"
                        onClick={() => {
                          onCoReadingNavigate?.(b)
                          onClose()
                        }}
                      >
                        <span className="letters-desk-sheet__bookmark-chat">{b.chatTitle}</span>
                        <span className="letters-desk-sheet__bookmark-preview muted small">
                          {b.preview}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="letters-desk-sheet__bookmarks-hint" role="status">
                {t("letters.coReadingDeviceOnlyHint")}
              </p>
            </div>
          ) : null}

          {showParentRows ? (
            <button
              type="button"
              className="letters-desk-sheet__action"
              onClick={() => {
                onOpenRequests()
                onClose()
              }}
            >
              <span>{t("requestsTab")}</span>
              {pendingRequestCount > 0 ? (
                <span className="letters-desk-sheet__action-meta">
                  {t("letters.deskPendingRequests", { count: pendingRequestCount })}
                </span>
              ) : (
                <span className="letters-desk-sheet__action-chev" aria-hidden>
                  ›
                </span>
              )}
            </button>
          ) : null}

          <button
            type="button"
            className="letters-desk-sheet__action"
            onClick={() => {
              onOpenSettings()
              onClose()
            }}
          >
            <span>{t("settings")}</span>
            <span className="letters-desk-sheet__action-chev" aria-hidden>
              ›
            </span>
          </button>

          <button
            type="button"
            className="letters-desk-sheet__action letters-desk-sheet__action--danger"
            onClick={() => {
              onSignOut()
              onClose()
            }}
          >
            <span className="letters-desk-sheet__signout-ic" aria-hidden>
              <SignOutIcon />
            </span>
            <span>{t("signOut")}</span>
          </button>
        </div>
      </div>
    </>
  )

  return createPortal(node, getLettersPortalRoot())
}
