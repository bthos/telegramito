import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ScrollToBottomFab } from "./ScrollToBottomFab"

describe("ScrollToBottomFab", () => {
  it("shows 999+ cap on unread badge (AC-M6)", () => {
    render(
      <ScrollToBottomFab
        visible
        onClick={() => {}}
        label="Jump to latest"
        unreadBadge={1704}
      />,
    )
    expect(screen.getByText("999+")).toBeTruthy()
  })
})
