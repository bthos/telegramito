import { Api } from "telegram"

function isApiDocument(x: unknown): x is Api.Document {
  return typeof x === "object" && x !== null
    && (x as { className?: string }).className === "Document"
}

/**
 * Document for media handling: `message.document` is not always set when
 * the payload lives only under `MessageMediaDocument` (e.g. some file sends).
 */
export function getMessageDocument(m: Api.Message): Api.Document | null {
  if (m.document && isApiDocument(m.document)) {
    return m.document as Api.Document
  }
  if (m.media?.className === "MessageMediaDocument") {
    const raw = (m.media as Api.MessageMediaDocument).document
    if (isApiDocument(raw)) {
      return raw
    }
  }
  return null
}

/**
 * `DocumentAttributeFilename` when the message is sent as a file / attachment.
 */
export function getDocumentFileName(d: Api.Document): string | null {
  for (const a of d.attributes ?? []) {
    if (a.className === "DocumentAttributeFilename") {
      const n = (a as Api.DocumentAttributeFilename).fileName
      return typeof n === "string" && n.length > 0 ? n : null
    }
  }
  return null
}

/**
 * Sanitize for the `download` attribute (no path chars).
 */
export function safeFileDownloadName(name: string): string {
  const t0 = name.trim() || "file"
  return t0.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 200) || "file"
}

export function formatDocumentSize(size: unknown): string {
  if (size == null) return ""
  if (typeof size === "object" && size != null) {
    const t = (size as { toString: () => string }).toString().trim()
    const n = Number(t)
    if (!Number.isFinite(n) || n < 0) return ""
    return formatBytesNumber(n)
  }
  const n = typeof size === "bigint" ? Number(size) : Number(size)
  if (!Number.isFinite(n) || n < 0) return ""
  return formatBytesNumber(n)
}

function formatBytesNumber(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
