"use client"

import { Check, PlusCircle } from "lucide-react"
import { useId } from "react"
import { useEditorState } from "@tiptap/react"
import type { Editor } from "@tiptap/react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  BULLET_LIST_COLORS,
  applyBulletListColor,
  applyOrderedListColor,
  getActiveBulletListColor,
  getActiveOrderedListColor,
  type BulletListColor,
} from "./list-formatting"
import {
  TEXT_COLORS,
  applyTextColor,
  getActiveTextColor,
  type TextColor,
} from "./text-formatting"

type ColorPaletteProps = {
  editor: Editor
  kind: "text" | "bullet" | "ordered"
  menuItemClass: string
}

const COLOR_GRID = [
  ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff"],
  ["#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff"],
  ["#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"],
  ["#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
  ["#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0"],
  ["#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79"],
  ["#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47"],
  ["#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130"],
] as const

export function ColorPalette({ editor, kind, menuItemClass }: ColorPaletteProps) {
  const activeColor = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (kind === "text") return getActiveTextColor(currentEditor)
      if (kind === "bullet") return getActiveBulletListColor(currentEditor)
      return getActiveOrderedListColor(currentEditor)
    },
  })
  const customInputId = useId()
  const colors = kind === "text" ? TEXT_COLORS : BULLET_LIST_COLORS
  const title =
    kind === "text"
      ? "Color de texto"
      : kind === "bullet"
        ? "Color de viñeta"
        : "Color de numeración"

  const applyColor = (color: string) => {
    if (kind === "text") {
      applyTextColor(editor, color as TextColor)
    } else if (kind === "bullet") {
      applyBulletListColor(editor, color as BulletListColor)
    } else {
      applyOrderedListColor(editor, color as BulletListColor)
    }
  }

  const automaticColor = colors[0]
  const customColor = /^#[0-9a-f]{6}$/i.test(activeColor)
    ? activeColor
    : "#1f2937"

  return (
    <div className="p-1">
      <DropdownMenuItem
        className={`mb-2 w-full gap-2 rounded-md border px-2 py-1.5 text-xs ${menuItemClass} ${activeColor === automaticColor.value ? "border-[#1a73e8] bg-[#e8f0fe] text-[#174ea6]" : "border-transparent"}`}
        onSelect={() => applyColor(automaticColor.value)}
        title={`${title}: ${automaticColor.label}`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#dadce0] bg-[#f8fafd] text-[11px] font-semibold text-[#5f6368]">
          A
        </span>
        <span>{automaticColor.label}</span>
        {activeColor === automaticColor.value && (
          <Check className="ml-auto h-3.5 w-3.5" />
        )}
      </DropdownMenuItem>

      <div
        className="grid grid-cols-10 gap-1 max-[360px]:grid-cols-8"
        role="group"
        aria-label={title}
      >
        {COLOR_GRID.flat().map((color) => (
          <ColorItem
            key={color}
            color={color}
            title={title}
            activeColor={activeColor}
            menuItemClass={menuItemClass}
            onSelect={() => applyColor(color)}
          />
        ))}
      </div>

      <div className="mt-3 border-t border-[#dadce0] pt-2">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#5f6368]">
          Personalizado
        </div>
        <label
          htmlFor={customInputId}
          className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-transparent px-1.5 text-xs text-[#3c4043] hover:bg-[#f1f3f4]"
          title="Elegir color personalizado"
        >
          <span className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-[#dadce0] bg-white">
            <span
              className="absolute inset-1 rounded-full"
              style={{ backgroundColor: customColor }}
            />
            <PlusCircle className="relative z-10 h-4 w-4 text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]" />
          </span>
          <span>Elegir color</span>
          <input
            id={customInputId}
            type="color"
            value={customColor}
            className="sr-only"
            onChange={(event) => applyColor(event.currentTarget.value)}
          />
        </label>
      </div>
    </div>
  )
}

function ColorItem({
  color,
  title,
  activeColor,
  menuItemClass,
  onSelect,
}: {
  color: string
  title: string
  activeColor: string
  menuItemClass: string
  onSelect: () => void
}) {
  const isActive = activeColor.toLowerCase() === color.toLowerCase()

  return (
    <DropdownMenuItem
      className={`relative h-7 w-7 rounded-full border border-[#dadce0] p-0 outline-none focus:bg-[#e8f0fe] focus:ring-2 focus:ring-[#1a73e8] ${menuItemClass}`}
      onSelect={onSelect}
      title={`${title}: ${color}`}
      aria-label={`${title}: ${color}`}
    >
      <span
        className="pointer-events-none absolute inset-0.5 rounded-full border border-black/10"
        style={{ backgroundColor: color }}
      />
      {isActive && (
        <Check className="relative z-10 mx-auto h-3.5 w-3.5 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
      )}
    </DropdownMenuItem>
  )
}
