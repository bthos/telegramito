import { useEffect, useRef, useState } from "react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useTranslation } from "react-i18next"
import { blockTelegramUser } from "../telegram/blockUser"
import {
  getPeerMuteUntil,
  isPeerNotifyMuted,
  setPeerMuted,
} from "../telegram/peerMute"
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
  /** Forum / topics: in-chat search is not wired yet — hide or disable search action. */
  isForum?: boolean
  /** Opens the in-thread search strip in {@link ChatView} and should close the panel. */
  onOpenInChatSearch?: () => void
  /** Called after a successful block so the shell can refresh dialogs. */
  onAfterBlock?: () => void
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
  isForum = false,
  onOpenInChatSearch,
  onAfterBlock,
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
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [muteUntil, setMuteUntil] = useState<number | null>(null)
  const [muteBusy, setMuteBusy] = useState(false)
  const [blockBusy, setBlockBusy] = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !client || !entity) {
      setMuteUntil(null)
      setActionErr(null)
      setBlockConfirm(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const u = await getPeerMuteUntil(client, entity)
        if (!cancelled) setMuteUntil(u)
      } catch {
        if (!cancelled) setMuteUntil(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, client, entity])

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
  const muted =
    muteUntil != null ? isPeerNotifyMuted(muteUntil) : false

  const handleMuteToggle = async () => {
    if (!client || !entity || muteUntil == null || muteBusy) return
    setMuteBusy(true)
    setActionErr(null)
    try {
      await setPeerMuted(client, entity, !muted)
      const next = await getPeerMuteUntil(client, entity)
      setMuteUntil(next)
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : t("chat.muteFailed"))
    } finally {
      setMuteBusy(false)
    }
  }

  const handleBlock = async () => {
    if (!client || !entity || entity.className !== "User" || blockBusy) return
    setBlockBusy(true)
    setActionErr(null)
    try {
      await blockTelegramUser(client, entity)
      setBlockConfirm(false)
      onAfterBlock?.()
      onClose()
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : t("chat.blockUserFailed"))
    } finally {
      setBlockBusy(false)
    }
  }

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
          {actionErr ? (
            <p className="context-panel__action-err small" role="alert">
              {actionErr}
            </p>
          ) : null}
          <div className="context-panel__actions">
            <button
              type="button"
              className="context-panel__action-btn"
              disabled={isForum}
              title={isForum ? t("chat.searchForumDisabled") : undefined}
              onClick={() => {
                if (isForum) return
                onOpenInChatSearch?.()
                onClose()
              }}
            >
              {t("chat.searchInChat")}
            </button>

            <button
              type="button"
              className="context-panel__action-btn"
              disabled={muteUntil == null || muteBusy}
              onClick={() => {
                void handleMuteToggle()
              }}
            >
              {muted ? t("chat.unmute") : t("chat.mute")}
            </button>

            {showPrivateActions ? (
              blockConfirm ? (
                <div className="context-panel__confirm-row">
                  <span className="context-panel__confirm-label">
                    {t("chat.blockUserConfirm")}
                  </span>
                  <button
                    type="button"
                    className="context-panel__action-btn context-panel__action-btn--danger"
                    disabled={blockBusy}
                    onClick={() => {
                      void handleBlock()
                    }}
                  >
                    {t("chat.blockUser")}
                  </button>
                  <button
                    type="button"
                    className="context-panel__action-btn"
                    disabled={blockBusy}
                    onClick={() => setBlockConfirm(false)}
                  >
                    {t("chat.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="context-panel__action-btn context-panel__action-btn--danger"
                  onClick={() => setBlockConfirm(true)}
                >
                  {t("chat.blockUser")}
                </button>
              )
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
