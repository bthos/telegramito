/**
 * Join class names, skipping falsy values. Prefer over template concatenation in DS components.
 */
export function cn(
  ...parts: (string | false | null | undefined | Record<string, boolean>)[]
): string {
  const out: string[] = []
  for (const p of parts) {
    if (p == null || p === false) {
      continue
    }
    if (typeof p === "string" && p.length > 0) {
      out.push(p)
    } else if (typeof p === "object") {
      for (const [k, on] of Object.entries(p)) {
        if (on) {
          out.push(k)
        }
      }
    }
  }
  return out.join(" ")
}
