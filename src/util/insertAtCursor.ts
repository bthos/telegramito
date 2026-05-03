export type TextAreaSelection = { start: number; end: number }

/**
 * Splices `text` into the value at selection, replacing the selected range.
 * If `selection` is omitted, uses the textarea's current selection (may be stale if blurred).
 */
export function insertAtCursor(
  textarea: HTMLTextAreaElement,
  text: string,
  selection?: TextAreaSelection,
): { newValue: string; newCursorPos: number } {
  const start = selection?.start ?? textarea.selectionStart
  const end = selection?.end ?? textarea.selectionEnd
  const value = textarea.value
  const safeStart = Math.max(0, Math.min(start, value.length))
  const safeEnd = Math.max(safeStart, Math.min(end, value.length))
  const newValue = value.slice(0, safeStart) + text + value.slice(safeEnd)
  const newCursorPos = safeStart + text.length
  return { newValue, newCursorPos }
}
