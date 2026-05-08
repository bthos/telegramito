/**
 * Best-effort display string from a GramJS entity object (User / Chat / Channel).
 * Used wherever we resolve peers without full TL typing.
 */
export function telegramEntityDisplayName(entity: unknown): string {
  if (entity == null || typeof entity !== "object") return ""
  const e = entity as Record<string, unknown>
  if (typeof e.firstName === "string" || typeof e.lastName === "string") {
    return [e.firstName, e.lastName]
      .filter((p): p is string => typeof p === "string" && p.trim() !== "")
      .join(" ")
  }
  if (typeof e.title === "string" && e.title.trim() !== "") return e.title.trim()
  if (typeof e.username === "string" && e.username.trim() !== "") return e.username.trim()
  return ""
}
