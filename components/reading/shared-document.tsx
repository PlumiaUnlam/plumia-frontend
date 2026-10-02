import type { CSSProperties, ReactNode } from "react"
import type { ProseMirrorJSON } from "@/types/scene"

type JsonNode = ProseMirrorJSON & { text?: string; attrs?: Record<string, unknown>; marks?: Array<{ type: string; attrs?: Record<string, unknown> }> }

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null
  const href = value.trim()
  if (href.startsWith("/") || href.startsWith("#")) return href
  try {
    const protocol = new URL(href).protocol
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:" ? href : null
  } catch {
    return null
  }
}

function withMarks(text: string, marks: JsonNode["marks"]): ReactNode {
  return (marks ?? []).reduce<ReactNode>((content, mark) => {
    const attrs = mark.attrs ?? {}
    if (mark.type === "bold") return <strong>{content}</strong>
    if (mark.type === "italic") return <em>{content}</em>
    if (mark.type === "strike") return <s>{content}</s>
    if (mark.type === "underline") return <u>{content}</u>
    if (mark.type === "code") return <code>{content}</code>
    if (mark.type === "link") {
      const href = safeHref(attrs.href)
      return href ? <a href={href} target="_blank" rel="noreferrer">{content}</a> : content
    }
    if (mark.type === "highlight") return <mark style={{ backgroundColor: typeof attrs.color === "string" ? attrs.color : undefined }}>{content}</mark>
    if (mark.type === "textStyle") {
      const style: CSSProperties = {}
      if (typeof attrs.color === "string") style.color = attrs.color
      if (typeof attrs.fontFamily === "string") style.fontFamily = attrs.fontFamily
      if (typeof attrs.fontSize === "string") style.fontSize = attrs.fontSize
      return <span style={style}>{content}</span>
    }
    return content
  }, text)
}

function renderNode(node: JsonNode, key: string): ReactNode {
  if (node.type === "text") return <span key={key}>{withMarks(node.text ?? "", node.marks)}</span>
  const children = (node.content ?? []).map((child, index) => renderNode(child as JsonNode, `${key}-${index}`))
  const attrs = node.attrs ?? {}
  if (node.type === "doc") return <>{children}</>
  if (node.type === "paragraph") return <p key={key} style={{ textAlign: typeof attrs.textAlign === "string" ? attrs.textAlign as CSSProperties["textAlign"] : undefined }}>{children}</p>
  if (node.type === "heading") {
    const level = [1, 2, 3].includes(Number(attrs.level)) ? Number(attrs.level) : 2
    const Heading = `h${level}` as "h1" | "h2" | "h3"
    return <Heading key={key}>{children}</Heading>
  }
  if (node.type === "blockquote") return <blockquote key={key}>{children}</blockquote>
  if (node.type === "bulletList") return <ul key={key}>{children}</ul>
  if (node.type === "orderedList") return <ol key={key} start={typeof attrs.start === "number" ? attrs.start : 1}>{children}</ol>
  if (node.type === "listItem") return <li key={key}>{children}</li>
  if (node.type === "hardBreak") return <br key={key} />
  if (node.type === "horizontalRule" || node.type === "sceneDivider") return <hr key={key} className="my-8 border-[#e3d7e9]" />
  if (node.type === "image") {
    const src = typeof attrs.src === "string" ? attrs.src : typeof attrs.imageUrl === "string" ? attrs.imageUrl : ""
    if (!src) return null
    return <figure key={key} className="my-6 text-center"><img src={src} alt={typeof attrs.alt === "string" ? attrs.alt : ""} className="mx-auto max-w-full rounded" />{typeof attrs.caption === "string" && <figcaption className="mt-2 text-sm text-[#806b8b]">{attrs.caption}</figcaption>}</figure>
  }
  return <div key={key}>{children}</div>
}

export function SharedDocument({ content }: Readonly<{ content: ProseMirrorJSON | null }>) {
  if (!content) return <p className="text-[#806b8b]">Esta escena todavía no tiene contenido.</p>
  return <div className="shared-document space-y-2 font-serif text-lg leading-8 text-[#291b38] [&_a]:text-[#8246a0] [&_blockquote]:border-l-2 [&_blockquote]:border-[#c6a8d4] [&_blockquote]:pl-4 [&_h1]:my-5 [&_h1]:text-3xl [&_h2]:my-4 [&_h2]:text-2xl [&_h3]:my-3 [&_h3]:text-xl [&_ol]:list-decimal [&_ol]:pl-7 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-7" data-shared-document="true">
    {renderNode(content as JsonNode, "doc")}
  </div>
}
