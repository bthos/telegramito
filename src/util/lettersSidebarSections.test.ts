import { describe, expect, it } from "vitest"
import {
  buildLettersSidebarSectionsOrdered,
  cycleNextSection,
  nextOpenSectionOnQueryChange,
  passagesEligible,
  sidebarEmptyKind,
} from "./lettersSidebarSections"

describe("passagesEligible", () => {
  it("requires at least 2 non-whitespace characters", () => {
    expect(passagesEligible("")).toBe(false)
    expect(passagesEligible("a")).toBe(false)
    expect(passagesEligible(" ab ")).toBe(true)
  })
})

describe("buildLettersSidebarSectionsOrdered (AC6 + Passages)", () => {
  it("always includes groups and channels in letters mode even with no dialogs", () => {
    expect(buildLettersSidebarSectionsOrdered({ lettersMode: true, query: "" })).toEqual([
      "correspondents",
      "groups",
      "channels",
    ])
  })

  it("puts messages first when the query is eligible", () => {
    expect(buildLettersSidebarSectionsOrdered({ lettersMode: true, query: "hi" })).toEqual([
      "messages",
      "correspondents",
      "groups",
      "channels",
    ])
  })

  it("does not include messages for short queries", () => {
    expect(
      buildLettersSidebarSectionsOrdered({ lettersMode: true, query: "h" }),
    ).not.toContain("messages")
  })
})

describe("nextOpenSectionOnQueryChange (rising-edge Passages)", () => {
  const orderedWith = ["messages", "correspondents", "groups", "channels"] as const
  const orderedWithout = ["correspondents", "groups", "channels"] as const

  it("auto-opens messages only on the rising edge", () => {
    expect(
      nextOpenSectionOnQueryChange({
        prevEligible: false,
        nextEligible: true,
        current: "groups",
        ordered: orderedWith,
      }),
    ).toBe("messages")
  })

  it("does not re-force messages while already eligible", () => {
    expect(
      nextOpenSectionOnQueryChange({
        prevEligible: true,
        nextEligible: true,
        current: "channels",
        ordered: orderedWith,
      }),
    ).toBe("channels")
  })

  it("falls back when current section disappears", () => {
    expect(
      nextOpenSectionOnQueryChange({
        prevEligible: true,
        nextEligible: false,
        current: "messages",
        ordered: orderedWithout,
      }),
    ).toBe("correspondents")
  })
})

describe("sidebarEmptyKind", () => {
  it("returns neverHad when there were no dialogs even before filtering", () => {
    expect(
      sidebarEmptyKind({ searchActive: false, unfilteredCount: 0, filteredCount: 0 }),
    ).toBe("neverHad")
  })

  it("returns filtered when search removed all matches but some existed", () => {
    expect(
      sidebarEmptyKind({ searchActive: true, unfilteredCount: 3, filteredCount: 0 }),
    ).toBe("filtered")
  })

  it("returns none when there are visible dialogs", () => {
    expect(
      sidebarEmptyKind({ searchActive: true, unfilteredCount: 3, filteredCount: 1 }),
    ).toBe("none")
  })
})

describe("cycleNextSection", () => {
  it("cycles including messages when present", () => {
    const avail = ["messages", "correspondents", "groups", "channels"] as const
    expect(cycleNextSection("messages", avail)).toBe("correspondents")
    expect(cycleNextSection("channels", avail)).toBe("messages")
  })
})
