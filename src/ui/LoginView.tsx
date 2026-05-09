import { type FormEvent, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTelegram } from "../context/TelegramContext"
import { AuthLayout, Button, PageCard, TextField } from "./ds"
import { TelegramMark } from "./TelegramMark"

export function LoginView() {
  const { t } = useTranslation()
  const {
    startLogin,
    submitCode,
    submit2FA,
    isConnecting,
    error,
    errorKey,
    loginStep,
  } = useTelegram()
  const [phone, setPhone] = useState("+")
  const [code, setCode] = useState("")
  const [fa, setFa] = useState("")

  const canEditPhone = loginStep === "idle"
  const phoneOk = Boolean(phone && phone.length >= 5)

  function onConnectSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (isConnecting) return

    if (loginStep === "idle") {
      if (!phoneOk) return
      void startLogin(phone.trim())
      return
    }
    if (loginStep === "code") {
      const trimmed = code.trim()
      if (!trimmed) return
      submitCode(trimmed)
      return
    }
    if (loginStep === "2fa") {
      if (!fa) return
      submit2FA(fa)
      setFa("")
    }
  }

  if (errorKey === "api") {
    return (
      <AuthLayout role="alert">
        <PageCard variant="auth">
          <div className="auth-card__header">
            <TelegramMark
              className="auth-card__mark"
              width={56}
              height={56}
              alt={t("appName")}
              title={t("appName")}
            />
            <h1 className="auth-card__title">{t("appName")}</h1>
          </div>
          <p className="muted">{t("apiMissing")}</p>
        </PageCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <PageCard variant="auth">
        <div className="auth-card__header">
          <TelegramMark
            className="auth-card__mark"
            width={56}
            height={56}
            alt={t("appName")}
            title={t("appName")}
          />
          <p className="auth-card__product">{t("appName")}</p>
          <h1 className="auth-card__title">{t("login.title")}</h1>
        </div>
        <form className="auth-card__form" onSubmit={onConnectSubmit}>
          {error
            ? (
                <p className="err">
                  {t("error")}: {error}
                </p>
              )
            : null}
          <p className="small muted">{t("login.phoneHelp")}</p>
          <div className="form-row">
            <label className="auth-card__label">
              {t("login.phone")}
              <TextField
                type="tel"
                name="phone"
                autoComplete="username"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                }}
                disabled={!canEditPhone}
              />
            </label>
          </div>
          {canEditPhone
            ? (
                <Button
                  type="submit"
                  disabled={isConnecting || !phoneOk}
                >
                  {t("login.sendCode")}
                </Button>
              )
            : null}
          {loginStep === "sending" && isConnecting
            ? (
                <p className="small muted" role="status">
                  {t("login.sending")}
                </p>
              )
            : null}
          {loginStep === "code"
            ? (
                <>
                  <div className="form-row">
                    <label className="auth-card__label">
                      {t("login.code")}
                      <TextField
                        name="code"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value)
                        }}
                        disabled={isConnecting}
                      />
                    </label>
                  </div>
                  <Button type="submit" disabled={isConnecting || !code.trim()}>
                    {t("login.signIn")}
                  </Button>
                </>
              )
            : null}
          {loginStep === "2fa"
            ? (
                <div className="form-row form-stack">
                  <label className="auth-card__label">
                    {t("login.password")}
                    <TextField
                      name="2fa"
                      type="password"
                      autoComplete="current-password"
                      value={fa}
                      onChange={(e) => {
                        setFa(e.target.value)
                      }}
                    />
                  </label>
                  <Button type="submit" disabled={isConnecting || !fa}>
                    {t("login.signIn")}
                  </Button>
                </div>
              )
            : null}
          {loginStep === "busy"
            ? (
                <p className="small muted" role="status">
                  {t("loading")}
                </p>
              )
            : null}
        </form>
      </PageCard>
    </AuthLayout>
  )
}
