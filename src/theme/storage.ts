export const THEME_STORAGE_KEY = "telegramito-theme" as const

export type ThemePreference = "light" | "dark" | "system"

const LEGAL = new Set<ThemePreference>(["light", "dark", "system"])

export function readThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v && LEGAL.has(v as ThemePreference)) {
      return v as ThemePreference
    }
  } catch {
    /* */
  }
  return "system"
}

export function writeThemePreference(p: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, p)
  } catch {
    /* */
  }
}

/** Resolved attribute for `document.documentElement` and CSS. */
export function effectiveTheme(p: ThemePreference): "light" | "dark" {
  if (p === "system") {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return p
}
