import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useParentalSettings } from "../context/ParentalContext"
import { supportedLocales } from "../i18n/config"
import { setNewPin, verifyPin } from "../parental/pin"
import {
  APP_LOG_LEVELS,
  defaultParentalSettings,
  type AppLocale,
  type AppLogLevel,
  type NightMode,
  type ParentalSettings,
} from "../parental/types"
import { Button, Switch, TextField } from "./ds"

const localeLabel: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  be: "Беларуская",
}

type Props = {
  canEdit: boolean
  onRequestPin: () => void
}

export function SettingsView({ canEdit, onRequestPin }: Props) {
  const { t } = useTranslation()
  const { settings, setSettings } = useParentalSettings()
  const [pin0, setPin0] = useState("")
  const [pin1, setPin1] = useState("")
  const [err, setErr] = useState("")
  const [oldPin, setOldPin] = useState("")

  if (!canEdit) {
    return (
      <div className="card settings settings--locked">
        <p className="settings__lede settings__lede--center">{t("mode.childHint")}</p>
        <Button className="settings__unlock" type="button" onClick={onRequestPin}>
          {t("pin.unlock")}
        </Button>
      </div>
    )
  }

  const patchNight = (patch: Partial<NightMode>) => {
    void (async () => {
      const next: ParentalSettings = {
        ...settings,
        nightMode: { ...settings.nightMode, ...patch },
      }
      await setSettings(next)
    })()
  }

  const onLocale = (lng: AppLocale) => {
    void setSettings({ ...settings, locale: lng })
  }

  const onLogLevel = (lvl: AppLogLevel) => {
    void setSettings({ ...settings, logLevel: lvl })
  }

  const savePin = () => {
    if (pin0.length < 4) {
      setErr("min 4")
      return
    }
    if (pin0 !== pin1) {
      setErr("mismatch")
      return
    }
    setErr("")
    void (async () => {
      const h = await setNewPin(pin0)
      await setSettings({
        ...settings,
        pinHash: h.pinHash,
        pinSalt: h.pinSalt,
      })
      setPin0("")
      setPin1("")
    })()
  }

  const tryRemovePin = () => {
    void (async () => {
      if (!settings.pinHash) return
      if (!settings.pinSalt) return
      const p = await verifyPin(oldPin, settings.pinSalt, settings.pinHash)
      if (!p) {
        setErr("bad")
        return
      }
      await setSettings({ ...settings, pinHash: null, pinSalt: null })
      setOldPin("")
    })()
  }

  return (
    <div className="card settings">
      {err
        ? (
            <p className="settings__err-banner" role="status">
              {err}
            </p>
          )
        : null}
      <p className="settings__lede">
        {t("parental.appliesInChildView")}
      </p>

      <section className="settings__section" aria-labelledby="settings-h-night">
        <h2 className="settings__h" id="settings-h-night">
          {t("parental.nightGroup")}
        </h2>
        <div className="settings__section-body">
          <Switch
            idSuffix="night"
            checked={settings.nightMode.enabled}
            onChange={(v) => {
              patchNight({ enabled: v })
            }}
            label={t("parental.nightMode")}
          />
          {settings.nightMode.enabled
            ? (
                <div className="settings__row-inline">
                  <label className="settings__time-field">
                    <span className="settings__time-label">
                      {t("parental.nightStart")}
                    </span>
                    <TextField
                      className="input-small"
                      name="n1"
                      value={settings.nightMode.start}
                      onChange={(e) => {
                        patchNight({ start: e.target.value })
                      }}
                    />
                  </label>
                  <span className="settings__time-sep" aria-hidden>
                    →
                  </span>
                  <label className="settings__time-field">
                    <span className="settings__time-label">
                      {t("parental.nightEnd")}
                    </span>
                    <TextField
                      className="input-small"
                      name="n2"
                      value={settings.nightMode.end}
                      onChange={(e) => {
                        patchNight({ end: e.target.value })
                      }}
                    />
                  </label>
                </div>
              )
            : null}
        </div>
      </section>

      <section className="settings__section" aria-labelledby="settings-h-filters">
        <h2 className="settings__h" id="settings-h-filters">
          {t("filters")}
        </h2>
        <div className="settings__section-body">
          <Switch
            idSuffix="block"
            checked={settings.blockUnknownPrivate}
            onChange={(v) => {
              void setSettings({ ...settings, blockUnknownPrivate: v })
            }}
            label={t("parental.blockUnknownPrivate")}
          />
          <Switch
            idSuffix="hide"
            checked={settings.hideLinkPreviews}
            onChange={(v) => {
              void setSettings({ ...settings, hideLinkPreviews: v })
            }}
            label={t("parental.hideLinkPreviews")}
          />
          <Switch
            idSuffix="gif"
            checked={settings.filterGifs}
            onChange={(v) => {
              void setSettings({ ...settings, filterGifs: v })
            }}
            label={t("parental.filterGifs")}
          />
        </div>
      </section>

      <section className="settings__section" aria-labelledby="settings-h-lang">
        <h2 className="settings__h" id="settings-h-lang">
          {t("language")}
        </h2>
        <label className="settings__select-wrap" htmlFor="settings-lang">
          <select
            id="settings-lang"
            className="input settings__select"
            name="lang"
            value={settings.locale ?? (supportedLocales[0] as AppLocale)}
            onChange={(e) => {
              onLocale(e.target.value as AppLocale)
            }}
          >
            {supportedLocales.map((lng) => {
              return (
                <option key={lng} value={lng}>
                  {localeLabel[lng]}
                </option>
              )
            })}
          </select>
        </label>
      </section>

      <section className="settings__section" aria-labelledby="settings-h-log">
        <h2 className="settings__h" id="settings-h-log">
          {t("logLevel.label")}
        </h2>
        <p className="settings__desc">
          {t("logLevel.hint")}
        </p>
        <label className="settings__select-wrap" htmlFor="settings-log">
          <select
            id="settings-log"
            className="input settings__select"
            name="logLevel"
            value={settings.logLevel}
            onChange={(e) => {
              onLogLevel(e.target.value as AppLogLevel)
            }}
          >
            {APP_LOG_LEVELS.map((lvl) => {
              return (
                <option key={lvl} value={lvl}>
                  {t(`logLevel.level.${lvl}`)}
                </option>
              )
            })}
          </select>
        </label>
      </section>

      <section className="settings__section settings__section--pin" aria-labelledby="settings-h-pin">
        <h2 className="settings__h" id="settings-h-pin">
          {t("pin.set")}
        </h2>
        <p className="settings__desc">
          {t("parental.pinProtectHint")}
        </p>
        <div className="settings__pin-grid">
          <TextField
            name="p1"
            type="password"
            autoComplete="new-password"
            placeholder={t("pin.enter")}
            value={pin0}
            onChange={(e) => {
              setPin0(e.target.value)
            }}
          />
          <TextField
            name="p2"
            type="password"
            autoComplete="new-password"
            placeholder={t("pin.enter")}
            value={pin1}
            onChange={(e) => {
              setPin1(e.target.value)
            }}
          />
          <Button className="settings__btn-wide" type="button" onClick={savePin}>
            {t("pin.save")}
          </Button>
          {settings.pinHash
            ? (
                <div className="settings__remove-pin">
                  <TextField
                    type="password"
                    value={oldPin}
                    autoComplete="current-password"
                    placeholder={t("pin.current")}
                    onChange={(e) => {
                      setOldPin(e.target.value)
                    }}
                    aria-label={t("pin.current")}
                  />
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={tryRemovePin}
                  >
                    {t("pin.remove")}
                  </Button>
                </div>
              )
            : null}
        </div>
      </section>

      <div className="settings__footer">
        <Button
          variant="ghost"
          className="settings__reset"
          type="button"
          onClick={() => {
            const d = defaultParentalSettings()
            void setSettings({
              ...d,
              locale: settings.locale ?? d.locale,
            })
          }}
        >
          {t("resetDefaults")}
        </Button>
      </div>
    </div>
  )
}
