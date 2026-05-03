import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"

export type TickState = "sent" | "delivered" | "read"

/** Numeric id from dialog's read-outbox cursor (may be int / BigInteger in GramJS). */
export function readOutboxMaxIdFromDialog(dialog: Dialog): number {
  const raw = dialog.dialog?.readOutboxMaxId
  return coerceMessageId(raw)
}

export function coerceMessageId(v: unknown): number {
  if (v == null) return 0
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "object" && v != null && "toString" in v) {
    const n = Number(String((v as { toString: () => string }).toString()))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Broadcast channel (not megagroup): no per-recipient read receipts — single tick only (spec AC5).
 */
export function isBroadcastChannelEntity(entity: Dialog["entity"]): boolean {
  if (entity == null || entity.className !== "Channel") {
    return false
  }
  const c = entity as Api.Channel
  return Boolean(c.broadcast && !c.megagroup)
}

/**
 * Delivery/read ticks for outbound bubbles. Uses dialog.readOutboxMaxId + message.flags (spec).
 */
export function getTickState(
  message: Api.Message,
  readOutboxMaxId: number,
  opts?: { isBroadcastChannel?: boolean },
): TickState | null {
  if (message.className !== "Message") {
    return null
  }
  if (!message.out) {
    return null
  }
  if (opts?.isBroadcastChannel) {
    return "sent"
  }
  const id = coerceMessageId(message.id)
  if (id <= readOutboxMaxId) {
    return "read"
  }
  if (!message.mediaUnread) {
    return "delivered"
  }
  return "sent"
}
