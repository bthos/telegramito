/**
 * media-dimension-reservation (2026-08-02) — sticker style-prop fallback (AC4).
 * Feature: .tlk/features/2026-08-02-media-dimension-reservation/
 */
import { describe, expect, it, beforeEach } from "vitest"
import { render } from "@testing-library/react"
import { I18nextProvider, initReactI18next } from "react-i18next"
import i18n from "i18next"
import { MediaPlaceholder } from "./MediaPlaceholder"

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: { en: { translation: { chat: { mediaLoading: "Loading media" } } } },
  })
  return inst
}

describe("MediaPlaceholder sticker — style fallback (AC4)", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })

  it("falls back to the 112px square (no inline reservation) when no style prop is passed", () => {
    render(
      <I18nextProvider i18n={inst}>
        <MediaPlaceholder type="sticker" variant="pending" shimmer={false} />
      </I18nextProvider>,
    )
    const root = document.querySelector(".media-placeholder--sticker") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.width).toBe("")
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("")
  })

  it("applies the passed style (reserved box vars) to the root when given", () => {
    render(
      <I18nextProvider i18n={inst}>
        <MediaPlaceholder
          type="sticker"
          variant="pending"
          shimmer={false}
          style={{ "--msg-media-w": "90px", "--msg-media-ar": "90 / 130" } as React.CSSProperties}
        />
      </I18nextProvider>,
    )
    const root = document.querySelector(".media-placeholder--sticker") as HTMLElement
    expect(root).toBeTruthy()
    expect(root.style.getPropertyValue("--msg-media-w")).toBe("90px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("90 / 130")
  })

  it("merges width/height number props with a passed style object", () => {
    render(
      <I18nextProvider i18n={inst}>
        <MediaPlaceholder
          type="sticker"
          variant="pending"
          shimmer={false}
          width={50}
          height={60}
          style={{ "--msg-media-ar": "50 / 60" } as React.CSSProperties}
        />
      </I18nextProvider>,
    )
    const root = document.querySelector(".media-placeholder--sticker") as HTMLElement
    expect(root.style.width).toBe("50px")
    expect(root.style.height).toBe("60px")
    expect(root.style.getPropertyValue("--msg-media-ar")).toBe("50 / 60")
  })
})
