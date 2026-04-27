/**
 * Map TL `bytes` (Buffer / Uint8Array) to a comparable key for poll option matching.
 */
export function optionBytesToKey(b: Uint8Array | { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }): string {
  const u = b instanceof Uint8Array
    ? b
    : ArrayBuffer.isView(b)
      ? new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
      : new Uint8Array(0)
  if (u.length === 0) {
    return ""
  }
  let s = ""
  for (let i = 0; i < u.length; i += 1) {
    s += ` ${u[i]!.toString(16).padStart(2, "0")}`
  }
  return s.trim()
}

type RawBytes = Uint8Array | { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }

export function isSameOptionBytes(a: RawBytes, b: RawBytes): boolean {
  return optionBytesToKey(a) === optionBytesToKey(b)
}
