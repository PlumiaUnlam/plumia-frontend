"use client"

import { Check, PlusCircle } from "lucide-react"
import { useId } from "react"
import { useEditorState } from "@tiptap/react"
import type { Editor } from "@tiptap/react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { MenubarItem } from "@/components/ui/menubar"
import { Input } from "@/components/ui/input"
import { normalizeSceneDividerColor, getSceneDividerColor, chooseSceneDividerColor } from "./scene-divider"
import {
  BULLET_LIST_COLORS,
  applyBulletListColor,
  applyOrderedListColor,
  getActiveBulletListColor,
  getActiveOrderedListColor,
} from "./list-formatting"
import {
  TEXT_COLORS,
  applyTextColor,
  getActiveTextColor,
} from "./text-formatting"
import {
  applyTextHighlightColor,
  getTextHighlightColor,
} from "./text-extra-formatting"

type ColorPaletteProps = {
  editor: Editor
  kind: "text" | "highlight" | "bullet" | "ordered" | "sceneDivider"
  menuItemClass: string
  menuType?: "dropdown" | "menubar"
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

function getActivePaletteColor(editor: Editor, kind: ColorPaletteProps["kind"]) {
  if (kind === "text") return getActiveTextColor(editor)
  if (kind === "highlight") return getTextHighlightColor(editor)
  if (kind === "bullet") return getActiveBulletListColor(editor)
  if (kind === "sceneDivider") {
    return getSceneDividerColor(editor) ?? "automatic"
  }
  return getActiveOrderedListColor(editor)
}

function getPaletteColors(kind: ColorPaletteProps["kind"]) {
  if (kind === "highlight") {
    return COLOR_GRID.flat().map((value) => ({ value, label: value }))
  }
  return kind === "text" ? TEXT_COLORS : BULLET_LIST_COLORS
}

function getPaletteTitle(kind: ColorPaletteProps["kind"]) {
  switch (kind) {
    case "text":
      return "Color de texto"
    case "highlight":
      return "Color de resaltado"
    case "bullet":
      return "Color de viñeta"
    case "sceneDivider":
      return "Color del separador"
    default:
      return "Color de numeración"
  }
}

function applyPaletteColor(
  editor: Editor,
  kind: ColorPaletteProps["kind"],
  color: string,
) {
  switch (kind) {
    case "text":
      applyTextColor(editor, color)
      break
    case "highlight":
      applyTextHighlightColor(editor, color)
      break
    case "bullet":
      applyBulletListColor(editor, color)
      break
    case "sceneDivider":
      chooseSceneDividerColor(editor, color)
      break
    case "ordered":
      applyOrderedListColor(editor, color)
      break
  }
}

export function ColorPalette({ editor, kind, menuItemClass, menuType = "dropdown" }: Readonly<ColorPaletteProps>) {
  const Item = menuType === "menubar" ? MenubarItem : DropdownMenuItem
  const activeColor = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      getActivePaletteColor(currentEditor, kind),
  })
  const customInputId = useId()
  const colors = getPaletteColors(kind)
  const title = getPaletteTitle(kind)
  const applyColor = (color: string) => applyPaletteColor(editor, kind, color)

  const automaticColor = kind === "sceneDivider" ? { value: "automatic", label: "Color del tema" } : colors[0]
  const customColor = /^#[0-9a-f]{6}$/i.test(activeColor)
    ? activeColor
    : "#1f2937"

  return (
    <div className="p-1">
      {kind !== "highlight" && (
        <Item
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
        </Item>
      )}

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
            menuType={menuType}
            onSelect={() => applyColor(color)}
          />
        ))}
      </div>

      <div className="mt-3 border-t border-[#dadce0] pt-2">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#5f6368]">
          Personalizado
        </div>
        {kind === "sceneDivider" ? (
          <div className="space-y-1.5">
            <label htmlFor={customInputId} className="text-xs text-[#5f6368]">Color hexadecimal</label>
            <Input id={customInputId} key={customColor} defaultValue={customColor} maxLength={7}
              placeholder="#1f2937" className="h-9 py-0 text-sm"
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === "Enter") {
                  event.preventDefault()
                  const color = normalizeSceneDividerColor(event.currentTarget.value)
                  if (color) applyColor(color)
                }
              }}
              onBlur={(event) => {
                const color = normalizeSceneDividerColor(event.currentTarget.value)
                if (color) applyColor(color)
                else event.currentTarget.value = customColor
              }}
            />
          </div>
        ) : <label
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
        </label>}
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
  menuType,
}: Readonly<{
  color: string
  title: string
  activeColor: string
  menuItemClass: string
  onSelect: () => void
  menuType: "dropdown" | "menubar"
}>) {
  const isActive = activeColor.toLowerCase() === color.toLowerCase()
  const Item = menuType === "menubar" ? MenubarItem : DropdownMenuItem

  return (
    <Item
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
    </Item>
  )
}
