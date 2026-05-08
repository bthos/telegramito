import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  type ThemePreference,
  readThemePreference,
  writeThemePreference,
} from "../theme/storage"

type ThemeContextValue = {
  /** User choice: light, dark, or follow OS. */
  theme: ThemePreference
  /** Resolved palette: what `data-theme` on &lt;html&gt; uses. */
  effectiveTheme: "light" | "dark"
  setTheme: (t: ThemePreference) => void
}

const Ctx = createContext<ThemeContextValue | null>(null)

function applyToDocument(resolved: "light" | "dark") {
  const d = document.documentElement
  d.setAttribute("data-theme", resolved)
  d.style.colorScheme = resolved
}

/** Subscribes only while {@link theme} is `"system"` so explicit light/dark does not re-render on OS changes. */
function useSystemPrefersDark(theme: ThemePreference): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (theme !== "system") {
      return () => {}
    }
    const mq = matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", onStoreChange)
    return () => mq.removeEventListener("change", onStoreChange)
  }, [theme])

  const getSnapshot = useCallback(() => {
    if (theme !== "system") {
      return false
    }
    return matchMedia("(prefers-color-scheme: dark)").matches
  }, [theme])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

export function ThemeProvider({ children }: { children: ReactNode }): React.ReactNode {
  const [theme, setThemeState] = useState<ThemePreference>(() => readThemePreference())
  const systemDark = useSystemPrefersDark(theme)

  const eff = useMemo((): "light" | "dark" => {
    if (theme === "system") {
      return systemDark ? "dark" : "light"
    }
    return theme
  }, [theme, systemDark])

  useLayoutEffect(() => {
    applyToDocument(eff)
  }, [eff])

  const setTheme = useCallback((p: ThemePreference) => {
    setThemeState(p)
    writeThemePreference(p)
  }, [])

  const value = useMemo(
    () => ({ theme, effectiveTheme: eff, setTheme }),
    [theme, eff, setTheme]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeContextValue {
  const v = useContext(Ctx)
  if (v == null) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return v
}
