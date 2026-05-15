import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { AttachMenu } from "./AttachMenu"

async function miniI18n() {
  const i = i18n.createInstance()
  await i.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          chat: {
            attachFile: "Attach file",
            attachMenuLabel: "Attachment options",
            attachMenuPhotoVideo: "Photo or video",
            attachMenuFile: "File",
            composeFile: "File",
          },
        },
      },
    },
  })
  return i
}

describe("AttachMenu", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("opens menu and lists two menuitems", async () => {
    const onFiles = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <AttachMenu onFilesSelected={onFiles} />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Attach file" }))
    expect(screen.getByRole("menu")).toBeTruthy()
    expect(screen.getAllByRole("menuitem")).toHaveLength(2)
  })

  it("Escape closes menu", async () => {
    const onFiles = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <AttachMenu onFilesSelected={onFiles} />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Attach file" }))
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("letters + lettersIconOnly: clip button, no menu", async () => {
    const onFiles = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <AttachMenu
          variant="letters"
          lettersIconOnly
          onFilesSelected={onFiles}
        />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: "File" }))
    expect(screen.queryByRole("menu")).toBeNull()
  })
})
