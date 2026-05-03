import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { AttachmentPreviewStrip } from "./AttachmentPreviewStrip"
import type { DraftAttachment } from "../hooks/useDraftAttachments"

async function miniI18n() {
  const inst = i18n.createInstance()
  await inst.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          chat: {
            attachRemove: "Remove {{name}}",
            attachUploadFailed: "Failed",
            attachRetryUpload: "retry",
          },
        },
      },
    },
  })
  return inst
}

describe("AttachmentPreviewStrip", () => {
  let inst: typeof i18n
  beforeEach(async () => {
    inst = await miniI18n()
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders image thumb for image kind", () => {
    const att: DraftAttachment = {
      id: "1",
      file: new File([], "p.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:x",
      kind: "image",
    }
    const onRemove = vi.fn()
    render(
      <I18nextProvider i18n={inst}>
        <AttachmentPreviewStrip attachments={[att]} onRemove={onRemove} />
      </I18nextProvider>,
    )
    expect(screen.getByRole("list")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Remove p\.jpg/ }))
    expect(onRemove).toHaveBeenCalledWith("1")
  })

  it("renders document chip for document kind", () => {
    const att: DraftAttachment = {
      id: "2",
      file: new File(["x"], "report.pdf", { type: "application/pdf" }),
      previewUrl: "blob:y",
      kind: "document",
    }
    render(
      <I18nextProvider i18n={inst}>
        <AttachmentPreviewStrip attachments={[att]} onRemove={vi.fn()} />
      </I18nextProvider>,
    )
    expect(screen.getByText(/report\.pdf/)).toBeTruthy()
  })
})
