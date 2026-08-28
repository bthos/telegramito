import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { Api } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import type { TelegramClient } from "teleproto"
import type { ParentalSettings } from "../parental/types"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"
import {
  defaultGroupTitleFromRecipients,
  filterUsersForNewChat,
  type NewChatRecipient,
} from "../telegram/newChatRecipients"
import { openChatForRecipients } from "../telegram/openNewChat"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"
import { Button, TextField } from "./ds"

type Props = {
  open: boolean
  onClose: () => void
  client: TelegramClient | null
  dialogs: Dialog[]
  refreshDialogs: () => Promise<void>
  settings: ParentalSettings
  deniedPeerIds: ReadonlySet<string>
  onOpenChat: (dialog: Dialog) => void
}

export function LettersNewChatSheet({
  open,
  onClose,
  client,
  dialogs,
  refreshDialogs,
  settings,
  deniedPeerIds,
  onOpenChat,
}: Props) {
  const { t } = useTranslation()
  const panelRef = useDismissibleLayer(open, onClose)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<NewChatRecipient[]>([])
  const [groupTitle, setGroupTitle] = useState("")
  const [results, setResults] = useState<NewChatRecipient[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setSelected([])
      setGroupTitle("")
      setResults([])
      setLoading(false)
      setSubmitting(false)
      setError(null)
    }
  }, [open])

  const selectedIds = useMemo(() => new Set(selected.map((r) => r.id)), [selected])

  const searchRecipients = useCallback(
    async (q: string) => {
      if (!client) {
        setResults([])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const trimmed = q.trim()
        let users: Api.TypeUser[] = []
        if (!trimmed) {
          const res = await client.invoke(new Api.contacts.GetContacts({ hash: 0 as never }))
          if (res.className === "contacts.Contacts") {
            users = res.users
          }
        } else if (trimmed.startsWith("@")) {
          const username = trimmed.slice(1).trim()
          if (username) {
            const resolved = await client.invoke(
              new Api.contacts.ResolveUsername({ username }),
            )
            users = resolved.users
          }
        } else {
          const found = await client.invoke(
            new Api.contacts.Search({ q: trimmed, limit: 25 }),
          )
          users = found.users
        }
        setResults(filterUsersForNewChat(users, settings, deniedPeerIds))
      } catch {
        setResults([])
        setError(t("letters.newChat.error"))
      } finally {
        setLoading(false)
      }
    },
    [client, deniedPeerIds, settings, t],
  )

  useEffect(() => {
    if (!open || !client) {
      return
    }
    const handle = window.setTimeout(() => {
      void searchRecipients(query)
    }, query.trim() ? 220 : 0)
    return () => {
      window.clearTimeout(handle)
    }
  }, [open, client, query, searchRecipients])

  useEffect(() => {
    if (selected.length >= 2 && !groupTitle.trim()) {
      setGroupTitle(defaultGroupTitleFromRecipients(selected))
    }
    if (selected.length < 2 && groupTitle) {
      setGroupTitle("")
    }
  }, [selected, groupTitle])

  const toggleRecipient = (recipient: NewChatRecipient) => {
    setError(null)
    setSelected((prev) => {
      if (prev.some((r) => r.id === recipient.id)) {
        return prev.filter((r) => r.id !== recipient.id)
      }
      return [...prev, recipient]
    })
  }

  const removeRecipient = (id: string) => {
    setSelected((prev) => prev.filter((r) => r.id !== id))
  }

  const canSubmit =
    selected.length > 0 &&
    !submitting &&
    (selected.length === 1 || groupTitle.trim().length > 0)

  const handleSubmit = async () => {
    if (!client || !canSubmit) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const dialog = await openChatForRecipients({
        client,
        dialogs,
        recipients: selected,
        groupTitle: selected.length >= 2 ? groupTitle : undefined,
        refreshDialogs,
      })
      onOpenChat(dialog)
      onClose()
    } catch {
      setError(
        selected.length >= 2
          ? t("letters.newChat.createError")
          : t("letters.newChat.error"),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return null
  }

  const node = (
    <div
      className="letters-new-chat-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        className="letters-new-chat-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("letters.newChat.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="letters-new-chat-sheet__head">
          <h2 className="letters-new-chat-sheet__title">{t("letters.newChat.title")}</h2>
          <Button
            variant="ghostIcon"
            type="button"
            className="letters-new-chat-sheet__close"
            aria-label={t("common.close")}
            title={t("common.close")}
            onClick={onClose}
          >
            ×
          </Button>
        </header>

        <p className="letters-new-chat-sheet__hint muted small">
          {selected.length >= 2
            ? t("letters.newChat.hintGroup")
            : t("letters.newChat.hintSingle")}
        </p>

        {selected.length > 0 ? (
          <div className="letters-new-chat-sheet__chips" aria-label={t("letters.newChat.recipientsLabel")}>
            {selected.map((r) => (
              <button
                key={r.id}
                type="button"
                className="letters-new-chat-chip"
                onClick={() => removeRecipient(r.id)}
                aria-label={t("letters.newChat.removeRecipient", { name: r.name })}
              >
                <span>{r.name}</span>
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="letters-new-chat-sheet__search">
          <TextField
            type="search"
            variant="search"
            name="letters-new-chat-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("letters.newChat.searchPlaceholder")}
            aria-label={t("letters.newChat.searchAria")}
            autoComplete="off"
            autoFocus
          />
        </div>

        {selected.length >= 2 ? (
          <div className="letters-new-chat-sheet__group-title">
            <label className="letters-new-chat-sheet__group-label" htmlFor="letters-new-chat-group-title">
              {t("letters.newChat.groupTitleLabel")}
            </label>
            <TextField
              id="letters-new-chat-group-title"
              name="letters-new-chat-group-title"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder={t("letters.newChat.groupTitlePlaceholder")}
            />
          </div>
        ) : null}

        <div className="letters-new-chat-sheet__results" role="listbox" aria-label={t("letters.newChat.searchAria")}>
          {loading ? (
            <p className="letters-new-chat-sheet__status muted small">{t("letters.newChat.loading")}</p>
          ) : results.length === 0 ? (
            <p className="letters-new-chat-sheet__status muted small">{t("letters.newChat.emptyResults")}</p>
          ) : (
            results.map((r) => {
              const active = selectedIds.has(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? "letters-new-chat-row is-selected" : "letters-new-chat-row"}
                  onClick={() => toggleRecipient(r)}
                >
                  <span className="letters-new-chat-row__name">{r.name}</span>
                  {r.user.username ? (
                    <span className="letters-new-chat-row__meta muted small">@{r.user.username}</span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>

        {error ? <p className="letters-new-chat-sheet__error">{error}</p> : null}

        <footer className="letters-new-chat-sheet__foot">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              void handleSubmit()
            }}
          >
            {selected.length >= 2 ? t("letters.newChat.createGroup") : t("letters.newChat.continue")}
          </Button>
        </footer>
      </div>
    </div>
  )

  return createPortal(node, getLettersPortalRoot())
}
