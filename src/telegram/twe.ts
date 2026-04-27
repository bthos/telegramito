import { Api } from "telegram"

/**
 * `TextWithEntities` in polls / caption fields (and plain string fallbacks in older layers).
 */
export function asTwe(
  t: unknown
): { text: string; entities: Api.TypeMessageEntity[] } {
  if (t && typeof t === "object" && (t as { className?: string }).className === "TextWithEntities") {
    const x = t as Api.TextWithEntities
    return { text: x.text, entities: x.entities ?? [] }
  }
  if (typeof t === "string") {
    return { text: t, entities: [] }
  }
  return { text: "", entities: [] }
}
