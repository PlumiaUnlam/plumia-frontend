export type ImageTextFlow = "break" | "text-right" | "text-left"

export const IMAGE_TEXT_FLOW_OPTIONS = [
  {
    value: "break",
    label: "Renglón completo",
    shortLabel: "Renglón completo",
  },
  {
    value: "text-right",
    label: "Imagen a la izquierda, texto a la derecha",
    shortLabel: "Texto a la derecha",
  },
  {
    value: "text-left",
    label: "Imagen a la derecha, texto a la izquierda",
    shortLabel: "Texto a la izquierda",
  },
] as const satisfies ReadonlyArray<{
  value: ImageTextFlow
  label: string
  shortLabel: string
}>

export const DEFAULT_IMAGE_TEXT_FLOW: ImageTextFlow = "break"
export const MAX_WRAPPED_IMAGE_WIDTH = 320
export const WRAPPED_IMAGE_WIDTH_PERCENT = 45

export function normalizeImageTextFlow(value: unknown): ImageTextFlow {
  if (value === "text-right" || value === "wrap") return "text-right"
  if (value === "text-left") return "text-left"
  return DEFAULT_IMAGE_TEXT_FLOW
}

export function getImageTextFlowHTMLAttributes(
  value: unknown,
  width?: unknown,
): Record<string, string> {
  const textFlow = normalizeImageTextFlow(value)
  const parsedWidth =
    typeof width === "number" && Number.isFinite(width) && width > 0
      ? Math.round(width)
      : null

  const wrapsText = textFlow !== "break"
  const imageOnLeft = textFlow === "text-right"
  const wrappedWidth = `${WRAPPED_IMAGE_WIDTH_PERCENT}%`
  let widthStyle = "width: auto;"
  if (parsedWidth !== null) {
    widthStyle = wrapsText
      ? `width: min(${parsedWidth}px, ${wrappedWidth}, ${MAX_WRAPPED_IMAGE_WIDTH}px);`
      : `width: ${parsedWidth}px;`
  }

  let imageStyle: string
  if (!wrapsText) {
    imageStyle = `display: block; float: none; clear: both; ${widthStyle} max-width: 100%; height: auto; margin: 1.5rem auto;`
  } else if (imageOnLeft) {
    imageStyle = `display: block; float: left; clear: left; ${widthStyle} max-width: min(${wrappedWidth}, ${MAX_WRAPPED_IMAGE_WIDTH}px); height: auto; margin: 0.25rem 1rem 0.75rem 0;`
  } else {
    imageStyle = `display: block; float: right; clear: right; ${widthStyle} max-width: min(${wrappedWidth}, ${MAX_WRAPPED_IMAGE_WIDTH}px); height: auto; margin: 0.25rem 0 0.75rem 1rem;`
  }

  return {
    "data-text-flow": textFlow,
    style: imageStyle,
  }
}
