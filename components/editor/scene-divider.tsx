"use client"

import { mergeAttributes, Node } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react"

import { cn } from "@/lib/utils"

export const SCENE_DIVIDER_VARIANTS = [
  "flourish",
  "diamonds",
  "stars",
  "waves",
] as const

export type SceneDividerVariant = (typeof SCENE_DIVIDER_VARIANTS)[number]

export const DEFAULT_SCENE_DIVIDER_VARIANT: SceneDividerVariant = "flourish"

export const SCENE_DIVIDER_OPTIONS: Array<{
  value: SceneDividerVariant
  label: string
}> = [
  { value: "flourish", label: "Florituras" },
  { value: "diamonds", label: "Puntas y puntos" },
  { value: "stars", label: "Estrellas" },
  { value: "waves", label: "Ramas y hojas" },
]

const SCENE_DIVIDER_GLYPHS: Record<SceneDividerVariant, string> = {
  flourish: "❦",
  diamonds: "• ◆ •",
  stars: "✦",
  waves: "❧",
}

export function isSceneDividerVariant(
  value: unknown,
): value is SceneDividerVariant {
  return (
    typeof value === "string" &&
    (SCENE_DIVIDER_VARIANTS as readonly string[]).includes(value)
  )
}

function normalizeSceneDividerVariant(value: unknown): SceneDividerVariant {
  return isSceneDividerVariant(value) ? value : DEFAULT_SCENE_DIVIDER_VARIANT
}

function SceneDividerArtwork({ variant }: { variant: SceneDividerVariant }) {
  const svgProps = {
    className: "scene-divider__svg",
    viewBox: "0 0 128 32",
    xmlns: "http://www.w3.org/2000/svg",
    role: "img",
    "aria-label": "Adorno ornamental",
    style: { color: "var(--scene-divider-color)" },
  } as const

  if (variant === "flourish") {
    return (
      <svg {...svgProps}>
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        >
          <path d="M4 18c8-11 24-13 29-5 4 7-4 11-10 7-4-3-1-8 4-8" />
          <path d="M28 18c12 0 22-7 33-8 8-1 12 3 12 8" />
          <path d="M124 18c-8-11-24-13-29-5-4 7 4 11 10 7 4-3 1-8-4-8" />
          <path d="M100 18c-12 0-22-7-33-8-8-1-12 3-12 8" />
          <path d="M64 19v9" />
        </g>
        <path d="M64 3l4 8-4 6-4-6z" fill="currentColor" opacity="0.82" />
        <circle cx="64" cy="19" r="1.7" fill="currentColor" />
        <circle cx="57" cy="19" r="0.9" fill="currentColor" opacity="0.72" />
        <circle cx="71" cy="19" r="0.9" fill="currentColor" opacity="0.72" />
      </svg>
    )
  }

  if (variant === "diamonds") {
    return (
      <svg {...svgProps}>
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        >
          <path d="M4 16h35" />
          <path d="M124 16H89" />
          <path d="M43 10l6 6-6 6" />
          <path d="M85 10l-6 6 6 6" />
          <path d="M51 16h26" />
        </g>
        <g fill="currentColor">
          <circle cx="54" cy="16" r="1.7" />
          <circle cx="59" cy="16" r="1.7" />
          <path d="M64 7l8 9-8 9-8-9z" opacity="0.18" />
          <path d="M64 10l5.5 6-5.5 6-5.5-6z" />
          <circle cx="69" cy="16" r="1.7" />
          <circle cx="74" cy="16" r="1.7" />
        </g>
        <path
          d="M64 10l5.5 6-5.5 6-5.5-6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
      </svg>
    )
  }

  if (variant === "stars") {
    return (
      <svg {...svgProps}>
        <g fill="currentColor">
          <path d="M64 3l2.7 8.3H75l-6.7 5.1 2.5 8.2-6.8-4.9-6.8 4.9 2.5-8.2L53 11.3h8.3z" />
          <path d="M46 9l1.6 4.8h5.1l-4.1 3 1.6 4.9-4.2-3-4.1 3 1.6-4.9-4.1-3h5.1z" opacity="0.7" />
          <path d="M82 9l1.6 4.8h5.1l-4.1 3 1.6 4.9-4.2-3-4.1 3 1.6-4.9-4.1-3h5.1z" opacity="0.7" />
        </g>
        <path
          d="M4 16h36 M88 16h36"
          fill="none"
          stroke="currentColor"
          strokeDasharray="1 4"
          strokeLinecap="round"
          strokeWidth="1.25"
        />
      </svg>
    )
  }

  return (
    <svg {...svgProps}>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.15"
      >
        <path d="M4 23c18 0 36-5 60-9" />
        <path d="M124 23c-18 0-36-5-60-9" />
        <path d="M57 15c3 0 5 3 7 5 2-2 4-5 7-5" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="0.9"
      >
        <path d="M18 21c-2-6-7-9-12-9 2 5 6 8 12 9z" />
        <path d="M25 20c0 5-3 8-8 10 0-5 3-8 8-10z" />
        <path d="M31 19c-1-6-5-9-10-11 1 5 4 9 10 11z" />
        <path d="M39 18c0 5-3 8-8 10 0-5 3-8 8-10z" />
        <path d="M46 17c-1-5-5-8-10-10 1 5 4 8 10 10z" />
        <path d="M54 16c0 4-3 7-7 9 0-4 3-7 7-9z" />
        <path d="M110 21c2-6 7-9 12-9-2 5-6 8-12 9z" />
        <path d="M103 20c0 5 3 8 8 10 0-5-3-8-8-10z" />
        <path d="M97 19c1-6 5-9 10-11-1 5-4 9-10 11z" />
        <path d="M89 18c0 5 3 8 8 10 0-5-3-8-8-10z" />
        <path d="M82 17c1-5 5-8 10-10-1 5-4 8-10 10z" />
        <path d="M74 16c0 4 3 7 7 9 0-4-3-7-7-9z" />
      </g>
    </svg>
  )
}

export function SceneDividerPreview({
  variant,
  className,
}: {
  variant: SceneDividerVariant
  className?: string
}) {
  return (
    <span
      className={cn("scene-divider-preview", className)}
      data-divider-variant={variant}
      aria-hidden="true"
    >
      <span className="scene-divider__line" />
      <span className="scene-divider__artwork">
        <SceneDividerArtwork variant={variant} />
      </span>
      <span className="scene-divider__line" />
    </span>
  )
}

function SceneDividerNodeView({ node, selected }: NodeViewProps) {
  const variant = normalizeSceneDividerVariant(node.attrs.variant)

  return (
    <NodeViewWrapper
      as="div"
      className={cn("scene-divider", selected && "scene-divider--selected")}
      data-scene-divider=""
      data-divider-variant={variant}
      role="separator"
      aria-label="Separador ornamental"
      contentEditable={false}
    >
      <span className="scene-divider__line" aria-hidden="true" />
      <span className="scene-divider__artwork" aria-hidden="true">
        <SceneDividerArtwork variant={variant} />
      </span>
      <span className="scene-divider__line" aria-hidden="true" />
    </NodeViewWrapper>
  )
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sceneDivider: {
      setSceneDivider: (variant?: SceneDividerVariant) => ReturnType
    }
  }
}

export const SceneDivider = Node.create({
  name: "sceneDivider",

  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      variant: {
        default: DEFAULT_SCENE_DIVIDER_VARIANT,
        parseHTML: (element: HTMLElement) =>
          normalizeSceneDividerVariant(
            element.getAttribute("data-divider-variant"),
          ),
        renderHTML: (attributes: { variant?: unknown }) => ({
          "data-divider-variant": normalizeSceneDividerVariant(
            attributes.variant,
          ),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-scene-divider]" }]
  },

  renderHTML({ HTMLAttributes }) {
    const variant = normalizeSceneDividerVariant(
      HTMLAttributes["data-divider-variant"],
    )

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "scene-divider",
        "data-scene-divider": "",
        "data-divider-variant": variant,
        role: "separator",
        "aria-label": "Separador ornamental",
      }),
      [
        "span",
        { class: "scene-divider__line", "aria-hidden": "true" },
      ],
      [
        "span",
        { class: "scene-divider__artwork", "aria-hidden": "true" },
        SCENE_DIVIDER_GLYPHS[variant],
      ],
      [
        "span",
        { class: "scene-divider__line", "aria-hidden": "true" },
      ],
    ]
  },

  addCommands() {
    return {
      setSceneDivider:
        (variant = DEFAULT_SCENE_DIVIDER_VARIANT) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant: normalizeSceneDividerVariant(variant) },
          }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(SceneDividerNodeView)
  },
})
