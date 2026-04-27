import type { BigInteger } from "big-integer"
import { Api } from "telegram"

export function collectCustomEmojiDocumentIdsFromEntities(
  entities: Api.TypeMessageEntity[] | undefined
): BigInteger[] {
  if (!entities?.length) {
    return []
  }
  const out: BigInteger[] = []
  for (const e of entities) {
    if (e instanceof Api.MessageEntityCustomEmoji) {
      out.push(e.documentId)
    }
  }
  return out
}

export function collectCustomEmojiDocumentIdsFromMessages(
  messages: readonly Api.Message[]
): BigInteger[] {
  const seen = new Set<string>()
  const out: BigInteger[] = []
  for (const m of messages) {
    for (const id of collectCustomEmojiDocumentIdsFromEntities(m.entities)) {
      const k = String(id)
      if (!seen.has(k)) {
        seen.add(k)
        out.push(id)
      }
    }
  }
  return out
}
