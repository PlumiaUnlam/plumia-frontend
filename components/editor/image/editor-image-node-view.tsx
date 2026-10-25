"use client"

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react"
import { MoveDiagonal2 } from "lucide-react"

import {
  DEFAULT_EDITOR_IMAGE_WIDTH,
  MIN_EDITOR_IMAGE_WIDTH,
} from "./image.constants"
import {
  MAX_WRAPPED_IMAGE_WIDTH,
  WRAPPED_IMAGE_WIDTH_PERCENT,
  normalizeImageTextFlow,
  type ImageTextFlow,
} from "./image-text-flow"

const TEXT_FLOW_CLASS_NAMES: Record<ImageTextFlow, string> = {
  break: "mx-auto my-6 max-w-full",
  "text-right": "float-left mt-1 mr-4 mb-3 ml-0 w-fit",
  "text-left": "float-right mt-1 mr-0 mb-3 ml-4 w-fit",
}

function clampWidth(width: number, maxWidth = Number.POSITIVE_INFINITY) {
  const upperBound = Math.max(1, maxWidth)
  const lowerBound = Math.min(MIN_EDITOR_IMAGE_WIDTH, upperBound)
  return Math.min(upperBound, Math.max(lowerBound, Math.round(width)))
}

function getImageMaxWidth(image: HTMLImageElement, wrapsText: boolean) {
  const editorWidth = image.closest(".ProseMirror")?.getBoundingClientRect().width ?? 0
  if (!editorWidth) {
    return wrapsText ? MAX_WRAPPED_IMAGE_WIDTH : Number.POSITIVE_INFINITY
  }

  return wrapsText
    ? Math.min(
        (editorWidth * WRAPPED_IMAGE_WIDTH_PERCENT) / 100,
        MAX_WRAPPED_IMAGE_WIDTH,
      )
    : editorWidth
}

export function EditorImageNodeView({
  editor,
  node,
  selected,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const resizeListenersRef = useRef<{
    onPointerMove: (event: PointerEvent) => void
    onPointerUp: () => void
    onPointerCancel: () => void
  } | null>(null)
  const currentWidthRef = useRef<number | null>(
    typeof node.attrs.width === "number" ? node.attrs.width : null,
  )
  const [draftWidth, setDraftWidth] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const src = String(node.attrs.src ?? "")
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : ""
  const textFlow = normalizeImageTextFlow(node.attrs.textFlow)
  const width =
    draftWidth ??
    (typeof node.attrs.width === "number" ? clampWidth(node.attrs.width) : null)
  const imageOnLeft = textFlow === "text-right"
  const wrapsText = textFlow !== "break"

  useEffect(() => {
    return () => {
      const listeners = resizeListenersRef.current
      if (!listeners) return

      window.removeEventListener("pointermove", listeners.onPointerMove)
      window.removeEventListener("pointerup", listeners.onPointerUp)
      window.removeEventListener("pointercancel", listeners.onPointerCancel)
      resizeListenersRef.current = null
    }
  }, [])

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const image = imageRef.current
    if (!image) return

    const maxWidth = getImageMaxWidth(image, wrapsText)
    const startX = event.clientX
    const renderedWidth = image.getBoundingClientRect().width
    const startWidth = clampWidth(
      renderedWidth || width || DEFAULT_EDITOR_IMAGE_WIDTH,
      maxWidth,
    )
    currentWidthRef.current = startWidth

    setIsResizing(true)

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return

      const nextWidth = clampWidth(
        startWidth + (moveEvent.clientX - startX),
        maxWidth,
      )
      currentWidthRef.current = nextWidth
      setDraftWidth(nextWidth)
    }

    const stopResize = () => {
      resizeListenersRef.current = null
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", stopResize)
      window.removeEventListener("pointercancel", cancelResize)
      setIsResizing(false)

      const nextWidth = clampWidth(
        currentWidthRef.current ?? startWidth ?? DEFAULT_EDITOR_IMAGE_WIDTH,
        maxWidth,
      )

      updateAttributes({ width: nextWidth })
      setDraftWidth(null)
      currentWidthRef.current = nextWidth
    }

    const cancelResize = () => {
      resizeListenersRef.current = null
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", stopResize)
      window.removeEventListener("pointercancel", cancelResize)
      setIsResizing(false)
      setDraftWidth(null)
      currentWidthRef.current = startWidth
    }

    resizeListenersRef.current = {
      onPointerMove,
      onPointerUp: stopResize,
      onPointerCancel: cancelResize,
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", stopResize, { once: true })
    window.addEventListener("pointercancel", cancelResize, { once: true })
  }

  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return

    const image = imageRef.current
    if (!image) return

    event.preventDefault()
    const maxWidth = getImageMaxWidth(image, wrapsText)
    const currentWidth =
      width ??
      (image.getBoundingClientRect().width || DEFAULT_EDITOR_IMAGE_WIDTH)
    const step = event.shiftKey ? 50 : 10
    const delta = event.key === "ArrowRight" ? step : -step
    const nextWidth = clampWidth(currentWidth + delta, maxWidth)

    currentWidthRef.current = nextWidth
    setDraftWidth(nextWidth)
    updateAttributes({ width: nextWidth })
    setDraftWidth(null)
  }

  const handleLoad = () => {
    if (typeof node.attrs.width === "number") {
      return
    }

    const image = imageRef.current
    if (!image) return

    const maxWidth = getImageMaxWidth(image, wrapsText)
    const initialWidth = clampWidth(
      Math.min(image.naturalWidth || DEFAULT_EDITOR_IMAGE_WIDTH, 640),
      maxWidth,
    )

    currentWidthRef.current = initialWidth
    updateAttributes({ width: initialWidth })
    setDraftWidth(null)
  }

  const selectImage = () => {
    const position = getPos()
    if (typeof position === "number") {
      editor.commands.setNodeSelection(position)
    }
  }

  const imageLayoutClassName = TEXT_FLOW_CLASS_NAMES[textFlow]
  const widthDescription = width ? `, ancho ${width} píxeles` : ""
  return (
    <NodeViewWrapper
      as="figure"
      className={[
        "group relative flex justify-center",
        imageLayoutClassName,
        wrapsText ? "z-10" : "",
        isResizing ? "select-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        wrapsText
          ? {
              maxWidth: `min(${WRAPPED_IMAGE_WIDTH_PERCENT}%, ${MAX_WRAPPED_IMAGE_WIDTH}px)`,
              clear: imageOnLeft ? "left" : "right",
            }
          : { clear: "both" }
      }
      data-text-flow={textFlow}
      data-drag-handle
      contentEditable={false}
    >
      <div className="inline-flex max-w-full flex-col items-center">
        <div
          className={[
            "relative inline-flex max-w-full",
            selected ? "ring-2 ring-primary ring-offset-2" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            type="button"
            onClick={selectImage}
            aria-label={`Seleccionar imagen${alt ? `: ${alt}` : ""}`}
            aria-pressed={selected}
            className="block max-w-full cursor-pointer rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
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
                      margin: 0,
                    }
                  : {
                      maxWidth: "100%",
                      height: "auto",
                      margin: 0,
                    }
              }
              className="block rounded-lg border border-border shadow-sm"
            />
          </button>

          {selected && (
            <button
              type="button"
              onPointerDown={startResize}
              onKeyDown={resizeWithKeyboard}
              className="absolute -right-2 -bottom-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:bg-muted"
              title="Redimensionar imagen"
              aria-label={`Redimensionar imagen${widthDescription}. Usa las flechas izquierda y derecha.`}
            >
              <MoveDiagonal2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
