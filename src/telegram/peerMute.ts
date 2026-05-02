import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { withTransientRetry } from "./invokeWithTransientRetry"

/** Mute until this Unix time (year 2038) — same pattern as common Telegram clients. */
const MUTE_UNTIL_FOREVER = 0x7fffffff

type PeerEntity = Api.User | Api.Chat | Api.Channel

export function isPeerNotifyMuted(muteUntil: number, nowSec = Math.floor(Date.now() / 1000)): boolean {
  return muteUntil > nowSec
}

export async function getPeerMuteUntil(
  client: TelegramClient,
  entity: PeerEntity,
): Promise<number> {
  const inputPeer = await client.getInputEntity(entity as never)
  const peer = new Api.InputNotifyPeer({ peer: inputPeer as Api.TypeInputPeer })
  const s = await withTransientRetry(client, () =>
    client.invoke(new Api.account.GetNotifySettings({ peer })),
  )
  if (s.className === "PeerNotifySettings") {
    return (s as Api.PeerNotifySettings).muteUntil ?? 0
  }
  return 0
}

export async function setPeerMuted(
  client: TelegramClient,
  entity: PeerEntity,
  muted: boolean,
): Promise<void> {
  const inputPeer = await client.getInputEntity(entity as never)
  const muteUntil = muted ? MUTE_UNTIL_FOREVER : 0
  await withTransientRetry(client, () =>
    client.invoke(
      new Api.account.UpdateNotifySettings({
        peer: new Api.InputNotifyPeer({ peer: inputPeer as Api.TypeInputPeer }),
        settings: new Api.InputPeerNotifySettings({ muteUntil }),
      }),
    ),
  )
}
