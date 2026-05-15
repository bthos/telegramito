/**
 * Prose calendar line (“Friday, the fifteenth of May”) for letters chrome.
 * English-only; other locales fall back to `Intl.DateTimeFormat` long date.
 */
const ORDINAL_WORD: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "eighth",
  9: "ninth",
  10: "tenth",
  11: "eleventh",
  12: "twelfth",
  13: "thirteenth",
  14: "fourteenth",
  15: "fifteenth",
  16: "sixteenth",
  17: "seventeenth",
  18: "eighteenth",
  19: "nineteenth",
  20: "twentieth",
  21: "twenty-first",
  22: "twenty-second",
  23: "twenty-third",
  24: "twenty-fourth",
  25: "twenty-fifth",
  26: "twenty-sixth",
  27: "twenty-seventh",
  28: "twenty-eighth",
  29: "twenty-ninth",
  30: "thirtieth",
  31: "thirty-first",
}

const WEEKDAY: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
}

const MONTH: Record<number, string> = {
  0: "January",
  1: "February",
  2: "March",
  3: "April",
  4: "May",
  5: "June",
  6: "July",
  7: "August",
  8: "September",
  9: "October",
  10: "November",
  11: "December",
}

export function formatLiteraryDateLine(now: Date, locale: string): string {
  if (!locale.toLowerCase().startsWith("en")) {
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(now)
    } catch {
      // fall through to English literary
    }
  }

  const wd = WEEKDAY[now.getDay()]
  const day = now.getDate()
  const ord = ORDINAL_WORD[day]
  const mo = MONTH[now.getMonth()]
  if (wd && ord && mo) {
    return `${wd}, the ${ord} of ${mo}`
  }
  return now.toDateString()
}
