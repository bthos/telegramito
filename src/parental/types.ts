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
  /** When false in child mode, compose attach / outgoing uploads are disabled (see attach-menu spec). */
  allowOutgoingMedia: boolean
  nightMode: NightMode
  allowlistIds: string[]
  pinHash: string | null
  pinSalt: string | null
  locale: AppLocale | null
  logLevel: AppLogLevel
  /** When true, each message bubble shows its Telegram `message.id` (for bug reports). */
  showMessageIds: boolean
  /** First open each day defaults mobile tab to day mail (letters ritual). */
  morningDayMailEnabled: boolean
  /** Long-press send: wax-seal animation + 5s undo before MTProto send. */
  waxSealSendEnabled: boolean
  /** Tier 2 evening «awaiting reply» — fetch capped history (opt-in, default off). */
  eveningSummaryPreciseEnabled: boolean
}

export function defaultParentalSettings(): ParentalSettings {
  return {
    version: 1,
    appMode: "parent",
    blockUnknownPrivate: false,
    hideLinkPreviews: false,
    filterGifs: false,
    allowOutgoingMedia: true,
    nightMode: { enabled: false, start: "22:00", end: "07:00" },
    allowlistIds: [],
    pinHash: null,
    pinSalt: null,
    locale: null,
    logLevel: "warn",
    showMessageIds: false,
    morningDayMailEnabled: true,
    waxSealSendEnabled: false,
    eveningSummaryPreciseEnabled: false,
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
    allowOutgoingMedia:
      typeof s.allowOutgoingMedia === "boolean"
        ? s.allowOutgoingMedia
        : d.allowOutgoingMedia,
    nightMode: { ...d.nightMode, ...s.nightMode },
    logLevel: isAppLogLevel(s.logLevel) ? s.logLevel : d.logLevel,
    showMessageIds:
      typeof s.showMessageIds === "boolean" ? s.showMessageIds : d.showMessageIds,
    morningDayMailEnabled:
      typeof s.morningDayMailEnabled === "boolean"
        ? s.morningDayMailEnabled
        : d.morningDayMailEnabled,
    waxSealSendEnabled:
      typeof s.waxSealSendEnabled === "boolean"
        ? s.waxSealSendEnabled
        : d.waxSealSendEnabled,
    eveningSummaryPreciseEnabled:
      typeof s.eveningSummaryPreciseEnabled === "boolean"
        ? s.eveningSummaryPreciseEnabled
        : d.eveningSummaryPreciseEnabled,
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
