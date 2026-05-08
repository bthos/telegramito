import { useTranslation } from "react-i18next"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { changeAppLocale } from "../i18n/config"
import {
  applyStoredLocaleToDocument,
  getParentalSettings,
  setParentalSettings,
} from "../parental/storage"
import { defaultParentalSettings, type ParentalSettings } from "../parental/types"
import { setAppLogLevel } from "../util/appLogger"

type ParentalContextValue = {
  settings: ParentalSettings
  setSettings: (
    s: ParentalSettings | ((prev: ParentalSettings) => ParentalSettings),
  ) => Promise<void>
  parentUnlocked: boolean
  setParentUnlocked: (v: boolean) => void
  reload: () => Promise<void>
}

const ParentalContext = createContext<ParentalContextValue | null>(null)

export function ParentalProvider({ children }: { children: ReactNode }): React.ReactNode {
  const { t } = useTranslation()
  const [settings, setSt] = useState<ParentalSettings>(defaultParentalSettings)
  const [parentUnlocked, setParentUnlocked] = useState(false)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    await applyStoredLocaleToDocument()
    const s = await getParentalSettings()
    if (s.locale) {
      changeAppLocale(s.locale)
    }
    setAppLogLevel(s.logLevel)
    setSt(s)
    setReady(true)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const setSettings = useCallback(
    async (
      s: ParentalSettings | ((prev: ParentalSettings) => ParentalSettings),
    ) => {
      let next: ParentalSettings
      setSt((prev) => {
        next = typeof s === "function" ? s(prev) : s
        return next
      })
      await setParentalSettings(next!)
      setAppLogLevel(next!.logLevel)
      if (next!.locale) {
        changeAppLocale(next!.locale)
      }
    },
    [],
  )

  const value = useMemo<ParentalContextValue>(
    () => ({
      settings,
      setSettings,
      parentUnlocked,
      setParentUnlocked,
      reload: load,
    }),
    [load, parentUnlocked, setSettings, settings]
  )

  if (!ready) {
    return (
      <div className="app-boot" role="status" aria-live="polite">
        {t("loading")}
      </div>
    )
  }
  return (
    <ParentalContext.Provider value={value}>
      {children}
    </ParentalContext.Provider>
  )
}

export function useParentalSettings(): ParentalContextValue {
  const v = useContext(ParentalContext)
  if (!v) {
    throw new Error("useParentalSettings must be under ParentalProvider")
  }
  return v
}

