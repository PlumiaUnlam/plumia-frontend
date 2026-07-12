"use client"

/* eslint-disable @next/next/no-img-element */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react"
import { MoveDiagonal2 } from "lucide-react"

import {
  DEFAULT_EDITOR_IMAGE_WIDTH,
  MIN_EDITOR_IMAGE_WIDTH,
} from "./image.constants"

function clampWidth(width: number) {
  return Math.max(MIN_EDITOR_IMAGE_WIDTH, Math.round(width))
}

export function EditorImageNodeView({
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const currentWidthRef = useRef<number | null>(
    typeof node.attrs.width === "number" ? node.attrs.width : null,
  )
  const [draftWidth, setDraftWidth] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const src = String(node.attrs.src ?? "")
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : ""
  const width =
    draftWidth ??
    (typeof node.attrs.width === "number" ? clampWidth(node.attrs.width) : null)

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const image = imageRef.current
    if (!image) return

    const startX = event.clientX
    const startWidth =
      width ?? image.getBoundingClientRect().width ?? DEFAULT_EDITOR_IMAGE_WIDTH

    setIsResizing(true)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampWidth(startWidth + (moveEvent.clientX - startX))
      currentWidthRef.current = nextWidth
      setDraftWidth(nextWidth)
    }

    const stopResize = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", stopResize)
      setIsResizing(false)

      const nextWidth = clampWidth(
        currentWidthRef.current ?? startWidth ?? DEFAULT_EDITOR_IMAGE_WIDTH,
      )

      updateAttributes({ width: nextWidth })
      setDraftWidth(null)
      currentWidthRef.current = nextWidth
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", stopResize, { once: true })
  }

  const handleLoad = () => {
    if (typeof node.attrs.width === "number") {
      return
    }

    const image = imageRef.current
    if (!image) return

    const initialWidth = clampWidth(
      Math.min(image.naturalWidth || DEFAULT_EDITOR_IMAGE_WIDTH, 640),
    )

    currentWidthRef.current = initialWidth
    updateAttributes({ width: initialWidth })
    setDraftWidth(null)
  }

  return (
    <NodeViewWrapper
      as="figure"
      className={[
        "group relative my-6 mx-auto flex max-w-full justify-center",
        selected ? "ring-2 ring-primary ring-offset-2" : "",
        isResizing ? "select-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-drag-handle
      contentEditable={false}
    >
      <div className="relative inline-flex max-w-full flex-col items-center">
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          style={
            width
              ? {
                  width: `${width}px`,
                  maxWidth: "100%",
                  height: "auto",
                }
              : {
                  maxWidth: "100%",
                  height: "auto",
                }
          }
          className="block rounded-lg border border-border shadow-sm"
        />

        {selected && (
          <button
            type="button"
            onPointerDown={startResize}
            className="absolute -right-2 -bottom-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:bg-muted"
            title="Redimensionar imagen"
            aria-label="Redimensionar imagen"
          >
            <MoveDiagonal2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  )
}
