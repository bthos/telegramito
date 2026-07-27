import { useCallback, useEffect, useRef, useState } from "react"
import type { TelegramClient } from "telegram"
import type { AppMode } from "../parental/types"
import { isPeerOmittedInChildListForDeny } from "../parental/policy"
import { getAllStories, orderStoryEntries, type StoryPeerEntry } from "../telegram/storiesFeed"

export type StoriesFeedState = "loading" | "refreshing" | "success" | "empty" | "error" | "locked"

export type UseStoriesFeedResult = {
  state: StoriesFeedState
  entries: StoryPeerEntry[]
  refresh: () => void
  markPeerRead: (peerKey: string, maxId: number) => void
}

type Options = {
  client: TelegramClient | null
  nightListHidden: boolean
  appMode: AppMode
  deniedPeerIds: ReadonlySet<string>
}

/**
 * Owns the Stories rail's data: `GetAllStories` fetch, own/unread/read
 * ordering (`orderStoryEntries`), OQ3 night-lock/child-mode gating, and the
 * "never blank on reopen" refresh behavior (ux-design.md).
 */
export function useStoriesFeed({ client, nightListHidden, appMode, deniedPeerIds }: Options): UseStoriesFeedResult {
  const [state, setState] = useState<StoriesFeedState>(() => (nightListHidden ? "locked" : "loading"))
  const [entries, setEntries] = useState<StoryPeerEntry[]>([])
  const genRef = useRef(0)

  const load = useCallback(
    (isRefresh: boolean) => {
      // OQ3: night-lock blocks the fetch entirely — never call GetAllStories,
      // and drop anything already held (privacy: no lingering story data while
      // locked).
      if (nightListHidden) {
        genRef.current += 1
        setState("locked")
        setEntries([])
        return
      }
      if (!client) {
        return
      }
      const gen = ++genRef.current
      setState(isRefresh ? "refreshing" : "loading")
      void getAllStories(client)
        .then(({ entries: raw }) => {
          if (gen !== genRef.current) return
          const visible = raw.filter((e) => {
            if (appMode !== "child") return true
            // OQ3: child-mode deny-list omits denied peers silently —
            // falls through to the plain "empty" state when it was the only
            // entry, matching ux-design.md's privacy requirement (a child
            // can't infer who got filtered).
            return !isPeerOmittedInChildListForDeny(appMode, e.peerKey, deniedPeerIds)
          })
          const ordered = orderStoryEntries(visible)
          setEntries(ordered)
          setState(ordered.length === 0 ? "empty" : "success")
        })
        .catch(() => {
          if (gen !== genRef.current) return
          setEntries([])
          setState("error")
        })
    },
    [client, nightListHidden, appMode, deniedPeerIds],
  )

  useEffect(() => {
    load(false)
  }, [load])

  const refresh = useCallback(() => {
    load(true)
  }, [load])

  const markPeerRead = useCallback((peerKey: string, maxId: number) => {
    setEntries((prev) =>
      orderStoryEntries(
        prev.map((e) => (e.peerKey === peerKey ? { ...e, maxReadId: Math.max(e.maxReadId, maxId) } : e)),
      ),
    )
  }, [])

  return { state, entries, refresh, markPeerRead }
}
