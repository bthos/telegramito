import type { MouseEvent } from "react"

export type ReactionTarget = { id: number; x: number; y: number }

const BUBBLE_REACTION_IGNORE_SELECTOR =
  "a, input, textarea, select, video, audio, .msg-poll, .msg-reaction, .msg-entity--spoiler, .msg-bubble-action, button, [role=button]"

export function shouldToggleOffReactionPicker(
  currentTargetId: number | undefined,
  messageId: number,
): boolean {
  return currentTargetId === messageId
}

export function shouldIgnoreClassicBubbleReactionClick(e: MouseEvent): boolean {
  const s = window.getSelection?.()
  if (s != null && s.toString() !== "") {
    return true
  }
  const el = e.target
  if (!(el instanceof Element)) {
    return true
  }
  return el.closest(BUBBLE_REACTION_IGNORE_SELECTOR) != null
}

export function resolveReactionAnchor(
  e: MouseEvent<Element>,
  opts?: { preferCurrentTargetCenter?: boolean },
): { x: number; y: number } {
  if (opts?.preferCurrentTargetCenter) {
    const tgt = e.currentTarget
    if (tgt instanceof HTMLElement) {
      const r = tgt.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top }
    }
  }
  return { x: e.clientX, y: e.clientY }
}
