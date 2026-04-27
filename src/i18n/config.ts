import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import be from "../locales/be.json"
import en from "../locales/en.json"
import es from "../locales/es.json"
import type { AppLocale } from "../parental/types"
import { LOCALE_STORAGE_KEY, readStoredLocaleSync } from "../parental/storage"

const resources = {
  en: { translation: en },
  es: { translation: es },
  be: { translation: be },
} as const

export const supportedLocales: AppLocale[] = ["en", "es", "be"]

void i18n.use(initReactI18next).init({
  resources: resources as unknown as Record<
    string,
    { translation: Record<string, unknown> }
  >,
  lng: readStoredLocaleSync(),
  fallbackLng: "en",
  supportedLngs: supportedLocales,
  interpolation: { escapeValue: false },
  nonExplicitSupportedLngs: true,
})

export function changeAppLocale(lng: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng)
  } catch {
    /* ignore */
  }
  void i18n.changeLanguage(lng)
}

export { i18n }
