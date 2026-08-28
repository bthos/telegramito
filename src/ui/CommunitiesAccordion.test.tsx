/**
 * communities-dialogs (AC-C2 / AC-C3): the Communities accordion renders
 * nothing when dormant, shows stub rows + count when communities exist, and a
 * row opens the honest limitation sheet (never a ChatView).
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { I18nextProvider, initReactI18next } from "react-i18next"
import i18n from "i18next"
import { beforeAll, describe, expect, it } from "vitest"
import { CommunitiesAccordion } from "./CommunitiesAccordion"
import type { CommunityStub } from "../telegram/communityDialogs"

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          common: { close: "Close" },
          letters: {
            communities: {
              sectionLabel: "Communities",
              badge: "Community",
              rowAria: "{{title}} — community",
              muted: "Muted",
              sub: "Shared spaces",
              subForbidden: "Access may be restricted",
              sheetAria: "{{title}} details",
              unavailableTitle: "Unavailable community",
              body: "Not fully supported yet.",
              bodyForbidden: "You may not have access.",
              openTelegram: "Open in Telegram",
            },
          },
        },
      },
    },
  })
})

function stub(over: Partial<CommunityStub> = {}): CommunityStub {
  return {
    id: "1842",
    title: "Neighborhood Hub",
    titleFromIdFallback: false,
    forbidden: false,
    pinned: false,
    muted: false,
    ...over,
  }
}

const wrap = (ui: React.ReactElement) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)

describe("CommunitiesAccordion", () => {
  it("renders nothing when there are no communities (dormant)", () => {
    const { container } = wrap(<CommunitiesAccordion communities={[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows a titled row with a Community badge and the count", () => {
    wrap(<CommunitiesAccordion communities={[stub(), stub({ id: "2", title: "Other" })]} />)
    expect(screen.getByText("Neighborhood Hub")).toBeTruthy()
    expect(screen.getAllByText("Community").length).toBeGreaterThan(0)
    expect(screen.getByText("2")).toBeTruthy()
  })

  it("opens the limitation sheet on row click — with Open in Telegram, no ChatView", () => {
    wrap(<CommunitiesAccordion communities={[stub()]} />)
    fireEvent.click(screen.getByRole("button", { name: /Neighborhood Hub/ }))
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeTruthy()
    const cta = screen.getByText("Open in Telegram").closest("a") as HTMLAnchorElement
    expect(cta.getAttribute("href")).toBe("https://web.telegram.org/")
    expect(cta.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("forbidden community with id-fallback title uses the 'Unavailable community' heading", () => {
    wrap(
      <CommunitiesAccordion
        communities={[stub({ forbidden: true, titleFromIdFallback: true, title: "#7" })]}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /#7/ }))
    expect(screen.getByText("Unavailable community")).toBeTruthy()
    expect(screen.getByText("You may not have access.")).toBeTruthy()
  })
})
