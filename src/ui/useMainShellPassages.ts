import { useCallback, useMemo, useState } from "react"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { useGlobalMessageSearch } from "../hooks/useGlobalMessageSearch"
import { isPeerOmittedInChildListForDeny } from "../parental/policy"
import type { AppMode } from "../parental/types"
import { getPeerInfo } from "../telegram/dialogUtils"
import { fetchDialogForEntity } from "../telegram/openNewChat"
import type { GlobalSearchCluster, GlobalSearchHit } from "../util/groupGlobalSearchHits"

export type PassageJumpError = { peerKey: string; messageId: number }

export type UseMainShellPassagesOpts = {
  client: TelegramClient | null
  /** Raw masthead search; `useGlobalMessageSearch` trims and debounces it. */
  query: string
  disabled: boolean
  /** Parental gate: in child mode denied peers never reach the UI or the network. */
  appMode: AppMode
  deniedPeerIds: ReadonlySet<string>
  dialogs: Dialog[]
  refreshDialogs: () => Promise<void>
  /** Same jump entry point Day mail and co-reading use (see `useMainShellDialogSelection`). */
  onJumpToDialogMessage: (d: Dialog, opts?: { focusMessageId?: number }) => void
}

function jumpErrorFor(hit: GlobalSearchHit): PassageJumpError {
  return { peerKey: hit.peerKey, messageId: hit.message.id }
}

/**
 * Deny-list gate for one hit. `GlobalSearchHit.peerKey` (`getPeerId(peer, true)`) and the
 * dialog-list key (`getPeerInfo().key`) are both marked ids, so they compare directly.
 */
export function isPassageHitDenied(
  hit: GlobalSearchHit,
  appMode: AppMode,
  deniedPeerIds: ReadonlySet<string>,
): boolean {
  return isPeerOmittedInChildListForDeny(appMode, hit.peerKey, deniedPeerIds)
}

/**
 * Passages side of the masthead search: global message hits plus the two actions
 * they offer — jump to one hit, or hand the whole chat over to in-chat search.
 */
export function useMainShellPassages({
  client,
  query,
  disabled,
  appMode,
  deniedPeerIds,
  dialogs,
  refreshDialogs,
  onJumpToDialogMessage,
}: UseMainShellPassagesOpts) {
  const { results, loading, error, retry } = useGlobalMessageSearch({
    client,
    query,
    disabled,
  })
  const [jumpError, setJumpError] = useState<PassageJumpError | null>(null)
  const [inChatSearchSeed, setInChatSearchSeed] = useState<string | null>(null)

  /** Parental parity with the dialog list: denied peers are omitted, not just unselectable. */
  const allowedResults = useMemo(
    () => results.filter((hit) => !isPassageHitDenied(hit, appMode, deniedPeerIds)),
    [results, appMode, deniedPeerIds],
  )

  /**
   * Hits can point at chats outside the loaded dialog window (OQ2): fall back to
   * `GetPeerDialogs` for the peer, then refresh the list so the selection sticks.
   */
  const resolveHitDialog = useCallback(
    async (hit: GlobalSearchHit): Promise<Dialog | null> => {
      const loaded = dialogs.find((d) => getPeerInfo(d).key === hit.peerKey)
      if (loaded) {
        return loaded
      }
      if (!client) {
        return null
      }
      const inputPeer = await client.getInputEntity(hit.message.peerId)
      const dialog = await fetchDialogForEntity(client, inputPeer)
      await refreshDialogs()
      return dialog
    },
    [client, dialogs, refreshDialogs],
  )

  const handlePassageSelect = useCallback(
    (hit: GlobalSearchHit) => {
      if (isPassageHitDenied(hit, appMode, deniedPeerIds)) {
        return
      }
      setJumpError(null)
      void (async () => {
        try {
          const dialog = await resolveHitDialog(hit)
          if (!dialog) {
            setJumpError(jumpErrorFor(hit))
            return
          }
          onJumpToDialogMessage(dialog, { focusMessageId: hit.message.id })
        } catch {
          setJumpError(jumpErrorFor(hit))
        }
      })()
    },
    [appMode, deniedPeerIds, onJumpToDialogMessage, resolveHitDialog],
  )

  const handlePassagesSeeAll = useCallback(
    (cluster: GlobalSearchCluster) => {
      const hit = cluster.hits[0]
      if (!hit || isPassageHitDenied(hit, appMode, deniedPeerIds)) {
        return
      }
      setJumpError(null)
      void (async () => {
        try {
          const dialog = await resolveHitDialog(hit)
          if (!dialog) {
            setJumpError(jumpErrorFor(hit))
            return
          }
          onJumpToDialogMessage(dialog)
          setInChatSearchSeed(query.trim())
        } catch {
          setJumpError(jumpErrorFor(hit))
        }
      })()
    },
    [appMode, deniedPeerIds, onJumpToDialogMessage, query, resolveHitDialog],
  )

  const consumeInChatSearchSeed = useCallback(() => {
    setInChatSearchSeed(null)
  }, [])

  return {
    /** Spread straight into `ChatsListPanel` — drives the Passages section. */
    passagesPanelProps: {
      passagesResults: allowedResults,
      passagesLoading: loading,
      passagesError: error,
      passagesJumpError: jumpError,
      onPassagesRetry: retry,
      onPassageSelect: handlePassageSelect,
      onPassagesSeeAll: handlePassagesSeeAll,
    },
    lettersInChatSearchSeed: inChatSearchSeed,
    consumeInChatSearchSeed,
  }
}
