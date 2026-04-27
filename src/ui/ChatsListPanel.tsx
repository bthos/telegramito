import { useTranslation } from "react-i18next"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { ParentalSettings } from "../parental/types"
import { getPeerInfo } from "../telegram/dialogUtils"
import { ChatList } from "./ChatList"
import { TextField } from "./ds"

type Props = {
  search: string
  onSearchChange: (value: string) => void
  nightListHidden: boolean
  dialogs: Dialog[]
  selected: Dialog | null
  onSelect: (d: Dialog) => void
  onRequestForHidden: (d: Dialog) => void
  settings: ParentalSettings
  hasMoreDialogs?: boolean
  loadMoreDialogs?: () => void
  dialogsLoadingMore?: boolean
  /** Total dialogs loaded in session (for list footnote). */
  loadedDialogCount?: number
}

export function ChatsListPanel({
  search,
  onSearchChange,
  nightListHidden,
  dialogs,
  selected,
  onSelect,
  onRequestForHidden,
  settings,
  hasMoreDialogs,
  loadMoreDialogs,
  dialogsLoadingMore,
  loadedDialogCount,
}: Props) {
  const { t } = useTranslation()
  return (
    <>
      <div className="chat-list-toolbar">
        <TextField
          type="search"
          variant="search"
          name="q"
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value)
          }}
          placeholder={t("chat.search")}
          aria-label={t("chat.search")}
          autoComplete="off"
        />
      </div>
      <ChatList
        nightListHidden={nightListHidden}
        dialogs={dialogs}
        onSelect={onSelect}
        selectedKey={selected ? getPeerInfo(selected).key : null}
        onRequestForHidden={onRequestForHidden}
        settings={settings}
        hasMoreDialogs={hasMoreDialogs}
        loadMoreDialogs={loadMoreDialogs}
        dialogsLoadingMore={dialogsLoadingMore}
        loadedDialogCount={loadedDialogCount}
      />
    </>
  )
}
