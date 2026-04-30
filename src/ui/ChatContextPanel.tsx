import { useEffect, useRef, useState } from "react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useTranslation } from "react-i18next"
import { PeerAvatar } from "./PeerAvatar"
import { usePeerRecentMedia } from "../hooks/usePeerRecentMedia"
import { makeBlobUrl } from "./messageMediaBlobUtils"

type PeerEntity = Api.User | Api.Chat | Api.Channel

type Props = {
  entity: PeerEntity | null | undefined
  peerName: string
  peerId: string
  client: TelegramClient | null
  isOpen: boolean
  onClose: () => void
}

/** Returns true when the entity is a private (user) peer. */
function isPrivatePeer(entity: PeerEntity | null | undefined): boolean {
  return entity != null && entity.className === "User"
}

/** Returns true when the entity is a group or megagroup (Chat or megagroup Channel). */
function isGroupPeer(entity: PeerEntity | null | undefined): boolean {
  if (entity == null) return false
  if (entity.className === "Chat") return true
  if (entity.className === "Channel" && (entity as Api.Channel).megagroup === true) return true
  return false
}

/** Thumbnail cell: fetches blob for a single photo message and renders as <img>. */
function MediaThumbCell({
  message,
  client,
}: {
  message: Api.Message
  client: TelegramClient | null
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    let cancelled = false
    let url: string | null = null

    void (async () => {
      try {
        const buf = await client.downloadMedia(message as never, {})
        if (cancelled) return
        if (buf) {
          url = makeBlobUrl(buf, "image/jpeg")
          setBlobUrl(url)
        }
      } catch {
        // silently ignore thumbnail errors
      }
    })()

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [message, client])

  if (!blobUrl) {
    return (
      <div
        className="context-panel__media-cell context-panel__media-cell--loading"
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="context-panel__media-cell">
      <a href={blobUrl} target="_blank" rel="noopener noreferrer" tabIndex={0}>
        <img src={blobUrl} alt="" loading="lazy" />
      </a>
    </div>
  )
}

export function ChatContextPanel({
  entity,
  peerName,
  peerId,
  client,
  isOpen,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { items, loading } = usePeerRecentMedia(
    entity as Api.User | Api.Chat | Api.Channel | null | undefined,
    client,
  )

  // Escape key dismisses
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  const [leaveConfirm, setLeaveConfirm] = useState(false)

  const handleLeave = async () => {
    if (!client || !entity) return
    try {
      if (entity.className === "Channel") {
        await (
          client as TelegramClient & {
            leaveChannel?: (e: unknown) => Promise<unknown>
          }
        ).leaveChannel?.(entity)
      } else if (entity.className === "Chat") {
        await (
          client as TelegramClient & {
            deleteChat?: (e: unknown) => Promise<unknown>
          }
        ).deleteChat?.(entity)
      }
    } catch {
      // ignore errors — UI stays open if leave fails
    }
    setLeaveConfirm(false)
    onClose()
  }

  const showPrivateActions = isPrivatePeer(entity)
  const showGroupActions = isGroupPeer(entity)

  // Placeholder cells to fill grid up to 6 when fewer items are available
  const placeholderCount = Math.max(0, 6 - items.length)

  return (
    <>
      {isOpen ? (
        <div
          className="context-panel__backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={panelRef}
        className={`chat-context-panel${isOpen ? " context-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("chat.info")}
      >
        {/* Peer header */}
        <div className="context-panel__header">
          <PeerAvatar id={peerId} name={peerName} size={48} />
          <h3 className="context-panel__name">{peerName}</h3>
        </div>

        {/* Shared media grid */}
        <section className="context-panel__section" aria-label={t("chat.sharedMedia")}>
          <h4 className="context-panel__section-title">{t("chat.sharedMedia")}</h4>
          {loading ? (
            <div className="context-panel__media-grid" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="context-panel__media-cell context-panel__media-cell--loading"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="context-panel__empty muted">{t("chat.noSharedMedia")}</p>
          ) : (
            <div className="context-panel__media-grid">
              {items.map((msg) => (
                <MediaThumbCell key={msg.id} message={msg} client={client} />
              ))}
              {Array.from({ length: placeholderCount }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  className="context-panel__media-cell context-panel__media-cell--placeholder"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="context-panel__section" aria-label={t("chat.quickActions")}>
          <h4 className="context-panel__section-title">{t("chat.quickActions")}</h4>
          <div className="context-panel__actions">
            <button
              type="button"
              className="context-panel__action-btn"
              onClick={() => {
                /* stub — search in chat: unblocked when UX-14 ships */
              }}
            >
              {t("chat.searchInChat")}
            </button>

            <button
              type="button"
              className="context-panel__action-btn"
              onClick={() => {
                /* stub — mute/unmute: V2 */
              }}
            >
              {t("chat.muteUnmute")}
            </button>

            {showPrivateActions ? (
              <button
                type="button"
                className="context-panel__action-btn context-panel__action-btn--danger"
                onClick={() => {
                  /* stub — block user: V2 */
                }}
              >
                {t("chat.blockUser")}
              </button>
            ) : null}

            {showGroupActions ? (
              leaveConfirm ? (
                <div className="context-panel__confirm-row">
                  <span className="context-panel__confirm-label">
                    {t("chat.leaveGroupConfirm")}
                  </span>
                  <button
                    type="button"
                    className="context-panel__action-btn context-panel__action-btn--danger"
                    onClick={() => {
                      void handleLeave()
                    }}
                  >
                    {t("chat.confirmLeave")}
                  </button>
                  <button
                    type="button"
                    className="context-panel__action-btn"
                    onClick={() => setLeaveConfirm(false)}
                  >
                    {t("chat.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="context-panel__action-btn context-panel__action-btn--danger"
                  onClick={() => setLeaveConfirm(true)}
                >
                  {t("chat.leaveGroup")}
                </button>
              )
            ) : null}
          </div>
        </section>
      </div>
    </>
  )
}
