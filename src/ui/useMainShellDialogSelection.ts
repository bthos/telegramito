import { useCallback, useEffect, useState } from "react"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { AppMode } from "../parental/types"
import { getPeerInfo } from "../telegram/dialogUtils"
import {
  shouldClearDeniedPeerSelection,
  shouldClearSelectionForNightLock,
  shouldRetainSelectedDialog,
} from "./mainShellDialogSelection"

export type UseMainShellDialogSelectionOpts = {
  dialogs: Dialog[]
  dialogsEligibleToRetainSelection: Dialog[]
  appMode: AppMode
  deniedPeerIds: ReadonlySet<string>
  nightHidden: boolean
}

export function useMainShellDialogSelection(opts: UseMainShellDialogSelectionOpts) {
  const { dialogs, dialogsEligibleToRetainSelection, appMode, deniedPeerIds, nightHidden } =
    opts

  const [selected, setSelected] = useState<Dialog | null>(null)
  const [lettersFocusMessageId, setLettersFocusMessageId] = useState<number | null>(null)

  const consumeLettersJump = useCallback(() => {
    setLettersFocusMessageId(null)
  }, [])

  const handleSelectChat = useCallback((d: Dialog) => {
    setLettersFocusMessageId(null)
    setSelected(d)
  }, [])

  /** Select a dialog and optionally focus one message in it (day mail, co-reading, Passages). */
  const handleJumpToDialogMessage = useCallback(
    (d: Dialog, focusOpts?: { focusMessageId?: number }) => {
      setSelected(d)
      const fid = focusOpts?.focusMessageId
      setLettersFocusMessageId(typeof fid === "number" && fid > 0 ? fid : null)
    },
    [],
  )

  const handleBulletinSelect = useCallback(
    (peerKey: string) => {
      const di = dialogs.find((x) => getPeerInfo(x).key === peerKey)
      if (di) {
        handleSelectChat(di)
      }
    },
    [dialogs, handleSelectChat],
  )

  const clearSelected = useCallback(() => {
    setSelected(null)
  }, [])

  useEffect(() => {
    if (!selected) {
      return
    }
    const sk = getPeerInfo(selected).key
    const eligibleKeys = dialogsEligibleToRetainSelection.map((d) => getPeerInfo(d).key)
    const loadedKeys = dialogs.map((d) => getPeerInfo(d).key)
    if (!shouldRetainSelectedDialog({ selectedKey: sk, eligibleKeys, loadedKeys })) {
      queueMicrotask(() => {
        setSelected(null)
      })
    }
  }, [dialogs, dialogsEligibleToRetainSelection, selected])

  useEffect(() => {
    if (!selected) {
      return
    }
    const { key } = getPeerInfo(selected)
    if (
      shouldClearDeniedPeerSelection({
        appMode,
        peerKey: key,
        deniedPeerIds,
      })
    ) {
      queueMicrotask(() => {
        setSelected(null)
      })
    }
  }, [deniedPeerIds, selected, appMode])

  useEffect(() => {
    if (
      shouldClearSelectionForNightLock({
        nightHidden,
        appMode,
        hasSelection: selected != null,
      })
    ) {
      queueMicrotask(() => {
        setSelected((s) => (s != null ? null : s))
      })
    }
  }, [nightHidden, appMode, selected])

  return {
    selected,
    setSelected,
    lettersFocusMessageId,
    consumeLettersJump,
    handleSelectChat,
    handleJumpToDialogMessage,
    handleBulletinSelect,
    clearSelected,
  }
}
