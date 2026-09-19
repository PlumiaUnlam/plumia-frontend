"use client"

import { Check } from "lucide-react"
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

export function ColorPalette({ editor, kind, menuItemClass }: ColorPaletteProps) {
  const activeColor = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (kind === "text") return getActiveTextColor(currentEditor)
      if (kind === "bullet") return getActiveBulletListColor(currentEditor)
      return getActiveOrderedListColor(currentEditor)
    },
  })

  const colors = kind === "text" ? TEXT_COLORS : BULLET_LIST_COLORS
  const title =
    kind === "text"
      ? "Color de texto"
      : kind === "bullet"
        ? "Color de viñeta"
        : "Color de numeración"

  return (
    <div className="grid grid-cols-2 gap-1.5 p-1 sm:grid-cols-4">
      {colors.map((color) => (
        <ColorItem
          key={color.value}
          editor={editor}
          kind={kind}
          color={color.value}
          label={color.label}
          title={title}
          activeColor={activeColor}
          menuItemClass={menuItemClass}
        />
      ))}
    </div>
  )
}

function ColorItem({
  editor,
  kind,
  color,
  label,
  title,
  activeColor,
  menuItemClass,
}: {
  editor: Editor
  kind: ColorPaletteProps["kind"]
  color: TextColor | BulletListColor
  label: string
  title: string
  activeColor: string
  menuItemClass: string
}) {
  const applyColor = () => {
    if (kind === "text") {
      applyTextColor(editor, color as TextColor)
    } else if (kind === "bullet") {
      applyBulletListColor(editor, color as BulletListColor)
    } else {
      applyOrderedListColor(editor, color as BulletListColor)
    }
  }

  const swatchColor = color === "inherit" || color === "currentColor"
    ? "#3c4043"
    : color

  return (
    <DropdownMenuItem
      className={`relative min-w-0 gap-2 rounded-md border px-2 py-2 text-[10px] ${menuItemClass} ${activeColor === color ? "border-[#1a73e8] bg-[#e8f0fe] text-[#174ea6]" : "border-transparent"}`}
      onSelect={applyColor}
      title={`${title}: ${label}`}
      aria-label={`${title}: ${label}`}
    >
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#dadce0]"
        style={{ backgroundColor: swatchColor }}
      />
      <span className="min-w-0 truncate">{label}</span>
      {activeColor === color && <Check className="ml-auto h-3 w-3 shrink-0" />}
    </DropdownMenuItem>
  )
}
