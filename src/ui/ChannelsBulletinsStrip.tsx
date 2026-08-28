import { useTranslation } from "react-i18next"
import type { TelegramClient } from "teleproto"
import { formatDialogListTime } from "../util/timeFormat"
import { PeerAvatar } from "./PeerAvatar"

export type ChannelStripPeer = {
  key: string
  name: string
  unreadCount?: number
  /** Unix time (seconds) for meta column; prefer TG `dialog.date` (same as ChatList). */
  lastMessageUnix?: number
}

type Props = {
  peers: ChannelStripPeer[]
  selectedKey?: string | null
  onSelect: (key: string) => void
  /** Load channel avatars when connected (same as group rows in {@link ChatList}). */
  client?: TelegramClient | null
}

/**
 * Broadcast channel bulletins in the Letters channels rail — same row chrome as groups
 * (`chat-row` + avatar + preview line).
 */
export function ChannelsBulletinTiles({ peers, selectedKey, onSelect, client }: Props) {
  const { t, i18n } = useTranslation()
  if (peers.length === 0) {
    return null
  }
  const show = peers.slice(0, 8)
  const statusLine = t("letters.channelTransmittingNow")
  return (
    <div
      className="letters-channels-strip letters-channels-strip--rows-only"
      role="region"
      aria-label={t("letters.sidebarChannelsAria")}
    >
      <ul className="chat-list" role="list">
        {show.map((p) => {
          const unread = p.unreadCount ?? 0
          const dateLabel =
            typeof p.lastMessageUnix === "number" && p.lastMessageUnix > 0
              ? formatDialogListTime(p.lastMessageUnix, i18n.language)
              : null
          const active = Boolean(selectedKey) && selectedKey === p.key
          const dateIso =
            typeof p.lastMessageUnix === "number" && p.lastMessageUnix > 0
              ? new Date(p.lastMessageUnix * 1000).toISOString()
              : undefined
          return (
            <li key={p.key}>
              <button
                type="button"
                className={active ? "chat-row is-active" : "chat-row"}
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  onSelect(p.key)
                }}
              >
                <PeerAvatar id={p.key} name={p.name} size={48} client={client ?? null} />
                <div className="chat-row__body">
                  <div className="chat-row__top">
                    <div className="chat-row__title">
                      <span className="chat-row__name">{p.name}</span>
                    </div>
                    <div className="chat-row__meta">
                      {dateLabel != null ? (
                        <time className="chat-row__time" dateTime={dateIso}>
                          {dateLabel}
                        </time>
                      ) : null}
                      {unread > 0 ? (
                        <span
                          className="chat-row__unread"
                          aria-label={t("chat.unreadAria", { n: unread })}
                        >
                          {String(unread)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="chat-row__preview">{statusLine}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
