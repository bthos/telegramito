import { openDB, type IDBPDatabase } from "idb"
import { randomId } from "./id"

const DB_NAME = "telegramito"
const DB_VERSION = 1
const STORE = "kv"

const KEYS = {
  lastMorningDayMailDate: "lettersRituals:lastMorningDayMailDate",
  coReadingBookmarks: "lettersRituals:coReadingBookmarks",
  waxSealTooltipSeen: "lettersRituals:waxSealTooltipSeen",
} as const

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

async function getKey<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb()
  const v = (await db.get(STORE, key)) as T | undefined
  return v === undefined ? fallback : v
}

async function setKey(key: string, value: unknown): Promise<void> {
  const db = await getDb()
  await db.put(STORE, value, key)
}

export async function getLastMorningDayMailDate(): Promise<string | null> {
  const v = await getKey<string | null>(KEYS.lastMorningDayMailDate, null)
  return typeof v === "string" && v.length > 0 ? v : null
}

export async function setLastMorningDayMailDate(day: string): Promise<void> {
  await setKey(KEYS.lastMorningDayMailDate, day)
}

export type CoReadingBookmark = {
  id: string
  chatId: string
  messageId: number
  chatTitle: string
  preview: string
  createdAt: number
}

export async function getCoReadingBookmarks(): Promise<CoReadingBookmark[]> {
  const list = await getKey<CoReadingBookmark[]>(KEYS.coReadingBookmarks, [])
  return Array.isArray(list) ? list : []
}

export async function addCoReadingBookmark(
  entry: Omit<CoReadingBookmark, "id" | "createdAt">,
): Promise<CoReadingBookmark> {
  const cur = await getCoReadingBookmarks()
  const dup = cur.find(
    (b) => b.chatId === entry.chatId && b.messageId === entry.messageId,
  )
  if (dup) {
    return dup
  }
  const next: CoReadingBookmark = {
    ...entry,
    id: randomId(),
    createdAt: Date.now(),
  }
  await setKey(KEYS.coReadingBookmarks, [next, ...cur])
  return next
}

export async function removeCoReadingBookmark(id: string): Promise<void> {
  const cur = await getCoReadingBookmarks()
  await setKey(
    KEYS.coReadingBookmarks,
    cur.filter((b) => b.id !== id),
  )
}

export async function getWaxSealTooltipSeen(): Promise<boolean> {
  return getKey(KEYS.waxSealTooltipSeen, false)
}

export async function setWaxSealTooltipSeen(): Promise<void> {
  await setKey(KEYS.waxSealTooltipSeen, true)
}
