import { useCallback, useEffect, useState } from "react"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { AppMode } from "../parental/types"
import { getPeerInfo } from "../telegram/dialogUtils"
import { localCalendarDayKey, resolveMorningMobileTab } from "../util/lettersRituals"
import {
  getCoReadingBookmarks,
  getLastMorningDayMailDate,
  setLastMorningDayMailDate,
  type CoReadingBookmark,
} from "../util/lettersRitualsStorage"
import type { MobileShellTab } from "./LettersMobileTabBar"
import { resolveMobileTabSelect } from "./mainShellMobileTabOrchestration"

export type MainShellTab = "chats" | "settings" | "requests"

export type UseMainShellMobileChromeOpts = {
  mobileCompact: boolean
  tab: MainShellTab
  morningDayMailEnabled: boolean
  appMode: AppMode
  dialogs: Dialog[]
  handleDayMailSelect: (d: Dialog, opts?: { focusMessageId?: number }) => void
}

export function useMainShellMobileChrome(opts: UseMainShellMobileChromeOpts) {
  const {
    mobileCompact,
    tab,
    morningDayMailEnabled,
    appMode,
    dialogs,
    handleDayMailSelect,
  } = opts

  const [mobileTab, setMobileTab] = useState<MobileShellTab>("letters")
  const [deskSheetOpen, setDeskSheetOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [dayMailSlideOpen, setDayMailSlideOpen] = useState(false)
  const [coReadingBookmarks, setCoReadingBookmarks] = useState<CoReadingBookmark[]>([])

  useEffect(() => {
    if (!mobileCompact || tab !== "chats") {
      return
    }
    let cancelled = false
    void (async () => {
      const [lastDate, bookmarks] = await Promise.all([
        getLastMorningDayMailDate(),
        getCoReadingBookmarks(),
      ])
      if (cancelled) {
        return
      }
      setCoReadingBookmarks(bookmarks)
      const today = localCalendarDayKey()
      const nextTab = resolveMorningMobileTab({
        enabled: morningDayMailEnabled,
        lastMorningDayMailDate: lastDate,
        today,
      })
      if (nextTab === "dayMail") {
        setMobileTab("dayMail")
        await setLastMorningDayMailDate(today)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mobileCompact, tab, morningDayMailEnabled])

  const refreshCoReadingBookmarks = useCallback(async () => {
    const bookmarks = await getCoReadingBookmarks()
    setCoReadingBookmarks(bookmarks)
  }, [])

  useEffect(() => {
    if (deskSheetOpen && appMode === "parent") {
      void refreshCoReadingBookmarks()
    }
  }, [deskSheetOpen, refreshCoReadingBookmarks, appMode])

  const handleMobileTabSelect = useCallback((next: MobileShellTab) => {
    const result = resolveMobileTabSelect(next)
    if (result.kind === "openDesk") {
      setDeskSheetOpen(true)
      return
    }
    setMobileTab(result.tab)
    setDeskSheetOpen(false)
  }, [])

  const handleCoReadingNavigate = useCallback(
    (bookmark: CoReadingBookmark) => {
      const di = dialogs.find((x) => getPeerInfo(x).key === bookmark.chatId)
      if (!di) {
        return
      }
      handleDayMailSelect(di, { focusMessageId: bookmark.messageId })
      setDeskSheetOpen(false)
      if (mobileCompact) {
        setMobileTab("letters")
      }
    },
    [dialogs, handleDayMailSelect, mobileCompact],
  )

  return {
    mobileTab,
    deskSheetOpen,
    setDeskSheetOpen,
    searchExpanded,
    setSearchExpanded,
    dayMailSlideOpen,
    setDayMailSlideOpen,
    coReadingBookmarks,
    refreshCoReadingBookmarks,
    handleMobileTabSelect,
    handleCoReadingNavigate,
  }
}
