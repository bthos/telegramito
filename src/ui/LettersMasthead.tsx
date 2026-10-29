import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useHardwareBackLayer } from "../hooks/useHardwareBack"
import type { CorrespondenceTab } from "../util/correspondenceFilter"
import { Button, TextField } from "./ds"
import { ShellCirclesIcon, ShellCloseIcon, ShellDayMailIcon, ShellDeskIcon, ShellSearchIcon } from "./ShellIcons"

type Props = {
  dateLine: string
  correspondenceTab: CorrespondenceTab
  onCorrespondenceTab: (t: CorrespondenceTab) => void
  search: string
  onSearchChange: (value: string) => void
  onWrite: () => void
  /** ≤700px: one-row compact chrome; shell nav + tools move to desk sheet. */
  compact?: boolean
  /** Compact: search icon expanded to full-width field. */
  searchExpanded?: boolean
  onSearchExpandedChange?: (open: boolean) => void
  /** Wider viewports: opens the desk sheet (theme, rituals, co-reading). */
  onOpenDesk?: () => void
  /** Tablet band: day-mail icon opens day-mail slide-over (not shown when `compact`). */
  showDayMailButton?: boolean
  onOpenDayMail?: () => void
  /** Tablet / desktop: Circles (stories) icon opens slide-over (not shown when `compact`). */
  showCirclesButton?: boolean
  onOpenCircles?: () => void
  /** Scroll-hide on list / day-mail screens. */
  chromeHidden?: boolean
}

export function LettersMasthead({
  dateLine,
  correspondenceTab,
  onCorrespondenceTab,
  search,
  onSearchChange,
  onWrite,
  compact = false,
  searchExpanded = false,
  onSearchExpandedChange,
  onOpenDesk,
  showDayMailButton = false,
  onOpenDayMail,
  showCirclesButton = false,
  onOpenCircles,
  chromeHidden = false,
}: Props) {
  const { t } = useTranslation()
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
              <ShellCloseIcon />
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
                <ShellSearchIcon width="1.25rem" height="1.25rem" />
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
        </div>
        <div className="letters-masthead__tools">
          <Button
            variant="ghostIcon"
            type="button"
            className="letters-masthead__desk-btn"
            aria-label={t("letters.deskSheetTitle")}
            title={t("letters.deskSheetTitle")}
            onClick={() => {
              onOpenDesk?.()
            }}
          >
            <ShellDeskIcon width="1.35rem" height="1.35rem" />
          </Button>
          {showDayMailButton ? (
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
              <ShellDayMailIcon width="1.35rem" height="1.35rem" />
            </Button>
          ) : null}
          {showCirclesButton ? (
            <Button
              variant="ghostIcon"
              type="button"
              className="letters-masthead__circles-btn"
              aria-label={t("letters.mobileTab.circles")}
              title={t("letters.mobileTab.circles")}
              onClick={() => {
                onOpenCircles?.()
              }}
            >
              <ShellCirclesIcon width="1.35rem" height="1.35rem" />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
