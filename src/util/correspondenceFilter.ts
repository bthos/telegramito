import { Api } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"

/** Raw TL dialog attached to the custom Dialog wrapper (GramJS). */
export function getDialogRecord(d: Dialog): Api.Dialog | undefined {
  const dr = (d as unknown as { dialog?: Api.Dialog }).dialog
  return dr?.className === "Dialog" ? dr : undefined
}

/** Archive folder id used by Telegram for “returned” / archived chats. */
const ARCHIVE_FOLDER_ID = 1

export function dialogIsArchived(d: Dialog): boolean {
  const r = getDialogRecord(d)
  return r?.folderId === ARCHIVE_FOLDER_ID
}

export function dialogHasDraft(d: Dialog): boolean {
  const r = getDialogRecord(d)
  const dr = r?.draft
  if (dr == null) {
    return false
  }
  if (dr.className === "DraftMessageEmpty") {
    return false
  }
  return true
}

export type CorrespondenceTab = "letters" | "drafts" | "returned"

export function filterDialogsByCorrespondenceTab(
  dialogs: Dialog[],
  tab: CorrespondenceTab,
): Dialog[] {
  if (tab === "returned") {
    return dialogs.filter(dialogIsArchived)
  }
  if (tab === "drafts") {
    return dialogs.filter(dialogHasDraft)
  }
  return dialogs.filter((d) => !dialogIsArchived(d))
}
