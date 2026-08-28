import { describe, expect, it } from "vitest"
import { StringSession } from "teleproto/sessions"

/**
 * AC-T5 (migrate-teleproto): verifies that teleproto's `StringSession` reads
 * an existing GramJS-format session string without forcing re-login (D2 /
 * spec Goal). Verified against the real installed packages
 * (`node_modules/teleproto/sessions/StringSession.js` vs
 * `node_modules/telegram/sessions/StringSession.js`): both implementations
 * are byte-for-byte identical (version prefix "1", same dcId/address/port/key
 * layout, same base64 encode/decode) — teleproto did not change the wire
 * format, only added an internal `_loaded` idempotency guard.
 *
 * Security (Bagnik, mandatory): never hardcode a real StringSession here —
 * `src/` is git-tracked and a real session embeds the account auth key (a
 * full account-takeover credential). This builds a synthetic, structurally
 * valid fixture from scratch (fake dcId/address/port, and a key buffer filled
 * with a repeating byte, not a real auth key) using the documented layout,
 * rather than reading or fabricating anything resembling a real session.
 */
function buildSyntheticGramjsFormatSession(opts: {
  dcId: number
  serverAddress: string
  port: number
  keyByte: number
}): string {
  const dcBuffer = Buffer.from([opts.dcId])
  const addressBuffer = Buffer.from(opts.serverAddress)
  const addressLengthBuffer = Buffer.alloc(2)
  addressLengthBuffer.writeInt16BE(addressBuffer.length, 0)
  const portBuffer = Buffer.alloc(2)
  portBuffer.writeInt16BE(opts.port, 0)
  // Real auth keys are 256 bytes; fill with a repeating byte — never a real key.
  const key = Buffer.alloc(256, opts.keyByte)
  const payload = Buffer.concat([dcBuffer, addressLengthBuffer, addressBuffer, portBuffer, key])
  return "1" + payload.toString("base64")
}

describe("teleproto StringSession — GramJS format compatibility (AC-T5)", () => {
  it("accepts an existing GramJS-format StringSession string without throwing", () => {
    // 203.0.113.0/24 (RFC 5737 TEST-NET-3) — reserved for documentation, never a real DC.
    const fixture = buildSyntheticGramjsFormatSession({
      dcId: 2,
      serverAddress: "203.0.113.1",
      port: 443,
      keyByte: 0x07,
    })

    expect(() => new StringSession(fixture)).not.toThrow()

    const session = new StringSession(fixture)
    expect(session.dcId).toBe(2)
    expect(session.serverAddress).toBe("203.0.113.1")
    expect(session.port).toBe(443)
  })

  it("loads the auth key from a GramJS-format session synchronously parsed fields", async () => {
    const fixture = buildSyntheticGramjsFormatSession({
      dcId: 5,
      serverAddress: "203.0.113.5",
      port: 80,
      keyByte: 0x42,
    })
    const session = new StringSession(fixture)
    await session.load()
    expect(session.authKey).toBeTruthy()
    const raw = session.authKey?.getKey()
    expect(raw).toBeTruthy()
    expect(raw?.length).toBe(256)
    expect(raw?.[0]).toBe(0x42)
  })

  it("round-trips a freshly-created teleproto session (empty in, empty out)", () => {
    // No stored session — matches how clientFactory.ts / TelegramContext.tsx
    // construct a fresh StringSession("") before authorization.
    const session = new StringSession("")
    expect(session.save()).toBe("")
  })

  it("rejects a string with the wrong version prefix", () => {
    expect(() => new StringSession("2notavalidsession")).toThrow("Not a valid string")
  })
})
