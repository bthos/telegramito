import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useBodyScrollLockAndEscape } from "../hooks/useBodyScrollLockAndEscape"
import { useFocusTrap } from "../hooks/useFocusTrap"
import { usePeriodicTick } from "../hooks/usePeriodicTick"
import { peerKeyFromPeer } from "../telegram/peerKey"
import {
  formatStoryAge,
  incrementStoryViews,
  readStoriesForPeer,
  type StoryPeerEntry,
} from "../telegram/storiesFeed"
import { buildStoryMediaMessage } from "../telegram/storyMediaAdapter"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"
import { MessageMediaView } from "./MessageMediaView"
import { PeerAvatar } from "./PeerAvatar"

/** AC5 default duration (Deferred Decisions: "5s per story frame, Telegram norm"). */
const STORY_DURATION_MS = 5000

type Props = {
  client: TelegramClient | null
  entries: StoryPeerEntry[]
  startIndex: number
  onMarkPeerRead: (peerKey: string, maxId: number) => void
  onClose: () => void
}

type ReachedRecord = { peer: Api.TypePeer; isOwn: boolean; maxId: number; ids: number[] }

/**
 * Resume point for *opening* the viewer (ux-design.md nodes K/L/M): unread
 * peers land on the first story past `maxReadId`; read/own peers land on
 * index 0. Deliberately NOT reused for peer cascades — see Decision Record 9.
 */
function resumeIndexFor(entry: StoryPeerEntry): number {
  if (entry.isOwn) return 0
  const idx = entry.stories.findIndex((s) => s.id > entry.maxReadId)
  return idx === -1 ? 0 : idx
}

/**
 * Full-screen Story Viewer (AC3/AC4/AC5/AC6/AC7) — self-contained portal
 * mirroring `GifFullViewer.tsx`/`VideoFullViewer.tsx`'s shape.
 *
 * Decision Record 9: the resume-point above runs exactly once, as
 * `storyIndex`'s lazy `useState` initializer at mount. `goNext`/`goPrev` set
 * `storyIndex` explicitly whenever they change `peerIndex` (cascade). Do NOT
 * collapse this into a single `useEffect` keyed on `peerIndex` — effects run
 * after commit, so such an effect would silently overwrite `goPrev`'s explicit
 * "go to last story" with a reset to the resume point on every backward
 * cascade. This was a real bug caught during the test-gate fix loop.
 */
export function StoryViewer({ client, entries, startIndex, onMarkPeerRead, onClose }: Props) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const [peerIndex, setPeerIndex] = useState(startIndex)
  const [storyIndex, setStoryIndex] = useState(() => resumeIndexFor(entries[startIndex]!))
  const reachedRef = useRef(new Map<string, ReachedRecord>())

  const entry = entries[peerIndex]!
  const story = entry.stories[storyIndex]!

  const commitPeer = useCallback(
    (peerKey: string) => {
      const rec = reachedRef.current.get(peerKey)
      if (!rec) return
      reachedRef.current.delete(peerKey)
      // Key Decision: own stories never emit ReadStories/IncrementStoryViews —
      // no read/unread semantics apply to your own content.
      if (rec.isOwn) return
      onMarkPeerRead(peerKey, rec.maxId)
      if (client) {
        void readStoriesForPeer(client, rec.peer, rec.maxId)
        void incrementStoryViews(client, rec.peer, rec.ids)
      }
    },
    [client, onMarkPeerRead],
  )

  const closeAll = useCallback(() => {
    commitPeer(entries[peerIndex]!.peerKey)
    onClose()
  }, [commitPeer, entries, peerIndex, onClose])

  // Bookkeeping only — records that the currently-displayed story has been
  // reached (for the per-peer highest-id/ids tracked in `reachedRef`). Runs
  // once per (peerIndex, storyIndex) pair, including the initial mount; never
  // infers or recomputes a resume point (that's storyIndex's lazy initializer,
  // above, and only there — Decision Record 9).
  useEffect(() => {
    const e = entries[peerIndex]
    const s = e?.stories[storyIndex]
    if (!e || !s) return
    const rec = reachedRef.current.get(e.peerKey)
    if (rec) {
      rec.maxId = Math.max(rec.maxId, s.id)
      if (!rec.ids.includes(s.id)) rec.ids.push(s.id)
    } else {
      reachedRef.current.set(e.peerKey, { peer: e.peer, isOwn: e.isOwn, maxId: s.id, ids: [s.id] })
    }
  }, [entries, peerIndex, storyIndex])

  const goNext = useCallback(() => {
    const e = entries[peerIndex]!
    if (storyIndex < e.stories.length - 1) {
      setStoryIndex(storyIndex + 1)
      return
    }
    // Last story of this peer's stack.
    if (peerIndex === entries.length - 1) {
      closeAll()
      return
    }
    // Cascade forward: unconditional first story of the next peer (never
    // resume-aware — Decision Record 9).
    commitPeer(e.peerKey)
    setPeerIndex(peerIndex + 1)
    setStoryIndex(0)
  }, [entries, peerIndex, storyIndex, commitPeer, closeAll])

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1)
      return
    }
    // First story of this peer's stack.
    if (peerIndex === 0) {
      return
    }
    // Cascade backward: unconditional LAST story of the previous peer (never
    // resume-aware — Decision Record 9, AC4 backward cascade).
    commitPeer(entries[peerIndex]!.peerKey)
    const prevIndex = peerIndex - 1
    setPeerIndex(prevIndex)
    setStoryIndex(entries[prevIndex]!.stories.length - 1)
  }, [entries, peerIndex, storyIndex, commitPeer])

  // Stable refs so the keyboard listener and the auto-advance timer always
  // invoke the latest goNext/goPrev without resubscribing on every index change.
  // Updated in an effect (after commit), never during render, mirroring
  // useBodyScrollLockAndEscape's onCloseRef pattern.
  const goNextRef = useRef(goNext)
  const goPrevRef = useRef(goPrev)
  useEffect(() => {
    goNextRef.current = goNext
    goPrevRef.current = goPrev
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNextRef.current()
      else if (e.key === "ArrowLeft") goPrevRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // AC5 — fixed-duration auto-advance (both photo and video this pass; see
  // tech-plan.md Known Gaps / Decision Record 5 for the video-natural-duration
  // follow-up).
  useEffect(() => {
    const id = setTimeout(() => {
      goNextRef.current()
    }, STORY_DURATION_MS)
    return () => clearTimeout(id)
  }, [peerIndex, storyIndex])

  useFocusTrap(rootRef, true)
  useBodyScrollLockAndEscape(true, closeAll)

  // usePeriodicTick, not Date.now() directly in render (see its doc comment) —
  // matches DayMailRail/MainShell's existing convention for relative-time display.
  const now = usePeriodicTick(30_000)
  const nowSec = Math.floor(now.getTime() / 1000)
  const mediaMessage = useMemo(() => buildStoryMediaMessage(story, entry.peer), [story, entry.peer])

  const node = (
    <div
      ref={rootRef}
      className="letters-story-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={t("letters.stories.viewerAria", { name: entry.name })}
    >
      <div className="letters-story-viewer__progress" aria-hidden="true">
        {entry.stories.map((s, i) => (
          <span
            key={s.id}
            className={`letters-story-viewer__seg ${
              i < storyIndex
                ? "letters-story-viewer__seg--done"
                : i === storyIndex
                  ? "letters-story-viewer__seg--active"
                  : "letters-story-viewer__seg--upcoming"
            }`}
          >
            <span className="letters-story-viewer__seg-fill" />
          </span>
        ))}
      </div>
      <div className="letters-story-viewer__top">
        <button
          type="button"
          className="letters-story-viewer__close"
          aria-label={t("letters.stories.close")}
          onClick={closeAll}
        >
          ×
        </button>
        <div className="letters-story-viewer__meta">
          <PeerAvatar id={peerKeyFromPeer(entry.peer)} name={entry.name} client={client} size={30} />
          <span className="letters-story-viewer__who">{entry.name}</span>
          <span className="letters-story-viewer__when">{formatStoryAge(story.date, nowSec)}</span>
        </div>
      </div>
      <div className="letters-story-viewer__media">
        <MessageMediaView message={mediaMessage} client={client} noPreview={false} filterGifs={false} t={t} />
        <button
          type="button"
          className="letters-story-viewer__tapzone letters-story-viewer__tapzone--prev"
          aria-label={t("letters.stories.prev")}
          onClick={goPrev}
        />
        <button
          type="button"
          className="letters-story-viewer__tapzone letters-story-viewer__tapzone--next"
          aria-label={t("letters.stories.next")}
          onClick={goNext}
        />
      </div>
      {story.caption ? <div className="letters-story-viewer__caption">{story.caption}</div> : null}
    </div>
  )

  return createPortal(node, getLettersPortalRoot())
}
