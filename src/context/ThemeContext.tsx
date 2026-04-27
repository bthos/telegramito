import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  effectiveTheme,
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

export function ThemeProvider({ children }: { children: ReactNode }): React.ReactNode {
  const [theme, setThemeState] = useState<ThemePreference>(() => readThemePreference())
  const [eff, setEff] = useState<"light" | "dark">(() => effectiveTheme(readThemePreference()))

  const recompute = useCallback((p: ThemePreference) => {
    const r = effectiveTheme(p)
    setEff(r)
    applyToDocument(r)
  }, [])

  useEffect(() => {
    recompute(theme)
  }, [theme, recompute])

  useEffect(() => {
    if (theme !== "system") {
      return
    }
    const mq = matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      const r = effectiveTheme("system")
      setEff(r)
      applyToDocument(r)
    }
    mq.addEventListener("change", onChange)
    return () => {
      mq.removeEventListener("change", onChange)
    }
  }, [theme])

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
