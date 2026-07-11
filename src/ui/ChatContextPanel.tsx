import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useTranslation } from "react-i18next"
import { useHardwareBackLayer } from "../hooks/useHardwareBack"
import { blockTelegramUser } from "../telegram/blockUser"
import {
  getPeerMuteUntil,
  isPeerNotifyMuted,
  setPeerMuted,
} from "../telegram/peerMute"
import { PeerAvatar } from "./PeerAvatar"
import { usePeerSharedMedia, type MediaTab } from "../hooks/usePeerSharedMedia"
import { makeBlobUrl } from "./messageMediaBlobUtils"
import { getMessageDocument, getDocumentFileName, formatDocumentSize } from "../telegram/documentFile"
import { isAnimatedDoc, isVideoDoc } from "../telegram/documentMediaKind"
import { resolveMessageMediaForDisplay } from "../telegram/messageMediaUnwrap"

type PeerEntity = Api.User | Api.Chat | Api.Channel

type Props = {
  entity: PeerEntity | null | undefined
  peerName: string
  peerId: string
  client: TelegramClient | null
  isOpen: boolean
  onClose: () => void
  /**
   * Overlay slide-in (default) vs editorial column in Letters right rail (no backdrop / fixed layer).
   */
  presentation?: "overlay" | "lettersRail"
  /** Forum / topics: in-chat search is not wired yet — hide or disable search action. */
  isForum?: boolean
  /** Opens the in-thread search strip in {@link ChatView} and should close the panel. */
  onOpenInChatSearch?: () => void
  /** Called after a successful block so the shell can refresh dialogs. */
  onAfterBlock?: () => void
  /** Letters two-pane desktop: masthead widgets (ribbon, insights calendar) rendered above peer header. */
  lettersThreadChrome?: ReactNode | null
  /** Letters chats: row (search + unread filter) rendered at top of panel after {@link lettersThreadChrome}. */
  lettersPanelTools?: ReactNode | null
  /** When true, hides the textual "Search in chat" quick action ({@link lettersPanelTools} provides search). */
  omitQuickInChatSearch?: boolean
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

/** Photo vs video for shared-media grid (aligned with {@link resolveMessageMediaForDisplay} / paid unwrap). */
function mediaThumbKind(message: Api.Message): "photo" | "video" {
  const r = resolveMessageMediaForDisplay(message)
  const med = r.media
  if (!med) return "photo"
  if (med.className === "MessageMediaPhoto") return "photo"
  if (med.className === "MessageMediaDocument") {
    const d = getMessageDocument(r)
    if (!d) return "photo"
    if (isVideoDoc(d)) return "video"
    const mt = d.mimeType?.toLowerCase() ?? ""
    if (mt.startsWith("video/")) return "video"
    if (isAnimatedDoc(d) && mt.includes("video")) return "video"
  }
  return "photo"
}

function videoMimeForThumb(message: Api.Message): string {
  const r = resolveMessageMediaForDisplay(message)
  const d = getMessageDocument(r)
  const mt = d?.mimeType?.toLowerCase() ?? ""
  if (d && mt.startsWith("video/")) return d.mimeType || "video/mp4"
  return "video/mp4"
}

/** Thumbnail cell: tap loads blob once, then renders <img> or <video>. */
function MediaThumbCell({
  message,
  client,
}: {
  message: Api.Message
  client: TelegramClient | null
}) {
  const { t } = useTranslation()
  const blobUrlRef = useRef<string | null>(null)
  const inFlight = useRef(false)
  const [phase, setPhase] = useState<"idle" | "loading" | "ready">("idle")
  const [thumb, setThumb] = useState<
    { url: string; kind: "photo" | "video" } | null
  >(null)

  useEffect(() => {
    inFlight.current = false
    setPhase("idle")
    setThumb(null)
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [message, client])

  const loadThumb = useCallback(() => {
    if (!client || inFlight.current) return
    inFlight.current = true
    setPhase("loading")
    void (async () => {
      try {
        const buf = await client.downloadMedia(message as never, {})
        if (buf) {
          const kind = mediaThumbKind(message)
          const mime = kind === "video" ? videoMimeForThumb(message) : "image/jpeg"
          const nextUrl = makeBlobUrl(buf, mime)
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
          }
          blobUrlRef.current = nextUrl
          setThumb({ url: nextUrl, kind })
          setPhase("ready")
        } else {
          setPhase("idle")
        }
      } catch {
        setPhase("idle")
      } finally {
        inFlight.current = false
      }
    })()
  }, [client, message])

  if (phase === "ready" && thumb) {
    return (
      <div className="context-panel__media-cell">
        <a href={thumb.url} target="_blank" rel="noopener noreferrer" tabIndex={0}>
          {thumb.kind === "video" ? (
            <video
              className="context-panel__media-thumb-video"
              src={thumb.url}
              muted
              playsInline
              preload="metadata"
              aria-hidden
            />
          ) : (
            <img src={thumb.url} alt="" loading="lazy" />
          )}
        </a>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`context-panel__media-cell context-panel__media-cell--tap${phase === "loading" ? " context-panel__media-cell--loading" : ""}`}
      aria-label={t("chat.mediaTapToLoad")}
      onClick={() => {
        loadThumb()
      }}
      disabled={!client || phase === "loading"}
    />
  )
}

/** Extract the first URL from a message (entities → fallback to raw text). */
function extractUrlFromMessage(msg: Api.Message): string | null {
  const text = typeof msg.message === "string" ? msg.message : ""
  if (Array.isArray(msg.entities)) {
    for (const e of msg.entities) {
      if (e.className === "MessageEntityUrl") {
        const url = text.slice(
          (e as { offset: number }).offset,
          (e as { offset: number; length: number }).offset + (e as { length: number }).length,
        )
        if (url) return url
      }
      if (e.className === "MessageEntityTextUrl") {
        const tu = e as Api.MessageEntityTextUrl
        if (typeof tu.url === "string" && tu.url) return tu.url
      }
    }
  }
  if (text.startsWith("http://") || text.startsWith("https://")) return text.split(/\s/)[0] ?? text
  return null
}

/** Extract domain from a URL string, or return the URL itself as fallback. */
function urlDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** Single row in the Files tab. */
function FileRow({ message }: { message: Api.Message }) {
  const doc = getMessageDocument(message)
  const name = doc ? (getDocumentFileName(doc) ?? "file") : "file"
  const size = doc ? formatDocumentSize(doc.size) : ""
  const mime = doc?.mimeType ?? ""
  const ext = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1).toUpperCase().slice(0, 5)
    : "FILE"

  return (
    <div className="context-panel__file-row">
      <span className="context-panel__file-ext" aria-hidden="true">{ext}</span>
      <div className="context-panel__file-info">
        <span className="context-panel__file-name" title={name}>{name}</span>
        {(size || mime) ? (
          <span className="context-panel__file-meta muted">
            {[size, mime].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Single row in the Links tab. */
function LinkRow({ message }: { message: Api.Message }) {
  const url = extractUrlFromMessage(message)
  if (!url) return null
  const domain = urlDomain(url)
  const text = typeof message.message === "string" && message.message.trim()
    ? message.message.trim()
    : url

  return (
    <div className="context-panel__link-row">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="context-panel__link-anchor"
      >
        <span className="context-panel__link-domain">{domain}</span>
        <span className="context-panel__link-text" title={text}>{text}</span>
      </a>
    </div>
  )
}

const TABS: MediaTab[] = ["photos", "videos", "files", "links"]

const TAB_I18N_KEY: Record<MediaTab, string> = {
  photos: "chat.sharedMediaTabPhotos",
  videos: "chat.sharedMediaTabVideos",
  files: "chat.sharedMediaTabFiles",
  links: "chat.sharedMediaTabLinks",
}

const EMPTY_I18N_KEY: Record<MediaTab, string> = {
  photos: "chat.noSharedPhotos",
  videos: "chat.noSharedVideos",
  files: "chat.noSharedFiles",
  links: "chat.noSharedLinks",
}

export function ChatContextPanel({
  entity,
  peerName,
  peerId,
  client,
  isOpen,
  onClose,
  presentation = "overlay",
  isForum = false,
  onOpenInChatSearch,
  onAfterBlock,
  lettersThreadChrome = null,
  lettersPanelTools = null,
  omitQuickInChatSearch = false,
}: Props) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [activeTab, setActiveTab] = useState<MediaTab>("photos")

  const { items, loading } = usePeerSharedMedia(
    entity as Api.User | Api.Chat | Api.Channel | null | undefined,
    client,
    activeTab,
  )

  useHardwareBackLayer(isOpen, onClose)

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
      queueMicrotask(() => {
        setMuteUntil(null)
        setActionErr(null)
        setBlockConfirm(false)
      })
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

  const isGridTab = activeTab === "photos" || activeTab === "videos"
  // Placeholder cells to fill grid up to 6 when fewer items are available
  const placeholderCount = isGridTab ? Math.max(0, 6 - items.length) : 0

  const isRail = presentation === "lettersRail"

  const inner = (
    <>
        {lettersThreadChrome != null ? (
          <div className="context-panel__letters-thread-chrome">
            {lettersThreadChrome}
          </div>
        ) : null}
        {lettersPanelTools != null ? (
          <div className="context-panel__letters-panel-tools">{lettersPanelTools}</div>
        ) : null}
        {/* Peer header */}
        <div className="context-panel__header">
          <PeerAvatar id={peerId} name={peerName} size={48} client={client} />
          <h3 className="context-panel__name">{peerName}</h3>
        </div>

        {/* Shared media section with tabs */}
        <section className="context-panel__section" aria-label={t("chat.sharedMedia")}>
          <h4 className="context-panel__section-title">{t("chat.sharedMedia")}</h4>

          {/* Tab bar */}
          <div
            className="context-panel__media-tabs"
            role="tablist"
            aria-label={t("chat.sharedMedia")}
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`context-panel__media-tab${activeTab === tab ? " context-panel__media-tab--active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(TAB_I18N_KEY[tab])}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {loading ? (
            isGridTab ? (
              <div className="context-panel__media-grid" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="context-panel__media-cell context-panel__media-cell--loading"
                    aria-hidden="true"
                  />
                ))}
              </div>
            ) : (
              <div className="context-panel__list-skeleton" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="context-panel__list-skeleton-row context-panel__media-cell--loading"
                    aria-hidden="true"
                  />
                ))}
              </div>
            )
          ) : items.length === 0 ? (
            <p className="context-panel__empty muted">{t(EMPTY_I18N_KEY[activeTab])}</p>
          ) : isGridTab ? (
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
          ) : activeTab === "files" ? (
            <div className="context-panel__file-list">
              {items.map((msg) => (
                <FileRow key={msg.id} message={msg} />
              ))}
            </div>
          ) : (
            <div className="context-panel__link-list">
              {items.map((msg) => (
                <LinkRow key={msg.id} message={msg} />
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
            {!omitQuickInChatSearch ? (
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
            ) : null}

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
    </>
  )

  if (isRail) {
    return (
      <div
        ref={panelRef}
        className="chat-context-panel chat-context-panel--letters-rail"
        aria-label={t("chat.info")}
      >
        {inner}
      </div>
    )
  }

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
        {inner}
      </div>
    </>
  )
}
