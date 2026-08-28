import { Api } from "teleproto"
import { peerKeyFromPeer } from "./peerKey"

/**
 * ephemeral-messages (Layer 228): guest / one-off `EphemeralMessage` payloads
 * arrive on dedicated updates — `updateNewEphemeralMessage`,
 * `updateEditEphemeralMessage`, `updateDeleteEphemeralMessages` — distinct from
 * classic `Message`. Telegramito's pipelines keep only `Api.Message` (D4), so
 * this traffic is dropped. v1 does not render a timeline; it just detects the
 * updates so the chat can show an honest "not shown here" ribbon (D1 / D7).
 */

/** True for any of the three ephemeral update constructors. */
export function isEphemeralUpdate(update: unknown): boolean {
  return (
    update instanceof Api.UpdateNewEphemeralMessage ||
    update instanceof Api.UpdateEditEphemeralMessage ||
    update instanceof Api.UpdateDeleteEphemeralMessages
  )
}

/**
 * Peer key for an ephemeral update, or `null` when it is not one / has no
 * resolvable peer. Pure; never throws.
 */
export function getEphemeralUpdatePeerKey(update: unknown): string | null {
  if (
    update instanceof Api.UpdateNewEphemeralMessage ||
    update instanceof Api.UpdateEditEphemeralMessage
  ) {
    const peer = (update.message as { peerId?: Api.TypePeer } | undefined)?.peerId
    const key = peer ? peerKeyFromPeer(peer) : ""
    return key || null
  }
  if (update instanceof Api.UpdateDeleteEphemeralMessages) {
    const key = update.peer ? peerKeyFromPeer(update.peer) : ""
    return key || null
  }
  return null
}
