import type { BigInteger } from "big-integer"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"

const PREFETCH_CHUNK = 80

const blobByDocId = new Map<string, string>()
const inFlight = new Map<string, Promise<string | null>>()

function bufferLikeToU8(buf: unknown): Uint8Array {
  if (buf instanceof Uint8Array) {
    return buf
  }
  if (ArrayBuffer.isView(buf)) {
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  if (buf instanceof ArrayBuffer) {
    return new Uint8Array(buf)
  }
  return new Uint8Array(0)
}

const THUMB_ORDER = ["m", "a", "s", "b", "x", "c", "y", "d", "w"] as const

function pickThumbType(doc: Api.Document): string {
  for (const type of THUMB_ORDER) {
    const hit = (doc.thumbs || []).find(
      (t) => (t as { type?: string }).type === type
    )
    if (hit) {
      return type
    }
  }
  if (doc.thumbs?.length) {
    const t = doc.thumbs[doc.thumbs.length - 1] as { type?: string }
    if (t.type) {
      return t.type
    }
  }
  return ""
}

function mimeForDoc(doc: Api.Document): string {
  const m = (doc as { mimeType?: string }).mimeType
  if (m && m.startsWith("image/")) {
    return m
  }
  if ((doc as { fileName?: string }).fileName?.toLowerCase().endsWith(".webp")) {
    return "image/webp"
  }
  if ((doc as { fileName?: string }).fileName?.toLowerCase().endsWith(".png")) {
    return "image/png"
  }
  return "image/webp"
}

/**
 * Fetches a small sticker/thumbnail for a Telegram custom emoji and returns
 * an object URL (cached in-memory). Caller should not revoke; cache is global.
 */
export function getCustomEmojiObjectUrl(
  client: TelegramClient,
  documentId: BigInteger
): Promise<string | null> {
  const idKey = String(documentId)
  if (blobByDocId.has(idKey)) {
    return Promise.resolve(blobByDocId.get(idKey) ?? null)
  }
  const ex = inFlight.get(idKey)
  if (ex) {
    return ex
  }
  const p = (async () => {
    let res: Api.TypeDocument[]
    try {
      res = (await client.invoke(
        new Api.messages.GetCustomEmojiDocuments({
          documentId: [documentId],
        })
      )) as Api.TypeDocument[]
    } catch {
      inFlight.delete(idKey)
      return null
    }
    const d = res[0]
    if (!d || d.className !== "Document") {
      inFlight.delete(idKey)
      return null
    }
    const doc = d as Api.Document
    const ts = pickThumbType(doc)
    const loc = new Api.InputDocumentFileLocation({
      id: doc.id,
      accessHash: doc.accessHash,
      fileReference: doc.fileReference,
      thumbSize: ts,
    })
    try {
      const buf = await client.downloadFile(loc, {})
      if (buf == null) {
        inFlight.delete(idKey)
        return null
      }
      const u8 = bufferLikeToU8(buf)
      const blob = new Blob([u8.slice()], { type: mimeForDoc(doc) })
      const url = URL.createObjectURL(blob)
      blobByDocId.set(idKey, url)
      inFlight.delete(idKey)
      return url
    } catch {
      inFlight.delete(idKey)
      return null
    }
  })()
  inFlight.set(idKey, p)
  return p
}

/**
 * Warms the in-memory custom-emoji cache for many ids (e.g. visible message page)
 * using a single {@link Api.messages.GetCustomEmojiDocuments} round-trip per chunk.
 */
export async function prefetchCustomEmojiDocuments(
  client: TelegramClient,
  documentIds: readonly BigInteger[]
): Promise<void> {
  const unique: BigInteger[] = []
  const seen = new Set<string>()
  for (const id of documentIds) {
    const k = String(id)
    if (seen.has(k)) {
      continue
    }
    seen.add(k)
    unique.push(id)
  }
  for (let i = 0; i < unique.length; i += PREFETCH_CHUNK) {
    const chunk = unique.slice(i, i + PREFETCH_CHUNK)
    try {
      await client.invoke(
        new Api.messages.GetCustomEmojiDocuments({
          documentId: chunk,
        })
      )
    } catch {
      continue
    }
    for (const id of chunk) {
      void getCustomEmojiObjectUrl(client, id)
    }
  }
}

const reactionIconInflight = new Map<string, Promise<string | null>>()

function looksLikeGzipLottieOrTgs(u8: Uint8Array): boolean {
  return u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b
}

function mimeFromRasterHeader(u8: Uint8Array): string | null {
  if (u8.length < 3) {
    return null
  }
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e) {
    return "image/png"
  }
  if (u8[0] === 0xff && u8[1] === 0xd8) {
    return "image/jpeg"
  }
  if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) {
    return "image/gif"
  }
  if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8.length >= 12) {
    return "image/webp"
  }
  return null
}

/**
 * Icon for a reaction in the picker (3D / custom emoji from {@link Api.AvailableReaction}):
 * 1) same path as message custom emoji; 2) thumb from the inline `Document` from the API.
 * Prefer {@link Api.AvailableReaction.centerIcon} for display when present.
 */
export function getReactionStaticIconObjectUrl(
  client: TelegramClient,
  doc: Api.TypeDocument | undefined
): Promise<string | null> {
  if (doc == null || doc.className !== "Document") {
    return Promise.resolve(null)
  }
  const d = doc as Api.Document
  if (d.id == null) {
    return Promise.resolve(null)
  }
  const idKey = String(d.id)
  if (blobByDocId.has(idKey)) {
    return Promise.resolve(blobByDocId.get(idKey) ?? null)
  }
  const infl = reactionIconInflight.get(idKey)
  if (infl) {
    return infl
  }
  const p = (async () => {
    try {
      const u = await getCustomEmojiObjectUrl(client, d.id)
      if (u) {
        return u
      }
      const byType = (doc: Api.Document): string[] => {
        const t = pickThumbType(doc)
        if (t) {
          return [...new Set([t, ...THUMB_ORDER])] as string[]
        }
        return [...THUMB_ORDER] as string[]
      }
      for (const ts of byType(d)) {
        const loc = new Api.InputDocumentFileLocation({
          id: d.id,
          accessHash: d.accessHash,
          fileReference: d.fileReference,
          thumbSize: ts,
        })
        try {
          const raw = await client.downloadFile(loc, {})
          if (raw == null) {
            continue
          }
          const u8 = bufferLikeToU8(raw)
          if (u8.length === 0 || looksLikeGzipLottieOrTgs(u8)) {
            continue
          }
          const t = mimeFromRasterHeader(u8) ?? (
            mimeForDoc(d).startsWith("image/") ? mimeForDoc(d) : "image/webp"
          )
          const url = URL.createObjectURL(new Blob([u8.slice()], { type: t }))
          blobByDocId.set(idKey, url)
          return url
        } catch {
          /* */
        }
      }
      return null
    } catch {
      return null
    } finally {
      reactionIconInflight.delete(idKey)
    }
  })()
  reactionIconInflight.set(idKey, p)
  return p
}
