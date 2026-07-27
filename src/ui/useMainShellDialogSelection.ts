import { useCallback, useEffect, useState } from "react"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { AppMode } from "../parental/types"
import { getPeerInfo, isPrivateUserDialog } from "../telegram/dialogUtils"
import {
  shouldClearDeniedPrivateSelection,
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
  const [lettersDayMailFocusMessageId, setLettersDayMailFocusMessageId] = useState<
    number | null
  >(null)

  const consumeLettersJump = useCallback(() => {
    setLettersDayMailFocusMessageId(null)
  }, [])

  const handleSelectChat = useCallback((d: Dialog) => {
    setLettersDayMailFocusMessageId(null)
    setSelected(d)
  }, [])

  const handleDayMailSelect = useCallback(
    (d: Dialog, focusOpts?: { focusMessageId?: number }) => {
      setSelected(d)
      const fid = focusOpts?.focusMessageId
      setLettersDayMailFocusMessageId(typeof fid === "number" && fid > 0 ? fid : null)
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
      shouldClearDeniedPrivateSelection({
        appMode,
        isPrivateUser: isPrivateUserDialog(selected),
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
    lettersDayMailFocusMessageId,
    consumeLettersJump,
    handleSelectChat,
    handleDayMailSelect,
    handleBulletinSelect,
    clearSelected,
  }
}
