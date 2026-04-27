export type AppLocale = "en" | "es" | "be"

export type AppMode = "child" | "parent"

/** App diagnostics; controls `appLog` output to the browser console. */
export const APP_LOG_LEVELS = ["silent", "error", "warn", "info", "debug"] as const
export type AppLogLevel = (typeof APP_LOG_LEVELS)[number]

export type NightMode = {
  enabled: boolean
  /** Local time "HH:MM" 24h */
  start: string
  end: string
}

export type ParentalSettings = {
  version: 1
  appMode: AppMode
  blockUnknownPrivate: boolean
  hideLinkPreviews: boolean
  filterGifs: boolean
  nightMode: NightMode
  allowlistIds: string[]
  pinHash: string | null
  pinSalt: string | null
  locale: AppLocale | null
  logLevel: AppLogLevel
}

export function defaultParentalSettings(): ParentalSettings {
  return {
    version: 1,
    appMode: "parent",
    blockUnknownPrivate: false,
    hideLinkPreviews: false,
    filterGifs: false,
    nightMode: { enabled: false, start: "22:00", end: "07:00" },
    allowlistIds: [],
    pinHash: null,
    pinSalt: null,
    locale: null,
    logLevel: "warn",
  }
}

function isAppLogLevel(x: unknown): x is AppLogLevel {
  return typeof x === "string" && (APP_LOG_LEVELS as readonly string[]).includes(x)
}

/** Merge with defaults (new fields, nested nightMode). */
export function normalizeParentalSettings(
  s: ParentalSettings | (Partial<ParentalSettings> & { version: 1 })
): ParentalSettings {
  const d = defaultParentalSettings()
  return {
    ...d,
    ...s,
    nightMode: { ...d.nightMode, ...s.nightMode },
    logLevel: isAppLogLevel(s.logLevel) ? s.logLevel : d.logLevel,
  }
}

export type PendingRequest = {
  id: string
  createdAt: number
  kind: "chat"
  targetId: string
  title: string
  status: "pending" | "approved" | "denied"
}
