import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TypingIndicator } from "./TypingIndicator"

describe("TypingIndicator", () => {
  it("is visibility:hidden (not display:none) when typers is empty (AC7)", () => {
    const { container } = render(<TypingIndicator typers={[]} />)
    const el = container.firstElementChild as HTMLElement
    expect(el).toBeTruthy()
    expect(el.style.visibility).toBe("hidden")
    expect(el.style.display).not.toBe("none")
  })

  it("is visible when typers is non-empty", () => {
    const { container } = render(<TypingIndicator typers={["Alice"]} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.visibility).toBe("visible")
  })

  it("renders single typer label (AC1)", () => {
    const { getByText } = render(<TypingIndicator typers={["Alice"]} />)
    expect(getByText("Alice is typing…")).toBeTruthy()
  })

  it("renders two-typer label (AC2)", () => {
    const { getByText } = render(<TypingIndicator typers={["Alice", "Bob"]} />)
    expect(getByText("Alice and Bob are typing…")).toBeTruthy()
  })

  it("renders N-other label for 3 typers — singular (AC3)", () => {
    const { getByText } = render(<TypingIndicator typers={["Alice", "Bob", "Carol"]} />)
    expect(getByText("Alice, Bob and 1 other are typing…")).toBeTruthy()
  })

  it("renders N-other label for 4 typers — plural (AC3)", () => {
    const { getByText } = render(<TypingIndicator typers={["Alice", "Bob", "Carol", "Dave"]} />)
    expect(getByText("Alice, Bob and 2 others are typing…")).toBeTruthy()
  })

  it("has aria-live=polite for screen reader announcements", () => {
    const { container } = render(<TypingIndicator typers={["Alice"]} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute("aria-live")).toBe("polite")
  })

  it("renders three typing-dot spans when visible", () => {
    const { container } = render(<TypingIndicator typers={["Alice"]} />)
    const dots = container.querySelectorAll(".typing-dot")
    expect(dots).toHaveLength(3)
  })

  it("renders no typing-dot spans when empty", () => {
    const { container } = render(<TypingIndicator typers={[]} />)
    const dots = container.querySelectorAll(".typing-dot")
    expect(dots).toHaveLength(0)
  })
})
