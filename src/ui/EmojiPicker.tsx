import { createPortal } from "react-dom"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { EMOJI_GROUPS, type EmojiItem } from "../data/emojiGroups"
import { useFocusTrap } from "../hooks/useFocusTrap"
import { EmojiOutlineIcon } from "./ChatChromeIcons"
import { loadRecentEmojis, saveRecentEmoji } from "../util/recentEmojis"

export type EmojiPickerPanelProps = {
  open: boolean
  onClose: () => void
  onSelect: (emoji: string) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  isMobile: boolean
}

function filterEmoji(
  query: string,
  groups: typeof EMOJI_GROUPS,
): EmojiItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: EmojiItem[] = []
  for (const g of groups) {
    for (const e of g.emojis) {
      if (e.name.toLowerCase().includes(q)) {
        out.push(e)
      }
    }
  }
  return out
}

export function EmojiPickerPanel({
  open,
  onClose,
  onSelect,
  triggerRef,
  isMobile,
}: EmojiPickerPanelProps) {
  const { t } = useTranslation()
  const dialogId = useId()
  const searchId = `${dialogId}-search`
  const panelRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [recent, setRecent] = useState<string[]>(() => loadRecentEmojis())
  const [desktopBox, setDesktopBox] = useState<{
    left: number
    top: number
  } | null>(null)

  useFocusTrap(panelRef, open)

  useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setRecent(loadRecentEmojis())
      return
    }
    setRecent(loadRecentEmojis())
  }, [open])

  useLayoutEffect(() => {
    if (!open || isMobile) {
      setDesktopBox(null)
      return
    }
    const update = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const panelW = 320
      const panelH = 360
      const gap = 8
      let left = rect.left + rect.width / 2 - panelW / 2
      left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8))
      const top = rect.top - panelH - gap
      const safeTop = Math.max(8, top)
      setDesktopBox({ left, top: safeTop })
    }
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, isMobile, triggerRef])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const panel = panelRef.current
      const trig = triggerRef.current
      const t = e.target
      if (!(t instanceof Node)) return
      if (panel?.contains(t)) return
      if (trig?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose, triggerRef])

  const searchActive = searchQuery.trim().length > 0
  const searchResults = useMemo(
    () => filterEmoji(searchQuery, EMOJI_GROUPS),
    [searchQuery],
  )

  const scrollToCategory = useCallback((slug: string) => {
    const root = scrollRef.current
    if (!root) return
    const sec = root.querySelector(`#emoji-sec-${CSS.escape(slug)}`)
    if (sec instanceof HTMLElement) {
      sec.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  const pick = useCallback(
    (emoji: string) => {
      const next = saveRecentEmoji(emoji, loadRecentEmojis())
      setRecent(next)
      onSelect(emoji)
    },
    [onSelect],
  )

  if (!open) {
    return null
  }

  const searchInput = (
    <input
      id={searchId}
      type="search"
      className="emoji-picker__search input"
      placeholder={t("chat.emojiPickerSearchPlaceholder")}
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value)
      }}
      autoComplete="off"
      spellCheck={false}
      aria-label={t("chat.emojiPickerSearchAria")}
    />
  )

  const recentBlock =
    !searchActive ? (
      <div className="emoji-picker__recent-wrap">
        <div className="emoji-picker__recent-row" role="list">
          {recent.length === 0 ? (
            <span className="emoji-picker__recent-empty muted">
              {t("chat.emojiPickerNoRecent")}
            </span>
          ) : (
            recent.map((em) => (
              <button
                key={em}
                type="button"
                className="emoji-picker__emoji-btn"
                role="listitem"
                title={em}
                aria-label={em}
                onClick={() => {
                  pick(em)
                }}
              >
                {em}
              </button>
            ))
          )}
        </div>
      </div>
    ) : null

  const tabsBlock =
    !searchActive ? (
      <div
        className="emoji-picker__tabs"
        role="tablist"
        aria-label={t("chat.emojiPickerCategoriesAria")}
      >
        {EMOJI_GROUPS.map((g) => (
          <button
            key={g.slug}
            type="button"
            role="tab"
            className="emoji-picker__tab"
            aria-selected={false}
            tabIndex={0}
            title={g.name}
            onClick={() => {
              scrollToCategory(g.slug)
            }}
          >
            <span className="emoji-picker__tab-icon" aria-hidden>
              {g.iconEmoji}
            </span>
            <span className="sr-only">{g.name}</span>
          </button>
        ))}
      </div>
    ) : null

  const scrollBlock = (
    <div ref={scrollRef} className="emoji-picker__scroll">
      {searchActive ? (
        <div className="emoji-picker__grid" role="list">
          {searchResults.map((e) => (
            <button
              key={`${e.slug}-${e.emoji}`}
              type="button"
              className="emoji-picker__emoji-btn emoji-picker__emoji-btn--cell"
              role="listitem"
              title={e.name}
              aria-label={e.name}
              onClick={() => {
                pick(e.emoji)
              }}
            >
              {e.emoji}
            </button>
          ))}
        </div>
      ) : (
        EMOJI_GROUPS.map((g) => (
          <section
            key={g.slug}
            id={`emoji-sec-${CSS.escape(g.slug)}`}
            className="emoji-picker__section"
            aria-label={g.name}
          >
            <h3 className="emoji-picker__sec-head">{g.name}</h3>
            <div className="emoji-picker__grid" role="list">
              {g.emojis.map((e) => (
                <button
                  key={e.slug}
                  type="button"
                  className="emoji-picker__emoji-btn emoji-picker__emoji-btn--cell"
                  role="listitem"
                  title={e.name}
                  aria-label={e.name}
                  onClick={() => {
                    pick(e.emoji)
                  }}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )

  const sheetBody = (
    <div
      className={
        isMobile
          ? "emoji-picker__shell emoji-picker__shell--mobile"
          : "emoji-picker__shell"
      }
    >
      {isMobile ? (
        <>
          {tabsBlock}
          {searchInput}
          {recentBlock}
          {scrollBlock}
        </>
      ) : (
        <>
          {searchInput}
          {recentBlock}
          {tabsBlock}
          {scrollBlock}
        </>
      )}
    </div>
  )

  const panel = isMobile ? (
    <div
      ref={panelRef}
      className="emoji-picker emoji-picker--sheet"
      role="dialog"
      aria-modal="true"
      aria-label={t("chat.emojiPickerDialogLabel")}
      id={dialogId}
    >
      <div className="emoji-picker__sheet-handle" aria-hidden />
      <div className="emoji-picker__sheet-inner">{sheetBody}</div>
    </div>
  ) : (
    <div
      ref={panelRef}
      className="emoji-picker emoji-picker--popover"
      role="dialog"
      aria-modal="true"
      aria-label={t("chat.emojiPickerDialogLabel")}
      id={dialogId}
      style={
        desktopBox
          ? {
              left: desktopBox.left,
              top: desktopBox.top,
            }
          : { visibility: "hidden" }
      }
    >
      <div className="emoji-picker__popover-inner emoji-picker__popover-inner--desktop">
        {sheetBody}
      </div>
    </div>
  )

  return createPortal(
    <>
      {isMobile ? (
        <button
          type="button"
          className="emoji-picker__backdrop"
          aria-label={t("chat.emojiPickerCloseBackdropAria")}
          onClick={onClose}
        />
      ) : null}
      {panel}
    </>,
    document.body,
  )
}

export type EmojiPickerButtonProps = {
  disabled?: boolean
  onEmojiSelected: (emoji: string) => void
}

/** Smiley trigger + portal panel; parent handles insertion and textarea focus. */
export function EmojiPickerButton({
  disabled,
  onEmojiSelected,
}: EmojiPickerButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const apply = () => {
      setIsMobile(mq.matches)
    }
    apply()
    mq.addEventListener("change", apply)
    return () => {
      mq.removeEventListener("change", apply)
    }
  }, [])

  const onClose = useCallback(() => {
    setOpen(false)
    queueMicrotask(() => triggerRef.current?.focus())
  }, [])

  const handlePick = useCallback(
    (emoji: string) => {
      onEmojiSelected(emoji)
      setOpen(false)
    },
    [onEmojiSelected],
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn-icon emoji-picker__trigger"
        disabled={disabled}
        aria-label={t("chat.emojiPickerTriggerAria")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((v) => !v)
        }}
      >
        <EmojiOutlineIcon className="emoji-picker__trigger-ico" aria-hidden />
      </button>
      <EmojiPickerPanel
        open={open}
        onClose={onClose}
        onSelect={handlePick}
        triggerRef={triggerRef}
        isMobile={isMobile}
      />
    </>
  )
}
