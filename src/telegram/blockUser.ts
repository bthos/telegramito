import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { withTransientRetry } from "./invokeWithTransientRetry"

/**
 * Adds a private user to the local block list (MTProto `contacts.block`).
 * Does not remove dialog history; user can unblock from official Telegram clients.
 */
export async function blockTelegramUser(client: TelegramClient, user: Api.User): Promise<void> {
  const id = await client.getInputEntity(user)
  await withTransientRetry(client, () =>
    client.invoke(new Api.contacts.Block({ id: id as never })),
  )
}
