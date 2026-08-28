import { Api } from "teleproto"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import type { Dialog } from "teleproto/tl/custom/dialog"
import type { TelegramClient } from "teleproto"
import type { ParentalSettings } from "../parental/types"
import { useDraftAttachments } from "./useDraftAttachments"
import { useWaxSealSend } from "./useWaxSealSend"
import { getReplyToPreviewText } from "../telegram/dialogPreview"
import { getDialogDraftText } from "../util/dialogDraft"
import { sendInForumThread } from "../telegram/forum"
import { parseComposeMarkdown } from "../telegram/composeMarkdown"
import { appLog } from "../util/appLogger"
import { canCompose as deriveCanCompose, canSendNow as deriveCanSendNow } from "../ui/chatComposeGate"

const MAX_COMPOSE_HEIGHT = 120

export type UseChatComposeOpts = {
  client: TelegramClient | null
  dialog: Dialog
  settings: ParentalSettings
  lettersLayout: boolean
  lettersSendIconOnly: boolean
  isForum: boolean
  topicId: number | null
  topicsLoading: boolean
  topicsErr: string | null
  topicsLength: number
  replyingTo: Api.Message | null
  setReplyingTo: (m: Api.Message | null) => void
  messageActionError: string | null
  setMessageActionError: (msg: string | null) => void
  scrollToLatestMessages: () => void
  refreshHead: () => Promise<void>
  onFreshMailDismissed: () => void
  notifyTyping?: () => void
  dialogPeerKey: string
  convKey: string
}

export function useChatCompose(opts: UseChatComposeOpts) {
  const {
    client,
    dialog,
    settings,
    lettersLayout,
    lettersSendIconOnly,
    isForum,
    topicId,
    topicsLoading,
    topicsErr,
    topicsLength,
    replyingTo,
    setReplyingTo,
    messageActionError,
    setMessageActionError,
    scrollToLatestMessages,
    refreshHead,
    onFreshMailDismissed,
    notifyTyping,
    dialogPeerKey,
    convKey,
  } = opts

  const { t } = useTranslation()
  const draftRef = useRef("")
  const [draftNonempty, setDraftNonempty] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaSelectionRef = useRef({ start: 0, end: 0 })
  const [hasTelegramDraft, setHasTelegramDraft] = useState(false)
  const {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    markFailed,
  } = useDraftAttachments()
  const [attachPickErr, setAttachPickErr] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    sent: number
    total: number
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const canComposeEnabled = deriveCanCompose({
    isForum,
    topicsLoading,
    topicsErr,
    topicId,
    topicsLength,
  })

  const showAttach =
    settings.appMode !== "child" || settings.allowOutgoingMedia !== false

  const pendingAttachments = useMemo(
    () => attachments.filter((a) => !a.failed),
    [attachments],
  )

  const canSendNowEnabled = deriveCanSendNow({
    canCompose: canComposeEnabled,
    isUploading,
    draftNonempty,
    pendingAttachmentCount: pendingAttachments.length,
  })

  const waxSealEnabled = lettersLayout && settings.waxSealSendEnabled === true

  const resizeComposeTextareaToContent = useCallback(() => {
    const el = textareaRef.current
    if (!el || lettersLayout) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSE_HEIGHT)}px`
  }, [lettersLayout])

  const applyComposeText = useCallback((text: string) => {
    draftRef.current = text
    const has = text.trim().length > 0
    setDraftNonempty((prev) => (prev === has ? prev : has))
  }, [])

  const clearComposeField = useCallback(() => {
    const ta = textareaRef.current
    if (ta) ta.value = ""
    draftRef.current = ""
    setDraftNonempty(false)
    resizeComposeTextareaToContent()
  }, [resizeComposeTextareaToContent])

  const retryAttachmentSend = async (id: string) => {
    if (!client || !dialog.entity || isUploading) {
      return
    }
    const att = attachments.find((a) => a.id === id)
    if (!att?.failed) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    markFailed(id, false)
    setIsUploading(true)
    setMessageActionError(null)
    try {
      // A retry carries no caption text today; parse anyway so the markdown
      // wiring is uniform if a caption is ever threaded through here.
      const md = parseComposeMarkdown("")
      await client.sendFile(dialog.entity, {
        file: att.file,
        caption: md ? md.message : "",
        ...(md ? { formattingEntities: md.entities } : {}),
        ...(isForum && topicId != null ? { topMsgId: topicId } : {}),
      })
      removeAttachment(id)
      setReplyingTo(null)
      scrollToLatestMessages()
      void refreshHead()
    } catch (e) {
      appLog.warn("sendFile retry", e)
      markFailed(id, true)
      setMessageActionError(
        e instanceof Error ? e.message : t("chat.sendFailed"),
      )
    } finally {
      setIsUploading(false)
    }
  }

  const onSend = async () => {
    if (!client || !dialog.entity || !canComposeEnabled || isUploading) {
      return
    }
    const text = (textareaRef.current?.value ?? "").trim()
    const queue = attachments.filter((a) => !a.failed)

    if (queue.length > 0) {
      if (settings.appMode === "child" && settings.allowOutgoingMedia === false) {
        setMessageActionError(t("chat.attachBlockedChild"))
        clearAttachments()
        return
      }
      if (isForum && topicId == null) {
        return
      }

      const captionText = text
      const captionMd = parseComposeMarkdown(captionText)
      const rId = replyingTo?.className === "Message" ? replyingTo.id : undefined
      const validReply = typeof rId === "number" && rId > 0 ? rId : undefined

      setIsUploading(true)
      setUploadProgress({ sent: 0, total: queue.length })
      setAttachPickErr(null)
      setMessageActionError(null)

      let broke = false
      try {
        let first = true
        for (let i = 0; i < queue.length; i++) {
          const att = queue[i]
          try {
            await client.sendFile(dialog.entity, {
              file: att.file,
              caption: first ? (captionMd ? captionMd.message : captionText) : "",
              ...(first && captionMd ? { formattingEntities: captionMd.entities } : {}),
              replyTo: first ? validReply : undefined,
              ...(isForum && topicId != null ? { topMsgId: topicId } : {}),
            })
            removeAttachment(att.id)
            if (first && captionText) {
              clearComposeField()
            }
            first = false
            setUploadProgress({ sent: i + 1, total: queue.length })
            scrollToLatestMessages()
            onFreshMailDismissed()
            void refreshHead()
          } catch (e) {
            appLog.warn("sendFile", e)
            markFailed(att.id, true)
            setMessageActionError(
              e instanceof Error ? e.message : t("chat.sendFailed"),
            )
            broke = true
            break
          }
        }
        if (!broke) {
          setReplyingTo(null)
          setMessageActionError(null)
        }
      } finally {
        setIsUploading(false)
        setUploadProgress(null)
      }
      return
    }

    if (!text) {
      return
    }
    if (isForum) {
      if (topicId == null) {
        return
      }
      const rId = replyingTo?.className === "Message" ? replyingTo.id : undefined
      const md = parseComposeMarkdown(text)
      try {
        await sendInForumThread(
          client,
          dialog.entity as NonNullable<Dialog["entity"]>,
          md ? md.message : text,
          topicId,
          typeof rId === "number" && rId > 0 ? rId : undefined,
          md?.entities,
        )
        clearComposeField()
        setReplyingTo(null)
        setMessageActionError(null)
        scrollToLatestMessages()
        onFreshMailDismissed()
        void refreshHead()
      } catch (e) {
        appLog.warn("sendInForumThread", e)
        setMessageActionError(t("chat.sendFailed"))
      }
      return
    }
    const rId = replyingTo?.className === "Message" ? replyingTo.id : undefined
    const md = parseComposeMarkdown(text)
    try {
      await client.sendMessage(dialog.entity, {
        message: md ? md.message : text,
        ...(md ? { formattingEntities: md.entities } : {}),
        ...(typeof rId === "number" && rId > 0 ? { replyTo: rId } : {}),
      })
      clearComposeField()
      setReplyingTo(null)
      setMessageActionError(null)
      scrollToLatestMessages()
      onFreshMailDismissed()
      void refreshHead()
    } catch (e) {
      appLog.warn("sendMessage", e)
      setMessageActionError(
        e instanceof Error ? e.message : t("chat.sendFailed"),
      )
    }
  }

  const {
    state: waxSealState,
    onSendPointerDown,
    onSendPointerUp,
    onSendPointerLeave,
    onSendClick,
    cancelSeal,
  } = useWaxSealSend({
    enabled: waxSealEnabled,
    reducedMotion,
    onSend: () => {
      void onSend()
    },
  })

  useEffect(() => {
    clearAttachments()
    queueMicrotask(() => {
      setAttachPickErr(null)
    })
  }, [convKey, clearAttachments])

  useEffect(() => {
    const draftText = getDialogDraftText(dialog)
    setHasTelegramDraft(draftText != null)
    const ta = textareaRef.current
    if (!ta) {
      return
    }
    if (draftText != null) {
      ta.value = draftText
      applyComposeText(draftText)
    } else {
      ta.value = ""
      applyComposeText("")
    }
    resizeComposeTextareaToContent()
  }, [dialogPeerKey, dialog, applyComposeText, resizeComposeTextareaToContent])

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (lettersLayout) {
      el.style.removeProperty("height")
      return
    }
    resizeComposeTextareaToContent()
  }, [lettersLayout, resizeComposeTextareaToContent])

  return {
    t,
    textareaRef,
    textareaSelectionRef,
    attachments,
    addFiles,
    removeAttachment,
    attachPickErr,
    setAttachPickErr,
    uploadProgress,
    isUploading,
    canCompose: canComposeEnabled,
    canSendNow: canSendNowEnabled,
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
  }
}

export type UseChatComposeResult = ReturnType<typeof useChatCompose>
