import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { TelegramClient } from "telegram"
import type { AppMode } from "../parental/types"
import { peerKeyFromPeer } from "../telegram/peerKey"
import { isPeerEntryUnread, type StoryPeerEntry } from "../telegram/storiesFeed"
import { useStoriesFeed } from "../hooks/useStoriesFeed"
import { PeerAvatar } from "./PeerAvatar"
import { StoryViewer } from "./StoryViewer"

type Props = {
  client: TelegramClient | null
  appMode: AppMode
  nightListHidden: boolean
  nightWindow?: { start: string; end: string }
  deniedPeerIds: ReadonlySet<string>
}

const SKELETON_COUNT = 4

/**
 * Circles tab body (AC1) — corkboard-of-postcards rail, per the mockup UAT
 * pivot (tech-plan.md Decision Record 1; supersedes ux-design.md's ring-strip
 * for this component only, not the viewer). Presentational over
 * {@link useStoriesFeed}, matching this app's existing hook/component split
 * (e.g. `DayMailRail`).
 */
export function StoriesRailStrip({ client, appMode, nightListHidden, nightWindow, deniedPeerIds }: Props) {
  const { t } = useTranslation()
  const { state, entries, refresh, markPeerRead } = useStoriesFeed({
    client,
    nightListHidden,
    appMode,
    deniedPeerIds,
  })
  // Snapshot of `entries` frozen at the moment the viewer opens (not the live
  // `entries` from useStoriesFeed): committing a read from inside the viewer
  // (onMarkPeerRead -> markPeerRead) re-sorts the rail's own entries via
  // orderStoryEntries, which would otherwise reshuffle peer positions out from
  // under the viewer's index-based peerIndex/startIndex mid-session.
  const [viewerSession, setViewerSession] = useState<{ entries: StoryPeerEntry[]; startIndex: number } | null>(
    null,
  )

  if (state === "loading") {
    return (
      <div className="letters-circles-corkboard">
        <div
          className="letters-circles-corkboard__grid"
          role="status"
          aria-busy="true"
          aria-label={t("letters.stories.railAria")}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div
              key={i}
              className="letters-circles-corkboard__postcard letters-circles-corkboard__postcard--skeleton"
              aria-hidden="true"
            >
              <span className="letters-circles-corkboard__pin" />
              <span className="letters-circles-corkboard__photo letters-circles-corkboard__photo--skeleton placeholder--shimmer" />
              <span className="letters-circles-corkboard__who-skel placeholder--shimmer" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state === "locked") {
    return (
      <div className="letters-circles-corkboard">
        <div
          className="letters-circles-corkboard__note letters-circles-corkboard__note--locked"
          role="status"
        >
          <span className="letters-circles-corkboard__note-glyph" aria-hidden="true">
            ☾
          </span>
          <p className="letters-circles-corkboard__note-text">
            {t("letters.stories.lockedNotice", { time: nightWindow?.start ?? "" })}
          </p>
        </div>
      </div>
    )
  }

  if (state === "empty") {
    return (
      <div className="letters-circles-corkboard">
        <div className="letters-circles-corkboard__slots" aria-hidden="true">
          <span className="letters-circles-corkboard__slot" />
          <span className="letters-circles-corkboard__slot" />
        </div>
        <div className="letters-circles-corkboard__note" role="status">
          <span className="letters-circles-corkboard__note-glyph" aria-hidden="true">
            📌
          </span>
          <p className="letters-circles-corkboard__note-text">{t("letters.stories.empty")}</p>
        </div>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="letters-circles-corkboard">
        <div className="letters-circles-corkboard__note" role="status">
          <p className="letters-circles-corkboard__note-text">{t("letters.stories.loadError")}</p>
          <button type="button" className="letters-circles-corkboard__retry" onClick={refresh}>
            {t("letters.stories.retry")}
          </button>
        </div>
      </div>
    )
  }

  // "success" and "refreshing" render the same grid — the last-known entries
  // never blank out while a background refetch is in flight (ux-design.md).
  return (
    <div className="letters-circles-corkboard">
      <div className="letters-circles-corkboard__grid" role="list" aria-label={t("letters.stories.railAria")}>
        {entries.map((entry, i) => {
          const unread = !entry.isOwn && isPeerEntryUnread(entry)
          const ariaLabel = entry.isOwn
            ? t("letters.stories.ownRingAria")
            : unread
              ? t("letters.stories.ringAriaUnread", { name: entry.name })
              : t("letters.stories.ringAriaRead", { name: entry.name })
          const preview = entry.stories[entry.stories.length - 1]?.caption?.trim()
          const postcardClass = [
            "letters-circles-corkboard__postcard",
            entry.isOwn ? "letters-circles-corkboard__postcard--own" : "",
            !entry.isOwn && !unread ? "letters-circles-corkboard__postcard--read" : "",
          ]
            .filter(Boolean)
            .join(" ")
          return (
            <button
              key={entry.peerKey}
              type="button"
              role="listitem"
              className={postcardClass}
              aria-label={ariaLabel}
              onClick={() => {
                setViewerSession({ entries, startIndex: i })
              }}
            >
              <span className="letters-circles-corkboard__pin" aria-hidden="true" />
              <PeerAvatar
                id={peerKeyFromPeer(entry.peer)}
                name={entry.name}
                client={client}
                size={68}
                className="letters-circles-corkboard__photo"
              />
              <span className="letters-circles-corkboard__who">
                {entry.name}
                {unread ? <span className="letters-circles-corkboard__fresh" aria-hidden="true" /> : null}
              </span>
              {preview ? <span className="letters-circles-corkboard__cap">{preview}</span> : null}
            </button>
          )
        })}
      </div>
      {viewerSession ? (
        <StoryViewer
          client={client}
          entries={viewerSession.entries}
          startIndex={viewerSession.startIndex}
          onMarkPeerRead={markPeerRead}
          onClose={() => {
            setViewerSession(null)
          }}
        />
      ) : null}
    </div>
  )
}
