import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useHardwareBackLayer } from "../hooks/useHardwareBack"
import { AttachClipIcon, AttachFileAddIcon } from "./ChatChromeIcons"

type Props = {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  /** Letters v2: single File label (same picker as clip menu). */
  variant?: "icon" | "letters"
  /** Narrow compose (e.g. mobile shell): clip only, no “File” caption. */
  lettersIconOnly?: boolean
}

/**
 * Paperclip + popover with Photo/Video vs Any file (icon mode). Letters: single “File” control.
 */
export function AttachMenu({
  onFilesSelected,
  disabled,
  variant = "icon",
  lettersIconOnly = false,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const photoVidRef = useRef<HTMLInputElement | null>(null)
  const voiceRef = useRef<HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  useHardwareBackLayer(open, close)

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

  const onVoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (list && list.length > 0) {
      onFilesSelected(Array.from(list))
    }
    e.target.value = ""
    close()
  }

  return (
    <div className={variant === "letters" ? "attach-menu attach-menu--letters" : "attach-menu"} ref={wrapRef}>
      {variant === "letters" ? (
        <input
          ref={fileRef}
          type="file"
          className="attach-menu__input-hidden"
          multiple
          tabIndex={-1}
          aria-label={t("chat.attachMenuFile")}
          onChange={onFileChange}
        />
      ) : (
        <>
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
            ref={voiceRef}
            type="file"
            className="attach-menu__input-hidden"
            accept="audio/*"
            multiple
            tabIndex={-1}
            aria-label={t("chat.previewVoice")}
            onChange={onVoiceChange}
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
        </>
      )}
      {variant === "letters" ? (
        lettersIconOnly ? (
          <button
            type="button"
            className="btn-icon emoji-picker__trigger attach-menu__letters-icon-trigger"
            disabled={disabled}
            aria-label={t("chat.composeFile")}
            onClick={() => {
              pickFile()
            }}
          >
            <AttachFileAddIcon className="attach-menu__clip-ico" aria-hidden />
          </button>
        ) : (
          <div className="attach-menu__letters" role="group" aria-label={t("chat.attachMenuLabel")}>
            <button
              type="button"
              className="attach-menu__letters-link"
              disabled={disabled}
              onClick={() => {
                pickFile()
              }}
            >
              {t("chat.composeFile")}
            </button>
          </div>
        )
      ) : (
        <>
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
            <AttachClipIcon className="attach-menu__clip-ico" aria-hidden />
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
        </>
      )}
    </div>
  )
}
