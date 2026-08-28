import { render, screen, fireEvent } from "@testing-library/react"
import { I18nextProvider, initReactI18next } from "react-i18next"
import i18n from "i18next"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { EphemeralNoticeRibbon } from "./EphemeralNoticeRibbon"

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          chat: {
            ephemeralNotice: "Disappearing messages aren’t shown here.",
            ephemeralNoticeDismiss: "Dismiss",
          },
        },
      },
    },
  })
})

describe("EphemeralNoticeRibbon", () => {
  it("is a polite status, not an alert, and dismisses on click (AC-E2)", () => {
    const onDismiss = vi.fn()
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <EphemeralNoticeRibbon onDismiss={onDismiss} />
      </I18nextProvider>,
    )
    const ribbon = container.querySelector(".ephemeral-ribbon") as HTMLElement
    expect(ribbon.getAttribute("role")).toBe("status")
    expect(ribbon.querySelector('[role="alert"]')).toBeNull()
    expect(screen.getByText("Disappearing messages aren’t shown here.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
