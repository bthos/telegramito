/**
 * Get API credentials from Vite env (set in .env: VITE_TELEGRAM_API_ID, VITE_TELEGRAM_API_HASH).
 */
export function getApiCredentials():
  | { ok: true; apiId: number; apiHash: string }
  | { ok: false; reason: "missing" } {
  const idRaw = import.meta.env.VITE_TELEGRAM_API_ID as string | undefined
  const hash = import.meta.env.VITE_TELEGRAM_API_HASH as string | undefined
  if (!idRaw || !hash || hash.length < 8) {
    return { ok: false, reason: "missing" }
  }
  const apiId = Number(idRaw)
  if (Number.isNaN(apiId) || apiId <= 0) {
    return { ok: false, reason: "missing" }
  }
  return { ok: true, apiId, apiHash: hash.trim() }
}
