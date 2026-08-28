import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import type { TelegramClient } from "teleproto"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"
import { parseJoinInviteInput } from "../telegram/joinInviteInput"
import {
  checkInvite,
  joinByInviteHash,
  joinByUsername,
  requestChatJoinWebViewUrl,
  type InvitePreview,
} from "../telegram/joinInvite"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"
import { Button, TextField } from "./ds"

type Props = {
  open: boolean
  onClose: () => void
  client: TelegramClient | null
  refreshDialogs: () => Promise<void>
  /** Called after a successful join so the shell can refresh + select the chat. */
  onJoined: (hint: { username?: string; title?: string }) => void
}

type Stage =
  | { s: "compose" }
  | { s: "lookingUp" }
  | { s: "preview"; preview: InvitePreview }
  | { s: "joining" }
  | { s: "webview"; telegramUrl: string; browserUrl: string | null }
  | { s: "error"; message: string }

export function LettersJoinInviteSheet({
  open,
  onClose,
  client,
  refreshDialogs,
  onJoined,
}: Props) {
  const { t } = useTranslation()
  const panelRef = useDismissibleLayer(open, onClose)
  const [input, setInput] = useState("")
  const [stage, setStage] = useState<Stage>({ s: "compose" })

  useEffect(() => {
    if (!open) {
      setInput("")
      setStage({ s: "compose" })
    }
  }, [open])

  const parsed = parseJoinInviteInput(input)
  const busy = stage.s === "lookingUp" || stage.s === "joining"

  const telegramDeepLink = (): string => {
    if (parsed?.kind === "invite") {
      return `https://t.me/+${parsed.hash}`
    }
    if (parsed?.kind === "username") {
      return `https://t.me/${parsed.username}`
    }
    return "https://t.me"
  }

  const runLookup = async () => {
    if (!client || !parsed) {
      return
    }
    if (parsed.kind === "username") {
      // No cheap preview for a bare username — go straight to Join.
      setStage({ s: "preview", preview: { kind: "invite", title: `@${parsed.username}`, about: "", participantsCount: 0, isChannel: true, requestNeeded: false, hash: "" } })
      return
    }
    setStage({ s: "lookingUp" })
    try {
      const preview = await checkInvite(client, parsed.hash)
      if (preview.kind === "already") {
        await refreshDialogs()
        onJoined({})
        onClose()
        return
      }
      setStage({ s: "preview", preview })
    } catch {
      setStage({ s: "error", message: t("letters.joinInvite.errorInvalid") })
    }
  }

  const runJoin = async () => {
    if (!client || !parsed) {
      return
    }
    setStage({ s: "joining" })
    try {
      const outcome =
        parsed.kind === "invite"
          ? await joinByInviteHash(client, parsed.hash)
          : await joinByUsername(client, parsed.username)

      if (outcome.kind === "ok") {
        await refreshDialogs()
        onJoined(
          parsed.kind === "username"
            ? { username: parsed.username }
            : { title: stage.s === "preview" && stage.preview.kind === "invite" ? stage.preview.title : undefined },
        )
        onClose()
        return
      }
      // webview / guard-bot path — never a silent no-op (AC-J3)
      const browserUrl =
        parsed.kind === "invite"
          ? await requestChatJoinWebViewUrl(client, parsed.hash)
          : null
      setStage({ s: "webview", telegramUrl: telegramDeepLink(), browserUrl })
    } catch {
      setStage({ s: "error", message: t("letters.joinInvite.errorGeneric") })
    }
  }

  if (!open) {
    return null
  }

  const node = (
    <div
      className="letters-new-chat-backdrop"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        ref={panelRef}
        className="letters-new-chat-sheet letters-join-invite-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("letters.joinInvite.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="letters-new-chat-sheet__head">
          <h2 className="letters-new-chat-sheet__title">{t("letters.joinInvite.title")}</h2>
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

        {stage.s === "webview" ? (
          <>
            <p className="letters-join-invite-sheet__webview-title">
              {t("letters.joinInvite.webviewTitle")}
            </p>
            <p className="letters-new-chat-sheet__hint muted small">
              {t("letters.joinInvite.webviewBody")}
            </p>
            <footer className="letters-new-chat-sheet__foot letters-join-invite-sheet__foot">
              <Button variant="ghost" type="button" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              {stage.browserUrl ? (
                <a
                  className="btn-ghost letters-join-invite-sheet__cta"
                  href={stage.browserUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("letters.joinInvite.openBrowserDescribed")}
                >
                  {t("letters.joinInvite.openBrowser")}
                </a>
              ) : null}
              <a
                className="btn letters-join-invite-sheet__cta"
                href={stage.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t("letters.joinInvite.openTelegramDescribed")}
              >
                {t("letters.joinInvite.openTelegram")}
              </a>
            </footer>
          </>
        ) : (
          <>
            <p className="letters-new-chat-sheet__hint muted small">
              {t("letters.joinInvite.hint")}
            </p>

            <div className="letters-new-chat-sheet__search">
              <TextField
                type="text"
                variant="search"
                name="letters-join-invite-input"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  if (stage.s === "error" || stage.s === "preview") {
                    setStage({ s: "compose" })
                  }
                }}
                placeholder="t.me/+…"
                aria-label={t("letters.joinInvite.inputAria")}
                autoComplete="off"
                autoFocus
                disabled={busy}
              />
            </div>

            <div className="letters-join-invite-sheet__body" aria-live="polite">
              {stage.s === "lookingUp" ? (
                <p className="letters-new-chat-sheet__status muted small">
                  {t("letters.joinInvite.lookingUp")}
                </p>
              ) : stage.s === "joining" ? (
                <p className="letters-new-chat-sheet__status muted small">
                  {t("letters.joinInvite.joining")}
                </p>
              ) : stage.s === "error" ? (
                <p className="letters-new-chat-sheet__error">{stage.message}</p>
              ) : stage.s === "preview" && stage.preview.kind === "invite" ? (
                <div className="letters-join-invite-preview">
                  <span className="letters-join-invite-preview__title">
                    {stage.preview.title}
                  </span>
                  {stage.preview.participantsCount > 0 ? (
                    <span className="letters-join-invite-preview__meta muted small">
                      {t("letters.joinInvite.members", {
                        count: stage.preview.participantsCount,
                      })}
                    </span>
                  ) : null}
                  {stage.preview.about ? (
                    <span className="letters-join-invite-preview__about muted small">
                      {stage.preview.about}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <footer className="letters-new-chat-sheet__foot">
              <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
              {stage.s === "preview" ? (
                <Button
                  variant="primary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void runJoin()
                  }}
                >
                  {t("letters.joinInvite.join")}
                </Button>
              ) : stage.s === "error" ? (
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => {
                    void runLookup()
                  }}
                >
                  {t("letters.joinInvite.tryAgain")}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  type="button"
                  disabled={!parsed || busy || !client}
                  onClick={() => {
                    void runLookup()
                  }}
                >
                  {t("letters.joinInvite.lookUp")}
                </Button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(node, getLettersPortalRoot())
}
