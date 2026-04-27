import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import type { Dialog } from "telegram/tl/custom/dialog"
import { getDialogPreviewText } from "../telegram/dialogPreview"
import { getPeerInfo, isPrivateUserDialog, isUserContactForPolicy } from "../telegram/dialogUtils"
import { isPrivateChatHidden } from "../parental/policy"
import type { ParentalSettings } from "../parental/types"
import { formatDialogListTime } from "../util/timeFormat"
import { Button } from "./ds"
import { PeerAvatar } from "./PeerAvatar"

type Props = {
  dialogs: Dialog[]
  selectedKey: string | null
  onSelect: (d: Dialog) => void
  settings: ParentalSettings
  onRequestForHidden: (d: Dialog) => void
  nightListHidden: boolean
  hasMoreDialogs?: boolean
  loadMoreDialogs?: () => void
  dialogsLoadingMore?: boolean
  loadedDialogCount?: number
}

export function ChatList({
  dialogs,
  selectedKey,
  onSelect,
  settings,
  onRequestForHidden,
  nightListHidden,
  hasMoreDialogs = false,
  loadMoreDialogs,
  dialogsLoadingMore = false,
  loadedDialogCount,
}: Props) {
  const { t, i18n } = useTranslation()
  if (nightListHidden) {
    return (
      <div className="side-panel side-night">
        <p>{t("night.blurred")}</p>
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
        const preview = getDialogPreviewText(d, t)
        const timeLabel = d.date
          ? formatDialogListTime(d.date, i18n.language)
          : ""

        if (hidden) {
          return (
            <li key={key}>
              <div className="chat-blocked-row">
                <PeerAvatar className="peer-avatar--dim" id={key} name={name} size={44} />
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
              className={isSel ? "chat-row is-active" : "chat-row"}
              onClick={() => {
                onSelect(d)
              }}
            >
              <PeerAvatar id={key} name={name} size={48} />
              <div className="chat-row__body">
                <div className="chat-row__top">
                  <div className="chat-row__title">
                    {d.pinned ? (
                      <span className="chat-row__pin" title={t("chat.pinned")} aria-hidden>
                        {"\uD83D\uDCCC "}
                      </span>
                    ) : null}
                    <span className="chat-row__name">{name}</span>
                  </div>
                  <div className="chat-row__meta">
                    {timeLabel ? (
                      <time className="chat-row__time" dateTime={String(d.date)}>
                        {timeLabel}
                      </time>
                    ) : null}
                    {d.unreadCount > 0 ? (
                      <span className="chat-row__unread" aria-label={t("chat.unreadAria", { n: d.unreadCount })}>
                        {d.unreadCount > 99 ? "99+" : d.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="chat-row__preview">{preview || "\u00A0"}</p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
    {hasMoreDialogs && loadMoreDialogs ? (
      <div className="chat-list-footer">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={dialogsLoadingMore}
          onClick={() => {
            void loadMoreDialogs()
          }}
        >
          {dialogsLoadingMore ? t("loading") : t("chat.loadMoreChats")}
        </Button>
        <p className="small muted">{t("chat.dialogsListNote", { n: String(loadedDialogCount ?? dialogs.length) })}</p>
      </div>
    ) : (loadedDialogCount ?? dialogs.length) >= 100 && !hasMoreDialogs ? (
      <p className="small muted chat-list-footer">{t("chat.dialogsListNote", { n: String(loadedDialogCount ?? dialogs.length) })}</p>
    ) : null}
    </Fragment>
  )
}
