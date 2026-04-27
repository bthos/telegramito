import { openDB, type IDBPDatabase } from "idb"
import { randomId } from "../util/id"
import type { AppLocale } from "./types"
import { defaultParentalSettings, normalizeParentalSettings, type ParentalSettings, type PendingRequest } from "./types"

const DB_NAME = "telegramito"
const DB_VERSION = 1
const STORE = "kv"

const KEYS = {
  parental: "parental",
  stringSession: "stringSession",
  requests: "pendingRequests",
} as const

const SUPPORTED: ReadonlySet<AppLocale> = new Set(["en", "es", "be"])

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

export const LOCALE_STORAGE_KEY = "telegramito_locale"

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return "en"
  for (const raw of navigator.languages ?? []) {
    const base = raw.toLowerCase().split("-")[0] ?? "en"
    if (base === "be" && SUPPORTED.has("be")) return "be"
    if (base === "es" && SUPPORTED.has("es")) return "es"
  }
  return "en"
}

export function readStoredLocaleSync(): AppLocale {
  try {
    const s = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (s === "ru") {
      localStorage.setItem(LOCALE_STORAGE_KEY, "en")
      return "en"
    }
    if (s && SUPPORTED.has(s as AppLocale)) return s as AppLocale
  } catch {
    /* ignore */
  }
  return detectBrowserLocale()
}

function persistLocale(l: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, l)
  } catch {
    /* ignore */
  }
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

export async function getParentalSettings(): Promise<ParentalSettings> {
  const s = await getKey<ParentalSettings | undefined>(
    KEYS.parental,
    undefined
  )
  if (s) {
    const loc = s.locale as string | null
    if (loc === "ru") {
      const next = normalizeParentalSettings({ ...s, locale: "en" })
      void setKey(KEYS.parental, next)
      return next
    }
    return normalizeParentalSettings(s)
  }
  return { ...defaultParentalSettings() }
}

export async function setParentalSettings(
  s: ParentalSettings
): Promise<void> {
  const next = normalizeParentalSettings(s)
  if (next.locale) persistLocale(next.locale)
  await setKey(KEYS.parental, next)
}

export async function getStringSession(): Promise<string | null> {
  return getKey<string | null>(KEYS.stringSession, null)
}

export async function setStringSession(
  session: string | null
): Promise<void> {
  await setKey(KEYS.stringSession, session)
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  return getKey<PendingRequest[]>(KEYS.requests, [])
}

export async function setPendingRequests(
  r: PendingRequest[]
): Promise<void> {
  await setKey(KEYS.requests, r)
}

export async function addPendingRequest(req: PendingRequest): Promise<void> {
  const cur = await getPendingRequests()
  if (cur.some((x) => x.targetId === req.targetId && x.status === "pending")) {
    return
  }
  cur.push(req)
  await setPendingRequests(cur)
}

export async function updateRequest(
  id: string,
  patch: Partial<PendingRequest>
): Promise<void> {
  const cur = await getPendingRequests()
  const i = cur.findIndex((r) => r.id === id)
  if (i < 0) return
  cur[i] = { ...cur[i], ...patch } as PendingRequest
  await setPendingRequests(cur)
}

export type PeerAccessState = "allowed" | "pending" | "denied"

/**
 * Set allowlist + per-peer request status for 1-1 (parent Requests UI).
 * Persists both parental settings and the requests list.
 */
export async function setPeerAccessState(
  targetId: string,
  title: string,
  state: PeerAccessState
): Promise<ParentalSettings> {
  const s = await getParentalSettings()
  const al = new Set(s.allowlistIds)
  if (state === "allowed") {
    al.add(targetId)
  } else {
    al.delete(targetId)
  }
  const cur = await getPendingRequests()
  const i = cur.findIndex((r) => r.targetId === targetId)
  if (state === "allowed") {
    if (i >= 0) {
      const row = { ...cur[i]!, status: "approved" as const, title }
      cur[i] = row
    }
  } else if (state === "pending") {
    if (i >= 0) {
      cur[i] = { ...cur[i]!, status: "pending" as const, title }
    } else {
      cur.push({
        id: randomId(),
        createdAt: Date.now(),
        kind: "chat",
        targetId,
        title,
        status: "pending",
      })
    }
  } else {
    if (i >= 0) {
      cur[i] = { ...cur[i]!, status: "denied" as const, title }
    } else {
      cur.push({
        id: randomId(),
        createdAt: Date.now(),
        kind: "chat",
        targetId,
        title,
        status: "denied",
      })
    }
  }
  await setPendingRequests(cur)
  const next: ParentalSettings = { ...s, allowlistIds: [...al] }
  await setParentalSettings(next)
  return next
}

/** Merge persisted settings locale on startup (after openDB). */
export async function applyStoredLocaleToDocument(): Promise<AppLocale> {
  const s = await getParentalSettings()
  const loc = s.locale ?? readStoredLocaleSync()
  persistLocale(loc)
  return loc
}

export async function saveLocale(l: AppLocale): Promise<void> {
  persistLocale(l)
  const s = await getParentalSettings()
  await setParentalSettings({ ...s, locale: l })
}
