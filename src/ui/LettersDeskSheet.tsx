import { type ComponentType, type SVGProps, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import type { Dialog } from "telegram/tl/custom/dialog"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"
import { useSheetDragDismiss } from "../hooks/useSheetDragDismiss"
import { useTheme } from "../context/ThemeContext"
import type { AppMode } from "../parental/types"
import type { ThemePreference } from "../theme/storage"
import { BackIcon } from "./BackIcon"
import {
  DeskContinueIcon,
  DeskModeRowIcon,
  DeskRequestsIcon,
  DeskSettingsIcon,
  DeskThemeRowIcon,
} from "./DeskSheetIcons"
import { ChildModeIcon, ParentModeIcon } from "./ModeToggleIcons"
import { SignOutIcon } from "./SignOutIcon"
import { DarkThemeIcon, LightThemeIcon, SystemThemeIcon } from "./ThemeToggleIcons"
import type { CoReadingBookmark } from "../util/lettersRitualsStorage"
import { getDialogDraftDate, getDialogDraftExcerpt } from "../util/dialogDraft"
import { dialogHasDraft } from "../util/correspondenceFilter"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"
import { getPeerInfo } from "../telegram/dialogUtils"
import { RequestsView } from "./RequestsView"
import { SettingsView } from "./SettingsView"

const THEME_TOGGLES: {
  pref: ThemePreference
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { pref: "light", Icon: LightThemeIcon },
  { pref: "system", Icon: SystemThemeIcon },
  { pref: "dark", Icon: DarkThemeIcon },
]

type DeskPage = "main" | "settings" | "requests"

type Props = {
  open: boolean
  onClose: () => void
  appMode: AppMode
  onAppMode: (m: AppMode) => void
  showParentRows: boolean
  pendingRequestCount: number
  dialogs: Dialog[]
  canEditSettings: boolean
  onRequestPin: () => void
  onSignOut: () => void
  onDraftSelect?: (d: Dialog) => void
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
  dialogs,
  canEditSettings,
  onRequestPin,
  onSignOut,
  onDraftSelect,
  coReadingBookmarks = [],
  onCoReadingNavigate,
}: Props) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const backdropRef = useRef<HTMLDivElement>(null)
  const [deskPage, setDeskPage] = useState<DeskPage>("main")

  const draftDialogs = useMemo(() => {
    return dialogs
      .filter(dialogHasDraft)
      .sort((a, b) => getDialogDraftDate(b) - getDialogDraftDate(a))
  }, [dialogs])

  useEffect(() => {
    if (!open) {
      setDeskPage("main")
    }
  }, [open])

  useEffect(() => {
    if (!showParentRows && (deskPage === "settings" || deskPage === "requests")) {
      setDeskPage("main")
    }
  }, [showParentRows, deskPage])

  const dismissDesk = useCallback(() => {
    if (deskPage !== "main") {
      setDeskPage("main")
      return
    }
    onClose()
  }, [deskPage, onClose])

  const panelRef = useDismissibleLayer(open, dismissDesk)
  useSheetDragDismiss(panelRef, backdropRef, { open, onDismiss: dismissDesk })

  const subpageTitle =
    deskPage === "settings" ? t("settings") : deskPage === "requests" ? t("requestsTab") : null
  const deskTitle = t("letters.deskSheetTitle")
  const subpageAriaLabel =
    subpageTitle != null ? `${deskTitle} > ${subpageTitle}` : t("letters.deskSheetAria")

  const node = (
    <>
      <div
        ref={backdropRef}
        className={`letters-desk-sheet-backdrop${open ? " letters-desk-sheet-backdrop--open" : ""}`}
        role="presentation"
        onClick={dismissDesk}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            dismissDesk()
          }
        }}
      />
      <div
        ref={panelRef}
        className={`letters-desk-sheet${open ? " letters-desk-sheet--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={subpageAriaLabel}
        inert={!open}
      >
        <div className="letters-desk-sheet__grip" aria-hidden />
        {deskPage !== "main" ? (
          <>
            <h2
              className="letters-desk-sheet__title letters-desk-sheet__breadcrumb"
              aria-label={subpageAriaLabel}
            >
              <span>{deskTitle}</span>
              <span className="letters-desk-sheet__breadcrumb-sep" aria-hidden>
                {" "}
                &gt;{" "}
              </span>
              <span>{subpageTitle}</span>
            </h2>
            <div className="letters-desk-sheet__subpage-bar">
              <button
                type="button"
                className="letters-desk-sheet__back"
                onClick={() => {
                  setDeskPage("main")
                }}
              >
                <BackIcon />
                {t("common.back")}
              </button>
            </div>
            <div className="letters-desk-sheet__subpage">
              {deskPage === "settings" ? (
                <SettingsView canEdit={canEditSettings} onRequestPin={onRequestPin} />
              ) : (
                <RequestsView dialogs={dialogs} />
              )}
            </div>
          </>
        ) : (
          <>
            <section className="letters-desk-sheet__drafts" aria-labelledby="letters-desk-drafts-h">
              <h2 className="letters-desk-sheet__title" id="letters-desk-drafts-h">
                {t("letters.deskUnfinishedTitle")}
              </h2>
              {draftDialogs.length > 0 ? (
                <ul className="letters-desk-sheet__draft-list" role="list">
                  {draftDialogs.map((d, i) => {
                    const { key, name } = getPeerInfo(d)
                    const excerpt = getDialogDraftExcerpt(d, t)
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          className={
                            i === 0
                              ? "letters-desk-sheet__draft-card letters-desk-sheet__draft-card--tilt"
                              : "letters-desk-sheet__draft-card"
                          }
                          onClick={() => {
                            onDraftSelect?.(d)
                            onClose()
                          }}
                        >
                          <span className="letters-desk-sheet__draft-to">
                            {t("letters.deskDraftTo", { name })}
                          </span>
                          <p className="letters-desk-sheet__draft-excerpt">«{excerpt}»</p>
                          <span className="letters-desk-sheet__draft-continue">
                            {t("letters.continueLetter")}
                            <DeskContinueIcon width={12} height={12} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="letters-desk-sheet__drafts-empty muted small">
                  {t("letters.draftsEmptyTitle")}
                </p>
              )}
            </section>

            <section className="letters-desk-sheet__household" aria-labelledby="letters-desk-household-h">
              <h2 className="letters-desk-sheet__title" id="letters-desk-household-h">
                {t("letters.deskHouseholdTitle")}
              </h2>

              <div className="letters-desk-sheet__rows">
                <div className="letters-desk-sheet__row">
                  <span className="letters-desk-sheet__row-label">
                    <span className="letters-desk-sheet__row-ic" aria-hidden>
                      <DeskThemeRowIcon />
                    </span>
                    {t("theme.label")}
                  </span>
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
                <p className="letters-desk-sheet__row-hint">{t("theme.hint")}</p>

                <div className="letters-desk-sheet__row">
                  <span className="letters-desk-sheet__row-label">
                    <span className="letters-desk-sheet__row-ic" aria-hidden>
                      <DeskModeRowIcon />
                    </span>
                    {t("mode.label")}
                  </span>
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
                <p className="letters-desk-sheet__row-hint">{t("mode.deskHint")}</p>

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
                      setDeskPage("requests")
                    }}
                  >
                    <span className="letters-desk-sheet__action-label">
                      <span className="letters-desk-sheet__row-ic" aria-hidden>
                        <DeskRequestsIcon />
                      </span>
                      <span>{t("requestsTab")}</span>
                    </span>
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

                {showParentRows ? (
                  <button
                    type="button"
                    className="letters-desk-sheet__action"
                    onClick={() => {
                      setDeskPage("settings")
                    }}
                  >
                    <span className="letters-desk-sheet__action-label">
                      <span className="letters-desk-sheet__row-ic" aria-hidden>
                        <DeskSettingsIcon />
                      </span>
                      <span>{t("settings")}</span>
                    </span>
                    <span className="letters-desk-sheet__action-chev" aria-hidden>
                      ›
                    </span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="letters-desk-sheet__action letters-desk-sheet__action--danger"
                  onClick={() => {
                    onSignOut()
                    onClose()
                  }}
                >
                  <span className="letters-desk-sheet__action-label">
                    <span className="letters-desk-sheet__signout-ic" aria-hidden>
                      <SignOutIcon />
                    </span>
                    <span>{t("signOut")}</span>
                  </span>
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  )

  return createPortal(node, getLettersPortalRoot())
}
