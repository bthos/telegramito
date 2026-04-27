import type { AppLogLevel } from "../parental/types"

const ORDER: Record<AppLogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

let current: AppLogLevel = "warn"

/**
 * Set runtime log threshold (e.g. from {@link getParentalSettings}).
 */
export function setAppLogLevel(l: AppLogLevel): void {
  current = l
}

export function getAppLogLevel(): AppLogLevel {
  return current
}

function at(min: AppLogLevel): boolean {
  return ORDER[current] >= ORDER[min]
}

/**
 * Filtered console helpers. Stray `console.*` in dependencies is not affected;
 * this is for first-party code that imports `appLog` instead.
 */
export const appLog = {
  error: (...args: unknown[]) => {
    if (at("error")) {
      console.error(...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (at("warn")) {
      console.warn(...args)
    }
  },
  info: (...args: unknown[]) => {
    if (at("info")) {
      console.info(...args)
    }
  },
  debug: (...args: unknown[]) => {
    if (at("debug")) {
      console.debug(...args)
    }
  },
}
