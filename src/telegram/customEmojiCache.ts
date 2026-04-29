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

/** Ordered thumb sizes to try — Telegram packs differ; one size may be TGS another PNG/WebP. */
function thumbTypesToTry(doc: Api.Document): string[] {
  const preferred = pickThumbType(doc)
  const out: string[] = []
  const seen = new Set<string>()
  const push = (t: string) => {
    if (!seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  if (preferred) {
    push(preferred)
  }
  for (const t of THUMB_ORDER) {
    push(t)
  }
  if (doc.thumbs?.length) {
    for (const th of doc.thumbs) {
      const ty = (th as { type?: string }).type
      if (ty) {
        push(ty)
      }
    }
  }
  /* Full document last — often animated TGS; gzip skipped in downloader. */
  push("")
  return out
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
 * Download a displayable raster for an emoji {@link Api.Document} (try several thumb sizes).
 * Skips animated TGS bodies (gzip). Caller supplies a fresh doc from the API (valid file_reference).
 */
async function createRasterObjectUrlFromDocument(
  client: TelegramClient,
  doc: Api.Document,
): Promise<string | null> {
  for (const ts of thumbTypesToTry(doc)) {
    const loc = new Api.InputDocumentFileLocation({
      id: doc.id,
      accessHash: doc.accessHash,
      fileReference: doc.fileReference,
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
      const mime =
        mimeFromRasterHeader(u8) ??
        (mimeForDoc(doc).startsWith("image/") ? mimeForDoc(doc) : "image/webp")
      return URL.createObjectURL(new Blob([u8.slice()], { type: mime }))
    } catch {
      /* try next thumbSize */
    }
  }
  return null
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
    const url = await createRasterObjectUrlFromDocument(client, doc)
    if (url == null) {
      inFlight.delete(idKey)
      return null
    }
    blobByDocId.set(idKey, url)
    inFlight.delete(idKey)
    return url
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
      const u2 = await createRasterObjectUrlFromDocument(client, d)
      if (u2) {
        blobByDocId.set(idKey, u2)
      }
      return u2
    } catch {
      return null
    } finally {
      reactionIconInflight.delete(idKey)
    }
  })()
  reactionIconInflight.set(idKey, p)
  return p
}
