import { Fragment, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { getDialogPreviewText } from "../telegram/dialogPreview"
import { getPeerInfo, isPrivateUserDialog, isUserContactForPolicy } from "../telegram/dialogUtils"
import { isPrivateChatHidden } from "../parental/policy"
import type { ParentalSettings } from "../parental/types"
import { formatDialogListTime } from "../util/timeFormat"
import { formatUnreadBadge } from "../util/formatUnreadBadge"
import { getDialogDraftPreviewLine } from "../util/dialogDraft"
import { Button } from "./ds"
import { PeerAvatar } from "./PeerAvatar"

type Props = {
  dialogs: Dialog[]
  selectedKey: string | null
  onSelect: (d: Dialog) => void
  settings: ParentalSettings
  onRequestForHidden: (d: Dialog) => void
  nightListHidden: boolean
  /** Shown when the list is hidden; local night window from parental settings. */
  nightWindow?: { start: string; end: string }
  hasMoreDialogs?: boolean
  loadMoreDialogs?: () => void
  dialogsLoadingMore?: boolean
  loadedDialogCount?: number
  /** When set, chat rows load profile photos for peers. */
  client?: TelegramClient | null
  /** Drafts tab: show draft body prominently with addressee secondary. */
  draftsMode?: boolean
}

export function ChatList({
  dialogs,
  selectedKey,
  onSelect,
  settings,
  onRequestForHidden,
  nightListHidden,
  nightWindow,
  hasMoreDialogs = false,
  loadMoreDialogs,
  dialogsLoadingMore = false,
  loadedDialogCount,
  client,
  draftsMode = false,
}: Props) {
  const { t, i18n } = useTranslation()

  const sentinelRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMoreDialogs || !loadMoreDialogs || dialogsLoadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreDialogs()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMoreDialogs, loadMoreDialogs, dialogsLoadingMore])

  if (nightListHidden) {
    return (
      <div className="side-panel side-night">
        <p>{t("night.blurred")}</p>
        {nightWindow ? (
          <p className="small muted side-night__window" role="status">
            {t("night.windowRange", { start: nightWindow.start, end: nightWindow.end })}
          </p>
        ) : null}
      </div>
    )
  }
  return (
    <Fragment>
      <ul className="chat-list" role="list">
      {dialogs.map((d) => {
        const { key, name } = getPeerInfo(d)
        const allow = new Set(settings.allowlistIds)
        const isPriv = isPrivateUserDialog(d)
        const isContact = isUserContactForPolicy(d)
        const hidden = isPrivateChatHidden({
          isPrivate: isPriv,
          isContact,
          peerKey: key,
          allowlistIds: allow,
          blockUnknownPrivate: settings.blockUnknownPrivate,
          appMode: settings.appMode,
        })
        const isSel = key === selectedKey
        const preview = draftsMode
          ? getDialogDraftPreviewLine(d, t)
          : getDialogPreviewText(d, t)
        const timeLabel = d.date
          ? formatDialogListTime(d.date, i18n.language)
          : ""

        if (hidden) {
          return (
            <li key={key}>
              <div className="chat-blocked-row">
                <PeerAvatar className="peer-avatar--dim" id={key} name={name} size={44} client={client} />
                <div className="chat-blocked-row__body">
                  <span className="chat-blocked-row__name">{name}</span>
                  <div className="chat-blocked-row__actions">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onRequestForHidden(d)
                      }}
                    >
                      {t("chat.requestAccess")}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          )
        }
        return (
          <li key={key}>
            <button
              type="button"
              className={
                draftsMode
                  ? isSel
                    ? "chat-row chat-row--draft is-active"
                    : "chat-row chat-row--draft"
                  : isSel
                    ? "chat-row is-active"
                    : "chat-row"
              }
              onClick={() => {
                onSelect(d)
              }}
            >
              <PeerAvatar id={key} name={name} size={48} client={client} />
              <div className="chat-row__body">
                <div className="chat-row__top">
                  <div className="chat-row__title">
                    {d.pinned ? (
                      <span className="chat-row__pin" title={t("chat.pinned")} aria-hidden>
                        {"\uD83D\uDCCC "}
                      </span>
                    ) : null}
                    {draftsMode ? (
                      <span className="chat-row__draft-preview">{preview || "\u00A0"}</span>
                    ) : (
                      <span className="chat-row__name">{name}</span>
                    )}
                  </div>
                  <div className="chat-row__meta">
                    {timeLabel ? (
                      <time className="chat-row__time" dateTime={String(d.date)}>
                        {timeLabel}
                      </time>
                    ) : null}
                    {!draftsMode && d.unreadCount > 0 ? (
                      <span className="chat-row__unread" aria-label={t("chat.unreadAria", { n: d.unreadCount })}>
                        {formatUnreadBadge(d.unreadCount)}
                      </span>
                    ) : null}
                  </div>
                </div>
                {draftsMode ? (
                  <p className="chat-row__preview chat-row__preview--addressee">{name}</p>
                ) : (
                  <p className="chat-row__preview">{preview || "\u00A0"}</p>
                )}
              </div>
            </button>
          </li>
        )
      })}
      {hasMoreDialogs ? (
        <li ref={sentinelRef} className="chat-list-sentinel" aria-hidden>
          {dialogsLoadingMore
            ? <p className="small muted" role="status">{t("loading")}</p>
            : null}
        </li>
      ) : null}
    </ul>
    {!hasMoreDialogs && (loadedDialogCount ?? dialogs.length) >= 100 ? (
      <p className="small muted chat-list-footer">
        {t("chat.dialogsListNote", { n: String(loadedDialogCount ?? dialogs.length) })}
      </p>
    ) : null}
    </Fragment>
  )
}
