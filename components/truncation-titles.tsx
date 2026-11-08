"use client"

import { useEffect } from "react"

const AUTO_TITLE = "data-auto-title"
const MAX_ANCESTORS = 6

/** El texto está cortado con «…» (una línea o varias con line-clamp). */
function isTruncated(element: HTMLElement) {
  const style = getComputedStyle(element)
  const clamp = style.getPropertyValue("-webkit-line-clamp")
  const clampsLines = clamp !== "" && clamp !== "none"
  if (clampsLines) return element.scrollHeight > element.clientHeight + 1
  return style.textOverflow === "ellipsis" && element.scrollWidth > element.clientWidth + 1
}

function readableText(element: HTMLElement) {
  return (element.textContent ?? "").replaceAll(/\s+/g, " ").trim()
}

/**
 * Cuando el texto de un elemento queda cortado, al pasar el mouse o enfocarlo se
 * muestra el texto completo como ayuda del navegador. Se calcula en el momento
 * (no al renderizar) para no recorrer toda la página ni depender de cada pantalla.
 */
function revealFullText(start: EventTarget | null) {
  let element = start instanceof HTMLElement ? start : null
  for (let depth = 0; element && depth < MAX_ANCESTORS; depth += 1) {
    if (element.hasAttribute(AUTO_TITLE)) {
      if (!isTruncated(element)) {
        element.removeAttribute("title")
        element.removeAttribute(AUTO_TITLE)
      }
      return
    }
    if (!element.hasAttribute("title") && isTruncated(element)) {
      const text = readableText(element)
      if (text) {
        element.setAttribute("title", text)
        element.setAttribute(AUTO_TITLE, "")
      }
      return
    }
    element = element.parentElement
  }
}

export function TruncationTitles() {
  useEffect(() => {
    const onPointerOver = (event: PointerEvent) => revealFullText(event.target)
    const onFocusIn = (event: FocusEvent) => revealFullText(event.target)
    document.addEventListener("pointerover", onPointerOver, { passive: true })
    document.addEventListener("focusin", onFocusIn, { passive: true })
    return () => {
      document.removeEventListener("pointerover", onPointerOver)
      document.removeEventListener("focusin", onFocusIn)
    }
  }, [])
  return null
}
