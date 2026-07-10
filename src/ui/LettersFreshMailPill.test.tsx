import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LettersFreshMailPill } from "./LettersFreshMailPill"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: string }) => {
      if (key === "letters.freshMail") return `▾ fresh mail · ${opts?.count ?? ""}`
      if (key === "letters.freshMailAria") return `Jump to fresh mail, ${opts?.count ?? ""} waiting`
      return key
    },
  }),
}))

describe("LettersFreshMailPill", () => {
  it("caps count at 999+ (AC-C3)", () => {
    render(<LettersFreshMailPill count={1704} childMode={false} onClick={() => {}} />)
    expect(screen.getByRole("button", { name: /999\+/ })).toBeTruthy()
    expect(screen.getByText("▾ fresh mail · 999+")).toBeTruthy()
  })

  it("calls onClick when tapped", () => {
    const onClick = vi.fn()
    render(<LettersFreshMailPill count={3} childMode={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
