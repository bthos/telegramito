/** PBKDF2 (SHA-256) PIN storage — not hardware-backed; adequate for local UI gating. */

const enc = new TextEncoder()

function randomBytesHex(length: number): string {
  const buf = new Uint8Array(length)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  const salt = Uint8Array.from(
    (saltHex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16))
  )
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  )
  return bufToHex(bits)
}

export async function createPinSalt(): Promise<string> {
  return randomBytesHex(16)
}

export async function verifyPin(
  pin: string,
  saltHex: string,
  expectedHash: string
): Promise<boolean> {
  const h = await hashPin(pin, saltHex)
  return h === expectedHash
}

export async function setNewPin(
  pin: string
): Promise<{ pinHash: string; pinSalt: string }> {
  const pinSalt = await createPinSalt()
  const pinHash = await hashPin(pin, pinSalt)
  return { pinHash, pinSalt }
}
