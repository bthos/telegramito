import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { LoginView } from "./LoginView"

/**
 * AC-T7 (migrate-teleproto): LoginView states matrix per ux-design.md for the
 * new `email` / `emailCode` / `captchaBlocked` steps (S2–S4), plus AC-T8's
 * typed-error-key rendering. Existing `code` / `2fa` / `idle` coverage is
 * unchanged by this migration and not re-tested here.
 */

const submitEmail = vi.fn()
const submitEmailCode = vi.fn()
const dismissCaptchaBlock = vi.fn()
const startLogin = vi.fn()
const submitCode = vi.fn()
const submit2FA = vi.fn()

let telegramValue: Record<string, unknown> = {}

vi.mock("../context/TelegramContext", () => ({
  useTelegram: () => telegramValue,
}))

function baseValue(overrides: Record<string, unknown>) {
  return {
    startLogin,
    submitCode,
    submit2FA,
    submitEmail,
    submitEmailCode,
    dismissCaptchaBlock,
    isConnecting: false,
    error: null,
    errorKey: null,
    errorSeconds: null,
    loginStep: "idle",
    ...overrides,
  }
}

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          appName: "Telegramito",
          error: "Error",
          loading: "Loading…",
          login: {
            title: "Connect Telegram",
            phone: "Phone number (international)",
            phoneHelp: "Include country code, e.g. +34123456789",
            sendCode: "Send code",
            code: "Login code",
            password: "Two-step password (if enabled)",
            signIn: "Sign in",
            sending: "Connecting…",
            emailHelp: "Telegram needs an email to continue signing in.",
            email: "Email",
            emailContinue: "Continue",
            emailCodeHelp: "Enter the code Telegram sent to your email.",
            emailCode: "Email code",
            emailVerify: "Verify",
            captchaTitle: "Security check required",
            captchaBody: "Telegram asked for a security check.",
            captchaDismiss: "Understood",
            captchaHint: "Captcha challenges are rare.",
            sessionDead: "This saved session is no longer valid. Sign in again with your phone number.",
            floodWait: "Too many attempts. Wait {{seconds}} seconds, then try again.",
            accountRestricted: "This account is restricted by Telegram.",
            emailRequired: "Telegram requires email verification to continue.",
          },
        },
      },
    },
  })
  return inst
}

function renderLoginView() {
  return miniI18n().then((inst) =>
    render(
      <I18nextProvider i18n={inst}>
        <LoginView />
      </I18nextProvider>,
    ),
  )
}

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    telegramValue = baseValue({})
  })

  describe("email step (S2)", () => {
    it("renders the email field with Continue disabled until a valid-looking email is entered", async () => {
      telegramValue = baseValue({ loginStep: "email" })
      await renderLoginView()

      expect(screen.getByText("Telegram needs an email to continue signing in.")).toBeTruthy()
      const continueBtn = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement
      expect(continueBtn.disabled).toBe(true)

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } })
      expect(continueBtn.disabled).toBe(true)

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } })
      expect(continueBtn.disabled).toBe(false)
    })

    it("calls submitEmail with the trimmed address on submit", async () => {
      telegramValue = baseValue({ loginStep: "email" })
      await renderLoginView()

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "  user@example.com  " } })
      fireEvent.click(screen.getByRole("button", { name: "Continue" }))

      expect(submitEmail).toHaveBeenCalledWith("user@example.com")
    })
  })

  describe("emailCode step (S3)", () => {
    it("renders the code field with Verify disabled until non-empty", async () => {
      telegramValue = baseValue({ loginStep: "emailCode" })
      await renderLoginView()

      expect(screen.getByText("Enter the code Telegram sent to your email.")).toBeTruthy()
      const verifyBtn = screen.getByRole("button", { name: "Verify" }) as HTMLButtonElement
      expect(verifyBtn.disabled).toBe(true)

      fireEvent.change(screen.getByLabelText("Email code"), { target: { value: "12345" } })
      expect(verifyBtn.disabled).toBe(false)
    })

    it("calls submitEmailCode with the trimmed code on submit", async () => {
      telegramValue = baseValue({ loginStep: "emailCode" })
      await renderLoginView()

      fireEvent.change(screen.getByLabelText("Email code"), { target: { value: " 54321 " } })
      fireEvent.click(screen.getByRole("button", { name: "Verify" }))

      expect(submitEmailCode).toHaveBeenCalledWith("54321")
    })
  })

  describe("captchaBlocked (S4)", () => {
    it("renders the terminal block screen with role=alert and no phone field", async () => {
      telegramValue = baseValue({ loginStep: "captchaBlocked" })
      await renderLoginView()

      expect(screen.getByRole("alert")).toBeTruthy()
      expect(screen.getByText("Security check required")).toBeTruthy()
      expect(screen.queryByLabelText("Phone number (international)")).toBeNull()
    })

    it("Understood calls dismissCaptchaBlock (D8: retry via idle)", async () => {
      telegramValue = baseValue({ loginStep: "captchaBlocked" })
      await renderLoginView()

      fireEvent.click(screen.getByRole("button", { name: "Understood" }))
      expect(dismissCaptchaBlock).toHaveBeenCalled()
    })
  })

  describe("typed error banner (AC-T8)", () => {
    it("renders login.sessionDead copy instead of the raw error message when errorKey matches", async () => {
      telegramValue = baseValue({
        error: "SESSION_REVOKED (401)",
        errorKey: "sessionDead",
      })
      await renderLoginView()

      expect(
        screen.getByText("This saved session is no longer valid. Sign in again with your phone number.", {
          exact: false,
        }),
      ).toBeTruthy()
      expect(screen.queryByText("SESSION_REVOKED (401)", { exact: false })).toBeNull()
    })

    it("interpolates seconds into login.floodWait", async () => {
      telegramValue = baseValue({
        error: "FLOOD_WAIT_30",
        errorKey: "floodWait",
        errorSeconds: 30,
      })
      await renderLoginView()

      expect(
        screen.getByText("Too many attempts. Wait 30 seconds, then try again.", { exact: false }),
      ).toBeTruthy()
    })

    it("falls back to the raw message for an untyped error", async () => {
      telegramValue = baseValue({ error: "something odd happened" })
      await renderLoginView()

      expect(screen.getByText("something odd happened", { exact: false })).toBeTruthy()
    })
  })
})
