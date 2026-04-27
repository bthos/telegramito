export function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
