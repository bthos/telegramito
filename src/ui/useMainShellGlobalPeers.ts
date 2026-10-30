import { useCallback, useMemo, useState } from "react"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { useGlobalPeerSearch } from "../hooks/useGlobalPeerSearch"
import type { ParentalSettings } from "../parental/types"
import type { GlobalPeerHit } from "../telegram/globalPeerSearch"
import { getPeerInfo } from "../telegram/dialogUtils"
import { fetchDialogForEntity } from "../telegram/openNewChat"

export type UseMainShellGlobalPeersOpts = {
  client: TelegramClient | null
  /** Raw masthead search; `useGlobalPeerSearch` trims and debounces it. */
  query: string
  disabled: boolean
  settings: ParentalSettings
  deniedPeerIds: ReadonlySet<string>
  /** Every loaded dialog (unfiltered): peers already in the list belong to «Chats». */
  dialogs: Dialog[]
  refreshDialogs: () => Promise<void>
  /** Open a person's chat (existing dialog, or a fresh one with nobody written yet). */
  onOpenDialog: (d: Dialog) => void
  /** Not-yet-joined public group/channel: hand over to the Join sheet with `@username`. */
  onJoinPublic: (username: string) => void
}

/**
 * «Global search» side of the masthead search: public people/channels from `contacts.Search`
 * plus the one action a hit offers.
 */
export function useMainShellGlobalPeers({
  client,
  query,
  disabled,
  settings,
  deniedPeerIds,
  dialogs,
  refreshDialogs,
  onOpenDialog,
  onJoinPublic,
}: UseMainShellGlobalPeersOpts) {
  const { results, loading, error, retry } = useGlobalPeerSearch({
    client,
    query,
    disabled,
    settings,
    deniedPeerIds,
  })
  const [openError, setOpenError] = useState<string | null>(null)

  const dialogKeys = useMemo(() => new Set(dialogs.map((d) => getPeerInfo(d).key)), [dialogs])

  /** A peer already in the dialog list is shown under «Chats», not twice. */
  const peers = useMemo(
    () => results.filter((hit) => !dialogKeys.has(hit.key)),
    [results, dialogKeys],
  )

  const handleSelect = useCallback(
    (hit: GlobalPeerHit) => {
      setOpenError(null)
      if (hit.kind !== "user") {
        if (hit.username) {
          onJoinPublic(hit.username)
        } else {
          setOpenError(hit.key)
        }
        return
      }
      if (!client) {
        return
      }
      void (async () => {
        try {
          const dialog = await fetchDialogForEntity(client, hit.entity)
          await refreshDialogs()
          onOpenDialog(dialog)
        } catch {
          setOpenError(hit.key)
        }
      })()
    },
    [client, onJoinPublic, onOpenDialog, refreshDialogs],
  )

  return {
    /** Spread straight into `ChatsListPanel` — drives the Global search section. */
    globalPeersPanelProps: {
      globalPeers: peers,
      globalPeersLoading: loading,
      globalPeersError: error,
      globalPeersOpenError: openError,
      onGlobalPeersRetry: retry,
      onGlobalPeerSelect: handleSelect,
    },
  }
}
