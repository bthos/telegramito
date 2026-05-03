import { useCallback, useState } from "react"

/** Telegram upload limit (approximate client-side guard). */
export const TELEGRAM_MAX_UPLOAD_BYTES = 2000 * 1024 * 1024

export type DraftAttachment = {
  id: string
  file: File
  previewUrl: string
  kind: "image" | "video" | "document"
  /** Set when sendFile failed for this item; user can retry. */
  failed?: boolean
}

export function classifyLocalFile(file: File): DraftAttachment["kind"] {
  const t = file.type.toLowerCase()
  if (t.startsWith("image/")) return "image"
  if (t.startsWith("video/")) return "video"
  return "document"
}

function makeDraft(file: File): DraftAttachment {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    kind: classifyLocalFile(file),
  }
}

export function useDraftAttachments() {
  const [attachments, setAttachments] = useState<DraftAttachment[]>([])

  const addFiles = useCallback((files: File[]) => {
    let rejectedCount = 0
    const next: DraftAttachment[] = []
    for (const file of files) {
      if (file.size > TELEGRAM_MAX_UPLOAD_BYTES) {
        rejectedCount++
        continue
      }
      next.push(makeDraft(file))
    }
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next])
    }
    return { rejectedCount }
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const x = prev.find((a) => a.id === id)
      if (x) URL.revokeObjectURL(x.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      for (const a of prev) URL.revokeObjectURL(a.previewUrl)
      return []
    })
  }, [])

  const markFailed = useCallback((id: string, failed: boolean) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, failed } : a)),
    )
  }, [])

  const unlinkWithoutRevoke = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    markFailed,
    unlinkWithoutRevoke,
  }
}
