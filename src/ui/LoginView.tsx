import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useTelegram } from "../context/TelegramContext"
import { AuthLayout, Button, PageCard, TextField } from "./ds"

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

  if (errorKey === "api") {
    return (
      <AuthLayout role="alert">
        <PageCard variant="auth">
          <h1>{t("appName")}</h1>
          <p className="muted">{t("apiMissing")}</p>
        </PageCard>
      </AuthLayout>
    )
  }

  const canEditPhone = loginStep === "idle"

  return (
    <AuthLayout>
      <PageCard variant="auth">
        <h1>{t("login.title")}</h1>
        {error
          ? (
              <p className="err">
                {t("error")}: {error}
              </p>
            )
          : null}
        <p className="small muted">{t("login.phoneHelp")}</p>
        <div className="form-row">
          <label>
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
                disabled={isConnecting || !phone || phone.length < 5}
                onClick={() => {
                  void startLogin(phone.trim())
                }}
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
                  <label>
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
                <Button
                  disabled={isConnecting || !code}
                  onClick={() => {
                    submitCode(code.trim())
                  }}
                >
                  {t("login.signIn")}
                </Button>
              </>
            )
          : null}
        {loginStep === "2fa"
          ? (
              <div className="form-row form-stack">
                <label>
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
                <Button
                  disabled={isConnecting || !fa}
                  onClick={() => {
                    submit2FA(fa)
                    setFa("")
                  }}
                >
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
      </PageCard>
    </AuthLayout>
  )
}
