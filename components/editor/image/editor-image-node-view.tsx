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
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  MoveDiagonal2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

const TEXT_FLOW_LABELS: Record<ImageTextFlow, string> = {
  break: "Renglón completo",
  "text-right": "Texto a la derecha",
  "text-left": "Texto a la izquierda",
}

const TEXT_FLOW_ICONS: Record<ImageTextFlow, typeof AlignCenter> = {
  break: AlignCenter,
  "text-right": AlignLeft,
  "text-left": AlignRight,
}

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
  node,
  selected,
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

  const updateTextFlow = (value: string) => {
    updateAttributes({ textFlow: normalizeImageTextFlow(value) })
  }

  const textFlowLabel = TEXT_FLOW_LABELS[textFlow]
  const TextFlowIcon = TEXT_FLOW_ICONS[textFlow]
  const imageLayoutClassName = TEXT_FLOW_CLASS_NAMES[textFlow]
  const widthDescription = width ? `, ancho ${width} píxeles` : ""
  return (
    <NodeViewWrapper
      as="figure"
      className={[
        "group relative flex justify-center",
        imageLayoutClassName,
        selected ? "ring-2 ring-primary ring-offset-2" : "",
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

        {selected && (
          <>
            <div className="absolute -top-11 left-0 z-30">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-[#dadce0] bg-white px-2 text-xs text-[#3c4043] shadow-sm dark:border-border dark:bg-background dark:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    title="Ajuste de texto"
                    aria-label="Ajuste de texto"
                  >
                    <TextFlowIcon className="size-4" />
                    {textFlowLabel}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 border-[#dadce0] bg-white text-[#3c4043] dark:border-border dark:bg-popover dark:text-popover-foreground">
                  <DropdownMenuRadioGroup
                    value={textFlow}
                    onValueChange={updateTextFlow}
                  >
                    <DropdownMenuRadioItem value="break" className="min-h-10 gap-2">
                      <AlignCenter className="size-4" />
                      Renglón completo
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="text-right" className="min-h-10 gap-2">
                      <AlignLeft className="size-4" />
                      Imagen a la izquierda, texto a la derecha
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="text-left" className="min-h-10 gap-2">
                      <AlignRight className="size-4" />
                      Imagen a la derecha, texto a la izquierda
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}
