/**
 * AC-T16 / AC-T17 (migrate-teleproto, Cycle A): inbound message formatting.
 *
 * `MessageTextContent.tsx` maps every `Api.MessageEntity*` class to DOM via
 * `entity instanceof Api.MessageEntity*`. After the teleproto swap this had no
 * direct coverage. These tests exercise the render mapping (AC-T16), the href
 * sanitiser, and prove a `MessageEntity` that has been through teleproto binary
 * (de)serialization is still `instanceof` the class the renderer branches on
 * and still drives the renderer (AC-T17).
 */
import { render } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"
import { Api } from "teleproto"
import bigInt from "big-integer"
import { describe, expect, it } from "vitest"
import { MessageTextContent, renderMessageEntities } from "./MessageTextContent"

type Ent = Api.TypeMessageEntity

function draw(text: string, entities: Ent[]) {
  return render(<div>{renderMessageEntities(text, entities, null)}</div>).container
}

describe("renderMessageEntities — entity → DOM mapping (AC-T16)", () => {
  it("bold / italic / underline / strike / code", () => {
    const text = "boldem_uline_strikecode"
    const c = draw(text, [
      new Api.MessageEntityBold({ offset: 0, length: 4 }),
      new Api.MessageEntityItalic({ offset: 4, length: 2 }),
      new Api.MessageEntityUnderline({ offset: 7, length: 5 }),
      new Api.MessageEntityStrike({ offset: 13, length: 6 }),
      new Api.MessageEntityCode({ offset: 19, length: 4 }),
    ])
    expect(c.querySelector("strong.msg-entity")?.textContent).toBe("bold")
    expect(c.querySelector("em.msg-entity")?.textContent).toBe("em")
    expect(c.querySelector("u.msg-entity")?.textContent).toBe("uline")
    expect(c.querySelector("del.msg-entity")?.textContent).toBe("strike")
    expect(c.querySelector("code.msg-entity--code")?.textContent).toBe("code")
  })

  it("pre without and with a language", () => {
    const a = draw("plaincode", [new Api.MessageEntityPre({ offset: 0, length: 9, language: "" })])
    expect(a.querySelector("pre.msg-entity--pre")).toBeTruthy()
    expect(a.querySelector("pre > code")).toBeFalsy()

    const b = draw("x = 1", [new Api.MessageEntityPre({ offset: 0, length: 5, language: "js" })])
    expect(b.querySelector("pre.msg-entity--pre > code.language-js")?.textContent).toBe("x = 1")
  })

  it("blockquote", () => {
    const c = draw("quoted", [new Api.MessageEntityBlockquote({ offset: 0, length: 6 })])
    expect(c.querySelector("blockquote.msg-entity--quote")?.textContent).toBe("quoted")
  })

  it("spoiler reveals on click", () => {
    const c = draw("secret", [new Api.MessageEntitySpoiler({ offset: 0, length: 6 })])
    const sp = c.querySelector(".msg-entity--spoiler") as HTMLElement
    expect(sp).toBeTruthy()
    expect(sp.getAttribute("role")).toBe("button")
    expect(sp.getAttribute("aria-label")).toBe("Spoiler — tap to show")
    fireEvent.click(sp)
    expect(c.querySelector(".msg-entity--spoiler--open")).toBeTruthy()
  })

  it("plain url and text-url anchors open in a new tab", () => {
    const u = draw("https://example.com", [
      new Api.MessageEntityUrl({ offset: 0, length: 19 }),
    ])
    const ua = u.querySelector("a.msg-entity--link") as HTMLAnchorElement
    expect(ua.getAttribute("href")).toBe("https://example.com")
    expect(ua.getAttribute("target")).toBe("_blank")
    expect(ua.getAttribute("rel")).toBe("noopener noreferrer")

    const t = draw("docs", [
      new Api.MessageEntityTextUrl({ offset: 0, length: 4, url: "https://example.com/x" }),
    ])
    expect((t.querySelector("a.msg-entity--link") as HTMLAnchorElement).getAttribute("href")).toBe(
      "https://example.com/x",
    )
  })

  it("neutralises dangerous hrefs to about:blank", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,<script>1</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      const c = draw("x", [new Api.MessageEntityTextUrl({ offset: 0, length: 1, url: bad })])
      expect((c.querySelector("a") as HTMLAnchorElement).getAttribute("href")).toBe("about:blank")
    }
    const ok = draw("x", [
      new Api.MessageEntityTextUrl({ offset: 0, length: 1, url: "https://ok.example" }),
    ])
    expect((ok.querySelector("a") as HTMLAnchorElement).getAttribute("href")).toBe(
      "https://ok.example",
    )
    const scheme = draw("x", [
      new Api.MessageEntityTextUrl({ offset: 0, length: 1, url: "//cdn.example/x" }),
    ])
    expect((scheme.querySelector("a") as HTMLAnchorElement).getAttribute("href")).toBe(
      "https://cdn.example/x",
    )
  })

  it("mention, mention-name, hashtag, cashtag, email, phone", () => {
    const mention = draw("@alice", [new Api.MessageEntityMention({ offset: 0, length: 6 })])
    expect(
      (mention.querySelector("a.msg-entity--mention") as HTMLAnchorElement).getAttribute("href"),
    ).toBe("https://t.me/alice")

    const mn = draw("Alice", [
      new Api.MessageEntityMentionName({ offset: 0, length: 5, userId: bigInt(777) }),
    ])
    expect((mn.querySelector("a.msg-entity--link") as HTMLAnchorElement).getAttribute("href")).toBe(
      "tg://user?id=777",
    )

    const hash = draw("#tag", [new Api.MessageEntityHashtag({ offset: 0, length: 4 })])
    expect(hash.querySelector("a.msg-entity--tag-link")?.textContent).toBe("#tag")

    const cash = draw("$AAPL", [new Api.MessageEntityCashtag({ offset: 0, length: 5 })])
    expect(cash.querySelector("a.msg-entity--tag-link")).toBeTruthy()

    const email = draw("a@b.com", [new Api.MessageEntityEmail({ offset: 0, length: 7 })])
    expect((email.querySelector("a") as HTMLAnchorElement).getAttribute("href")).toBe(
      "mailto:a%40b.com",
    )

    const phone = draw("+1 555 000", [new Api.MessageEntityPhone({ offset: 0, length: 10 })])
    expect((phone.querySelector("a") as HTMLAnchorElement).getAttribute("href")).toBe(
      "tel:%2B1555000",
    )
  })

  it("renders nested entities nested", () => {
    // "boldnested" — bold over the whole run, italic over "nested"
    const c = draw("boldnested", [
      new Api.MessageEntityBold({ offset: 0, length: 10 }),
      new Api.MessageEntityItalic({ offset: 4, length: 6 }),
    ])
    const strong = c.querySelector("strong.msg-entity")
    expect(strong).toBeTruthy()
    expect(strong?.querySelector("em.msg-entity")?.textContent).toBe("nested")
  })

  it("plain text with newlines becomes <br>-separated lines", () => {
    const c = render(<div>{renderMessageEntities("a\nb\nc", [], null)}</div>).container
    expect(c.querySelectorAll("br").length).toBe(2)
    expect(c.textContent).toBe("abc")
  })

  it("custom emoji with no client falls back to the placeholder glyph", () => {
    const c = draw("🐈", [
      new Api.MessageEntityCustomEmoji({ offset: 0, length: 2, documentId: bigInt(5) }),
    ])
    expect(c.querySelector(".msg-custom-emoji-fallback")?.textContent).toBe("🐈")
  })
})

describe("MessageTextContent component (AC-T16)", () => {
  const t = ((k: string) => k) as never

  it("renders message.entities through the same mapping", () => {
    const m = new Api.Message({
      id: 1,
      message: "hi there",
      date: 1,
      entities: [new Api.MessageEntityBold({ offset: 0, length: 2 })],
    } as never)
    const c = render(
      <div>
        <MessageTextContent message={m} client={null} noPreview={false} t={t} />
      </div>,
    ).container
    expect(c.querySelector("strong.msg-entity")?.textContent).toBe("hi")
  })

  it("renders nothing for an empty-text message that carries its own media view", () => {
    // MessageMediaUnsupported with no caption: the media component renders the
    // label, so MessageTextContent deliberately returns null (no duplicate text).
    const m = new Api.Message({
      id: 2,
      message: "",
      date: 2,
      media: new Api.MessageMediaUnsupported(),
    } as never)
    const c = render(
      <div>
        <MessageTextContent message={m} client={null} noPreview={false} t={t} />
      </div>,
    ).container
    expect(c.textContent).toBe("")
  })

  it("shows a media type label when an empty message has no own media view", () => {
    const m = new Api.Message({ id: 3, message: "", date: 3 } as never)
    const c = render(
      <div>
        <MessageTextContent message={m} client={null} noPreview={false} t={t} />
      </div>,
    ).container
    expect((c.textContent ?? "").length).toBeGreaterThan(0)
  })
})

describe("entity survives teleproto binary (de)serialization (AC-T17)", () => {
  it("a round-tripped MessageEntityBold is instanceof the class and drives the renderer", async () => {
    const orig = new Api.MessageEntityBold({ offset: 0, length: 4 })
    const bytes = orig.getBytes()

    const { BinaryReader } = await import("teleproto/extensions")
    const back = new BinaryReader(bytes).tgReadObject() as Api.TypeMessageEntity

    expect(back).toBeInstanceOf(Api.MessageEntityBold)
    expect(back.offset).toBe(0)
    expect(back.length).toBe(4)

    const c = render(<div>{renderMessageEntities("bold", [back], null)}</div>).container
    expect(c.querySelector("strong.msg-entity")?.textContent).toBe("bold")
  })
})

// ---------------------------------------------------------------------------
// rich-messages-render (AC-R1 / AC-R2 / AC-R7 / AC-R8): rich-only bubble stub
// ---------------------------------------------------------------------------

const tk = ((k: string) => k) as never

function richBody(...paras: string[]): Api.RichMessage {
  return new Api.RichMessage({
    blocks: paras.map(
      (p) => new Api.PageBlockParagraph({ text: new Api.TextPlain({ text: p }) }),
    ),
    photos: [],
    documents: [],
  } as never)
}

describe("MessageTextContent — rich-only stub (rich-messages-render)", () => {
  it("rich body + empty text → newsprint stub with label + excerpt, not a blank bubble (AC-R1/R8)", () => {
    const m = new Api.Message({
      id: 1,
      message: "",
      date: 1,
      richMessage: richBody("Opening lines of the article."),
    } as never)
    const c = render(
      <div>
        <MessageTextContent message={m} client={null} noPreview={false} t={tk} />
      </div>,
    ).container
    expect(c.querySelector(".msg-rich-stub")).toBeTruthy()
    expect(c.querySelector(".msg-rich-stub__label")?.textContent).toBe("chat.previewRichMessage")
    expect(c.querySelector(".msg-rich-stub__excerpt")?.textContent).toContain("Opening lines")
    // glyph is decorative
    expect(c.querySelector(".msg-rich-stub__ico")?.getAttribute("aria-hidden")).toBe("true")
  })

  it("plain text + rich body → plain text only, no stub (AC-R2)", () => {
    const m = new Api.Message({
      id: 2,
      message: "just the plain part",
      date: 2,
      richMessage: richBody("rich part ignored in v1"),
    } as never)
    const c = render(
      <div>
        <MessageTextContent message={m} client={null} noPreview={false} t={tk} />
      </div>,
    ).container
    expect(c.querySelector(".msg-rich-stub")).toBeNull()
    expect(c.textContent).toContain("just the plain part")
  })

  it("rich-only in a channel → Open in Telegram link to the canonical message URL (AC-R7)", () => {
    const m = new Api.Message({
      id: 42,
      message: "",
      date: 3,
      peerId: new Api.PeerChannel({ channelId: bigInt(123456) }),
      richMessage: richBody("body"),
    } as never)
    const c = render(
      <div>
        <MessageTextContent message={m} client={null} noPreview={false} t={tk} />
      </div>,
    ).container
    const open = c.querySelector(".msg-rich-stub__open") as HTMLAnchorElement
    expect(open).toBeTruthy()
    expect(open.getAttribute("href")).toBe("https://t.me/c/123456/42")
    expect(open.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("rich-only in a private chat → stub with no Open link (AC-R7 safe-URL-only)", () => {
    const m = new Api.Message({
      id: 5,
      message: "",
      date: 4,
      peerId: new Api.PeerUser({ userId: bigInt(9) }),
      richMessage: richBody("body"),
    } as never)
    const c = render(
      <div>
        <MessageTextContent message={m} client={null} noPreview={false} t={tk} />
      </div>,
    ).container
    expect(c.querySelector(".msg-rich-stub")).toBeTruthy()
    expect(c.querySelector(".msg-rich-stub__open")).toBeNull()
  })
})
