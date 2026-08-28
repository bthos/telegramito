import type { Api } from "teleproto"

/**
 * Fixed JPEG header template for Telegram's PhotoStrippedSize reconstruction.
 * Bytes at offsets 164 and 166 are replaced with height and width from the stripped data.
 * Source: teleproto Utils.ts — strippedPhotoToJpg (algorithm originates in the Telethon/GramJS lineage)
 */
const JPEG_HEADER = new Uint8Array(
  "ffd8ffe000104a46494600010100000100010000ffdb004300281c1e231e19282321232d2b28303c64413c37373c7b585d4964918099968f808c8aa0b4e6c3a0aadaad8a8cc8ffcbdaeef5ffffff9bc1fffffffaffe6fdfff8ffdb0043012b2d2d3c353c76414176f8a58ca5f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8ffc00011080000000003012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00"
    .match(/.{2}/g)!
    .map((h) => parseInt(h, 16)),
)

const JPEG_FOOTER = new Uint8Array([0xff, 0xd9])

/** Decode a Telegram PhotoStrippedSize bytes field into a JPEG data URL. */
export function strippedToDataUrl(bytes: Uint8Array): string {
  const header = new Uint8Array(JPEG_HEADER)
  header[164] = bytes[1]
  header[166] = bytes[2]
  const scan = bytes.slice(3)
  const full = new Uint8Array(header.length + scan.length + JPEG_FOOTER.length)
  full.set(header, 0)
  full.set(scan, header.length)
  full.set(JPEG_FOOTER, header.length + scan.length)
  let binary = ""
  for (let i = 0; i < full.length; i++) {
    binary += String.fromCharCode(full[i])
  }
  return `data:image/jpeg;base64,${btoa(binary)}`
}

/** Extract inline preview data URL from a photo or document (null if none available). */
export function extractInlineThumb(
  media: Api.TypeMessageMedia | undefined,
): { dataUrl: string; w: number; h: number } | null {
  if (!media) return null

  let bytes: Uint8Array | undefined
  let w = 40
  let h = 40

  if (media.className === "MessageMediaPhoto") {
    const photo = media.photo
    if (!photo || photo.className !== "Photo") return null
    const size = photo.sizes?.find(
      (s) => s.className === "PhotoStrippedSize" || (s as { type?: string }).type === "i",
    ) as (Api.PhotoStrippedSize & { w?: number; h?: number }) | undefined
    if (!size) return null
    bytes = size.bytes instanceof Uint8Array ? size.bytes : undefined
    if (bytes && size.w != null) w = size.w
    if (bytes && size.h != null) h = size.h
  } else if (media.className === "MessageMediaDocument") {
    const doc = media.document
    if (!doc || doc.className !== "Document") return null
    const thumbs = (doc as Api.Document & { thumbs?: unknown[] }).thumbs
    if (!Array.isArray(thumbs)) return null
    const size = thumbs.find(
      (s) => (s as { className?: string }).className === "PhotoStrippedSize"
        || (s as { type?: string }).type === "i",
    ) as (Api.PhotoStrippedSize & { w?: number; h?: number }) | undefined
    if (!size) return null
    bytes = size.bytes instanceof Uint8Array ? size.bytes : undefined
    if (bytes && size.w != null) w = size.w
    if (bytes && size.h != null) h = size.h
  }

  if (!bytes || bytes.length < 3 || bytes[0] !== 1) return null
  return { dataUrl: strippedToDataUrl(bytes), w, h }
}
