import type { Dialog } from "telegram/tl/custom/dialog"
import {
  filterDialogsByCorrespondenceTab,
  type CorrespondenceTab,
} from "../util/correspondenceFilter"
import { getDialogDraftDate } from "../util/dialogDraft"

export const LETTERS_COMPOSE_TEXTAREA_ID = "letters-compose-textarea"

export type LettersWriteAction =
  | { kind: "focus" }
  | { kind: "select"; dialog: Dialog; correspondenceTab: CorrespondenceTab }
  | { kind: "search" }

function pickMostRecentByDate(dialogs: readonly Dialog[]): Dialog {
  return [...dialogs].sort((a, b) => (b.date ?? 0) - (a.date ?? 0))[0]!
}

function pickMostRecentDraft(dialogs: readonly Dialog[]): Dialog {
  return [...dialogs].sort(
    (a, b) => getDialogDraftDate(b) - getDialogDraftDate(a),
  )[0]!
}

/** Decide what Write should do given current selection and eligible dialogs. */
export function resolveLettersWriteAction(opts: {
  selected: Dialog | null
  dialogs: readonly Dialog[]
}): LettersWriteAction {
  if (opts.selected) {
    return { kind: "focus" }
  }

  const drafts = filterDialogsByCorrespondenceTab([...opts.dialogs], "drafts")
  if (drafts.length > 0) {
    return {
      kind: "select",
      dialog: pickMostRecentDraft(drafts),
      correspondenceTab: "drafts",
    }
  }

  const letters = filterDialogsByCorrespondenceTab([...opts.dialogs], "letters")
  if (letters.length > 0) {
    return {
      kind: "select",
      dialog: pickMostRecentByDate(letters),
      correspondenceTab: "letters",
    }
  }

  return { kind: "search" }
}

/** Focus the letters composer once it appears (e.g. after opening a thread). */
export function focusLettersComposer(): void {
  const id = LETTERS_COMPOSE_TEXTAREA_ID
  let attempts = 0
  const maxAttempts = 24

  const tick = () => {
    const el = document.getElementById(id)
    if (el instanceof HTMLTextAreaElement) {
      el.focus()
      return
    }
    attempts += 1
    if (attempts < maxAttempts) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}
