import type { ReactNode } from "react"
import type { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { MessageClusterRole } from "../telegram/messageBubbleGroup"
import { usePeerName } from "../hooks/usePeerName"
import { PeerAvatar } from "./PeerAvatar"

const AVATAR_SIZE = 32

type Props = {
  message: Api.Message
  clusterRole: MessageClusterRole
  isGroup: boolean
  client: TelegramClient | null
  children: ReactNode
}

function peerKeyFromPeer(peerId: Api.TypePeer | undefined): string {
  if (peerId == null) return ""
  if (peerId.className === "PeerUser") {
    return `u:${String((peerId as Api.PeerUser).userId)}`
  }
  if (peerId.className === "PeerChannel") {
    return `c:${String((peerId as Api.PeerChannel).channelId)}`
  }
  if (peerId.className === "PeerChat") {
    return `h:${String((peerId as Api.PeerChat).chatId)}`
  }
  return ""
}

/**
 * Wrapper for inbound message bubbles in group chats.
 *
 * Owns the `usePeerName` hook call to satisfy React hook rules
 * (hooks cannot be called conditionally in renderDatedItem).
 *
 * When `isGroup` is false or message is outbound, renders children directly
 * with no additional DOM.
 */
export function InboundClusterRow({
  message,
  clusterRole,
  isGroup,
  client,
  children,
}: Props) {
  const fromId = message.className === "Message" ? message.fromId : undefined
  const senderName = usePeerName(fromId, client)
  const avatarKey = peerKeyFromPeer(fromId)

  const isOut = Boolean(message.out)
  const showSenderName =
    isGroup && !isOut && (clusterRole === "single" || clusterRole === "first")
  const showAvatar =
    isGroup && !isOut && (clusterRole === "single" || clusterRole === "last")
  const showSpacer =
    isGroup && !isOut && (clusterRole === "first" || clusterRole === "middle")

  if (!isGroup || isOut) {
    return <>{children}</>
  }

  return (
    <div className="msg-cluster-col">
      {showSenderName && (
        <span
          className="msg-sender-name"
          aria-label={senderName ? `${senderName}: ` : ""}
        >
          {senderName}
        </span>
      )}
      <div className="msg-cluster-row">
        {showAvatar && (
          <PeerAvatar
            id={avatarKey}
            name={senderName}
            size={AVATAR_SIZE}
            className="msg-cluster-avatar"
          />
        )}
        {showSpacer && (
          <span
            className="msg-avatar-spacer"
            style={{ width: AVATAR_SIZE }}
            aria-hidden
          />
        )}
        {children}
      </div>
    </div>
  )
}
