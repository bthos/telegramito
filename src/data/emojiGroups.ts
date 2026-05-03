import raw from "unicode-emoji-json/data-by-group.json"

export type EmojiItem = {
  emoji: string
  name: string
  slug: string
}

export type EmojiGroup = {
  id: string
  name: string
  slug: string
  iconEmoji: string
  emojis: EmojiItem[]
}

type RawGroup = {
  name: string
  slug: string
  emojis: EmojiItem[]
}

function normalizeGroups(): EmojiGroup[] {
  const keys = Object.keys(raw).sort((a, b) => Number(a) - Number(b))
  const out: EmojiGroup[] = []
  for (const k of keys) {
    const g = (raw as unknown as Record<string, RawGroup>)[k]
    if (g?.emojis?.length) {
      out.push({
        id: k,
        name: g.name,
        slug: g.slug,
        iconEmoji: g.emojis[0]!.emoji,
        emojis: g.emojis.map((e) => ({
          emoji: e.emoji,
          name: e.name,
          slug: e.slug,
        })),
      })
    }
  }
  return out
}

/** Stable category order from unicode-emoji-json (Smileys … Flags). */
export const EMOJI_GROUPS: readonly EmojiGroup[] = normalizeGroups()
