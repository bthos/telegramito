import { useTranslation } from "react-i18next"
import { insertAtCursor } from "../util/insertAtCursor"
import { AttachMenu } from "./AttachMenu"
import { AttachmentPreviewStrip } from "./AttachmentPreviewStrip"
import { AttachUploadProgress } from "./AttachUploadProgress"
import { Button } from "./ds"
import { EmojiPickerButton } from "./EmojiPicker"
import type { UseChatComposeResult } from "../hooks/useChatCompose"
import { LETTERS_COMPOSE_TEXTAREA_ID } from "./lettersWriteAction"

type Props = {
  lettersLayout: boolean
  compose: UseChatComposeResult
}

export function ChatComposer({ lettersLayout, compose }: Props) {
  const { t } = useTranslation()
  const {
    textareaRef,
    textareaSelectionRef,
    attachments,
    attachPickErr,
    uploadProgress,
    canCompose,
    canSendNow,
    showAttach,
    waxSealEnabled,
    waxSealState,
    onSendPointerDown,
    onSendPointerUp,
    onSendPointerLeave,
    onSendClick,
    cancelSeal,
    hasTelegramDraft,
    lettersSendIconOnly,
    replyingTo,
    setReplyingTo,
    messageActionError,
    getReplyToPreviewText,
    applyComposeText,
    resizeComposeTextareaToContent,
    notifyTyping,
    retryAttachmentSend,
    onSend,
    isUploading,
    setAttachPickErr,
    addFiles,
    removeAttachment,
  } = compose

  const onEmojiSelected = (emoji: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const { newValue, newCursorPos } = insertAtCursor(
      ta,
      emoji,
      textareaSelectionRef.current,
    )
    ta.value = newValue
    applyComposeText(newValue)
    resizeComposeTextareaToContent()
    window.setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(newCursorPos, newCursorPos)
      textareaSelectionRef.current = {
        start: newCursorPos,
        end: newCursorPos,
      }
    }, 0)
  }

  const onFilesSelected = (files: File[]) => {
    setAttachPickErr(null)
    const { rejectedCount } = addFiles(files)
    if (rejectedCount > 0) {
      setAttachPickErr(t("chat.attachFileTooLarge"))
    }
  }

  return (
    <>
      <div className="compose">
        {messageActionError ? (
          <p className="msg-action-err" role="alert">
            {messageActionError}
          </p>
        ) : null}
        {attachPickErr ? (
          <p className="msg-action-err" role="alert">
            {attachPickErr}
          </p>
        ) : null}
        {replyingTo ? (
          <div className="msg-reply-bar" role="status">
            <span className="msg-reply-bar__line">
              <span className="msg-reply-bar__lbl">
                {t("chat.replyingTo")}
                :
                {" "}
              </span>
              <span className="msg-reply-bar__prev">
                {getReplyToPreviewText(replyingTo, t)}
              </span>
            </span>
            <button
              type="button"
              className="msg-reply-bar__x"
              onClick={() => {
                setReplyingTo(null)
              }}
              aria-label={t("chat.clearReplyDraft")}
            >
              ×
            </button>
          </div>
        ) : null}
        {attachments.length > 0 ? (
          <>
            <AttachmentPreviewStrip
              attachments={attachments}
              onRemove={removeAttachment}
              onRetry={(id) => {
                void retryAttachmentSend(id)
              }}
            />
            <AttachUploadProgress
              sent={uploadProgress?.sent ?? 0}
              total={uploadProgress?.total ?? 0}
            />
          </>
        ) : null}
        <div className={lettersLayout ? "compose__row compose__row--letters" : "compose__row"}>
          {!lettersLayout ? (
            <>
              <EmojiPickerButton
                disabled={!canCompose || isUploading}
                onEmojiSelected={onEmojiSelected}
              />
              {showAttach ? (
                <AttachMenu
                  variant="icon"
                  disabled={!canCompose || isUploading}
                  onFilesSelected={onFilesSelected}
                />
              ) : null}
            </>
          ) : null}
          <textarea
            ref={textareaRef}
            id={lettersLayout ? LETTERS_COMPOSE_TEXTAREA_ID : undefined}
            className="input input-compose"
            name="m"
            rows={1}
            defaultValue=""
            onChange={(e) => {
              applyComposeText(e.currentTarget.value)
              notifyTyping?.()
              resizeComposeTextareaToContent()
            }}
            onSelect={(e) => {
              const el = e.currentTarget
              textareaSelectionRef.current = {
                start: el.selectionStart,
                end: el.selectionEnd,
              }
            }}
            onBlur={(e) => {
              textareaSelectionRef.current = {
                start: e.currentTarget.selectionStart,
                end: e.currentTarget.selectionEnd,
              }
            }}
            placeholder={
              lettersLayout
                ? t("chat.messagePlaceholderLetters")
                : t("chat.messagePlaceholder")
            }
            disabled={!canCompose || isUploading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (canSendNow) void onSend()
              }
            }}
          />
          {lettersLayout ? (
            <>
              <EmojiPickerButton
                disabled={!canCompose || isUploading}
                onEmojiSelected={onEmojiSelected}
              />
              {showAttach ? (
                <AttachMenu
                  variant="letters"
                  lettersIconOnly={lettersSendIconOnly}
                  disabled={!canCompose || isUploading}
                  onFilesSelected={onFilesSelected}
                />
              ) : null}
            </>
          ) : null}
          <Button
            className={
              lettersSendIconOnly
                ? `btn-send btn-send--letters-icon-only${waxSealState.sealing ? " btn-send--sealing" : ""}`
                : `btn-send${waxSealState.sealing ? " btn-send--sealing" : ""}`
            }
            type="button"
            onPointerDown={waxSealEnabled ? onSendPointerDown : undefined}
            onPointerUp={waxSealEnabled ? onSendPointerUp : undefined}
            onPointerLeave={waxSealEnabled ? onSendPointerLeave : undefined}
            onClick={() => {
              if (waxSealEnabled) {
                onSendClick()
              } else {
                void onSend()
              }
            }}
            aria-label={
              hasTelegramDraft && lettersLayout
                ? t("letters.continueLetter")
                : lettersSendIconOnly
                  ? t("chat.send")
                  : lettersLayout
                    ? t("chat.sendArrow")
                    : t("chat.send")
            }
            disabled={!canSendNow}
            title={waxSealEnabled ? t("letters.waxSealHint") : undefined}
          >
            {hasTelegramDraft && lettersLayout
              ? t("letters.continueLetterShort")
              : lettersSendIconOnly
                ? "→"
                : lettersLayout
                  ? t("chat.sendArrow")
                  : t("chat.send")}
          </Button>
        </div>
      </div>
      {waxSealState.undoOpen ? (
        <div className="letters-wax-seal-toast" role="status">
          <span>{t("letters.waxSealPending", { seconds: waxSealState.undoSecondsLeft })}</span>
          <Button type="button" size="sm" variant="ghost" onClick={cancelSeal}>
            {t("letters.waxSealUndo")}
          </Button>
        </div>
      ) : null}
    </>
  )
}
