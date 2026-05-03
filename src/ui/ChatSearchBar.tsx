import { Api } from "telegram"
import {
  useEffect,
  useId,
  useRef,
} from "react"
import { useTranslation } from "react-i18next"
import { Button, TextField } from "./ds"
import {
  SearchResultRow,
  searchResultSenderLabel,
} from "./SearchResultRow"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseCrossIcon,
} from "./ChatChromeIcons"
import { useFocusTrap } from "../hooks/useFocusTrap"

export type ChatSearchBarProps = {
  query: string
  onQueryChange: (q: string) => void
  onClose: () => void
  results: Api.Message[]
  currentIndex: number
  loading: boolean
  onNavigate: (direction: "up" | "down") => void
  onSelect: (msg: Api.Message) => void
  peerDisplayName: string
  forumDisabled?: boolean
}

/**
 * In-chat search controls + results list (UX-14). Focus trap while mounted.
 */
export function ChatSearchBar({
  query,
  onQueryChange,
  onClose,
  results,
  currentIndex,
  loading,
  onNavigate,
  onSelect,
  peerDisplayName,
  forumDisabled,
}: ChatSearchBarProps) {
  const { t, i18n } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  useFocusTrap(rootRef, true)

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if (results.length === 0 || forumDisabled) {
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        onNavigate("down")
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        onNavigate("up")
      } else if (e.key === "Enter") {
        e.preventDefault()
        const m = results[currentIndex]
        if (m != null) {
          onSelect(m)
        }
      }
    }
    el.addEventListener("keydown", onKey)
    return () => {
      el.removeEventListener("keydown", onKey)
    }
  }, [results, currentIndex, onNavigate, onSelect, onClose, forumDisabled])

  const q = query.trim()
  const total = results.length
  const showShortHint = q.length < 2 && !forumDisabled
  const showEmpty =
    q.length >= 2 && !loading && total === 0 && !forumDisabled

  return (
    <div ref={rootRef} className="chat-search-bar" role="search">
      <div className="chat-search-bar__controls">
        <TextField
          ref={inputRef}
          variant="search"
          type="search"
          role="searchbox"
          aria-label={t("chat.searchMessagesAria")}
          aria-controls={total > 0 ? listboxId : undefined}
          aria-autocomplete="list"
          placeholder={t("chat.searchPlaceholder")}
          value={query}
          disabled={Boolean(forumDisabled)}
          title={forumDisabled ? t("chat.searchForumDisabled") : undefined}
          onChange={(e) => {
            onQueryChange(e.target.value)
          }}
        />
        <span className="chat-search-bar__count" aria-live="polite">
          {loading ? (
            <span className="chat-search-bar__spinner" aria-hidden />
          ) : total > 0 ? (
            t("chat.searchResultCount", {
              n: Math.min(currentIndex + 1, total),
              m: total,
            })
          ) : (
            "\u00a0"
          )}
        </span>
        <Button
          type="button"
          variant="ghostIcon"
          size="sm"
          aria-label={t("chat.searchPrevResult")}
          disabled={forumDisabled || total === 0}
          onClick={() => {
            onNavigate("up")
          }}
        >
          <ChevronUpIcon className="chat-search-bar__ctrl-ico" />
        </Button>
        <Button
          type="button"
          variant="ghostIcon"
          size="sm"
          aria-label={t("chat.searchNextResult")}
          disabled={forumDisabled || total === 0}
          onClick={() => {
            onNavigate("down")
          }}
        >
          <ChevronDownIcon className="chat-search-bar__ctrl-ico" />
        </Button>
        <Button
          type="button"
          variant="ghostIcon"
          size="sm"
          aria-label={t("chat.cancel")}
          onClick={onClose}
        >
          <CloseCrossIcon className="chat-search-bar__ctrl-ico" />
        </Button>
      </div>
      <div className="chat-search-bar__panel">
        {forumDisabled ? (
          <p className="small muted chat-search-bar__hint" role="status">
            {t("chat.searchForumDisabled")}
          </p>
        ) : null}
        {!forumDisabled && showShortHint ? (
          <p className="small muted chat-search-bar__hint" role="status">
            {t("chat.searchTypeHint")}
          </p>
        ) : null}
        {!forumDisabled && showEmpty ? (
          <p className="small muted chat-search-bar__hint" role="status">
            {t("chat.searchNoHitsForQuery", { query: q })}
          </p>
        ) : null}
        {!forumDisabled && total > 0 ? (
          <ul
            id={listboxId}
            className="chat-search-bar__hits"
            role="listbox"
            aria-label={t("chat.searchResultsAria")}
          >
            {results.map((m, i) => (
              <SearchResultRow
                key={m.id ?? i}
                message={m}
                query={query}
                senderLabel={searchResultSenderLabel(m, peerDisplayName, t)}
                locale={i18n.language}
                noTextLabel={t("chat.searchHitNoText")}
                optionProps={{
                  role: "option",
                  id: `${listboxId}-opt-${i}`,
                  "aria-selected": i === currentIndex,
                  tabIndex: i === currentIndex ? 0 : -1,
                  onClick: () => {
                    onSelect(m)
                  },
                }}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
