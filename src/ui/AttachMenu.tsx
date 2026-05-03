import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

type Props = {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

/**
 * Paperclip + popover with Photo/Video vs Any file; two hidden file inputs (spec attach-menu).
 */
export function AttachMenu({ onFilesSelected, disabled }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const photoVidRef = useRef<HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        close()
        queueMicrotask(() => triggerRef.current?.focus())
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
        queueMicrotask(() => triggerRef.current?.focus())
      }
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [close, open])

  const pickPhotoVideo = () => {
    photoVidRef.current?.click()
  }

  const pickFile = () => {
    fileRef.current?.click()
  }

  const onPhotoVidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (list && list.length > 0) {
      onFilesSelected(Array.from(list))
    }
    e.target.value = ""
    close()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (list && list.length > 0) {
      onFilesSelected(Array.from(list))
    }
    e.target.value = ""
    close()
  }

  return (
    <div className="attach-menu" ref={wrapRef}>
      <input
        ref={photoVidRef}
        type="file"
        className="attach-menu__input-hidden"
        accept="image/*,video/*"
        multiple
        tabIndex={-1}
        aria-label={t("chat.attachMenuPhotoVideo")}
        onChange={onPhotoVidChange}
      />
      <input
        ref={fileRef}
        type="file"
        className="attach-menu__input-hidden"
        multiple
        tabIndex={-1}
        aria-label={t("chat.attachMenuFile")}
        onChange={onFileChange}
      />
      <button
        ref={triggerRef}
        type="button"
        className="btn-icon attach-menu__trigger"
        disabled={disabled}
        aria-label={t("chat.attachFile")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
        }}
      >
        <span className="attach-menu__clip" aria-hidden>📎</span>
      </button>
      {open ? (
        <div
          className="attach-menu__popover"
          role="menu"
          aria-label={t("chat.attachMenuLabel")}
        >
          <button
            type="button"
            role="menuitem"
            className="attach-menu__item"
            onClick={() => {
              pickPhotoVideo()
            }}
          >
            {t("chat.attachMenuPhotoVideo")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="attach-menu__item"
            onClick={() => {
              pickFile()
            }}
          >
            {t("chat.attachMenuFile")}
          </button>
        </div>
      ) : null}
    </div>
  )
}
