export function toU8(buf: unknown): Uint8Array {
  if (buf instanceof Uint8Array) {
    return buf
  }
  if (ArrayBuffer.isView(buf)) {
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  if (buf instanceof ArrayBuffer) {
    return new Uint8Array(buf)
  }
  return new Uint8Array(0)
}

export function makeBlobUrl(buf: unknown, mime: string): string {
  return URL.createObjectURL(
    new Blob([toU8(buf).slice() as BlobPart], { type: mime || "application/octet-stream" })
  )
}
