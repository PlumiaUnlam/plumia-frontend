"use client"

import type { Editor } from "@tiptap/react"
import { Check } from "lucide-react"
import {
  BULLET_LIST_STYLES,
  ORDERED_LIST_STYLES,
  ORDERED_LIST_PRESETS,
  applyBulletListStyle,
  applyOrderedListPreset,
  applyOrderedListStyle,
  getActiveBulletListStyle,
  getActiveOrderedListPreset,
  getActiveOrderedListStyle,
  type BulletListStyle,
  type OrderedListPreset,
  type OrderedListStyle,
} from "./list-formatting"
import { ColorPalette } from "./color-palette"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

type ListStyleGridProps = {
  editor: Editor
  kind: "bullet" | "ordered"
  menuItemClass: string
}

export function ListStyleGrid({
  editor,
  kind,
  menuItemClass,
}: Readonly<ListStyleGridProps>) {
  const isBullet = kind === "bullet"
  const activeStyle = isBullet
    ? getActiveBulletListStyle(editor)
    : getActiveOrderedListStyle(editor)

  return (
    <div className="grid grid-cols-2 gap-2 p-1 sm:grid-cols-3">
      {isBullet
        ? BULLET_LIST_STYLES.map((style) => (
            <BulletStyleItem
              key={style.value}
              editor={editor}
              style={style.value}
              label={style.label}
              marker={style.marker}
              activeStyle={activeStyle as BulletListStyle}
              menuItemClass={menuItemClass}
            />
          ))
        : ORDERED_LIST_STYLES.map((style) => (
            <OrderedStyleItem
              key={style.value}
              editor={editor}
              style={style.value}
              label={style.label}
              preview={style.preview}
              activeStyle={activeStyle as OrderedListStyle}
              menuItemClass={menuItemClass}
            />
          ))}
      {isBullet && (
        <>
          <div className="col-span-full mt-1 border-t border-[#dadce0] px-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#5f6368]">
            Color de viñeta
          </div>
          <div className="col-span-full">
            <ColorPalette
              editor={editor}
              kind="bullet"
              menuItemClass={menuItemClass}
            />
          </div>
        </>
      )}
      {!isBullet && (
        <>
          <div className="col-span-full mt-1 border-t border-[#dadce0] px-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#5f6368]">
            Lista multinivel
          </div>
          {ORDERED_LIST_PRESETS.map((preset) => (
            <OrderedPresetItem
              key={preset.value}
              editor={editor}
              preset={preset.value}
              label={preset.label}
              preview={preset.preview}
              activePreset={getActiveOrderedListPreset(editor)}
              menuItemClass={menuItemClass}
            />
          ))}
          <div className="col-span-full mt-1 border-t border-[#dadce0] px-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#5f6368]">
            Color de numeración
          </div>
          <div className="col-span-full">
            <ColorPalette
              editor={editor}
              kind="ordered"
              menuItemClass={menuItemClass}
            />
          </div>
        </>
      )}
    </div>
  )
}

function BulletStyleItem({
  editor,
  style,
  label,
  marker,
  activeStyle,
  menuItemClass,
}: Readonly<{
  editor: Editor
  style: BulletListStyle
  label: string
  marker: string
  activeStyle: BulletListStyle
  menuItemClass: string
}>) {
  return (
    <DropdownMenuItem
      className={`relative flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border p-2 text-xs ${menuItemClass} ${activeStyle === style ? "border-[#1a73e8] bg-[#e8f0fe] text-[#174ea6]" : "border-transparent"}`}
      onSelect={() => applyBulletListStyle(editor, style)}
      title={label}
      aria-label={label}
    >
      <span className="pointer-events-none flex w-full flex-col gap-1.5">
        {[0, 1].map((line) => (
          <span key={line} className="flex items-center gap-2">
            <span className="w-3 shrink-0 text-center text-sm leading-none">
              {marker}
            </span>
            <span className="h-px min-w-0 flex-1 bg-[#9aa0a6]/70" />
          </span>
        ))}
      </span>
      <span className="pointer-events-none max-w-full truncate text-[10px] text-[#5f6368]">
        {label}
      </span>
      {activeStyle === style && <Check className="absolute right-1 top-1 h-3 w-3" />}
    </DropdownMenuItem>
  )
}

function OrderedStyleItem({
  editor,
  style,
  label,
  preview,
  activeStyle,
  menuItemClass,
}: Readonly<{
  editor: Editor
  style: OrderedListStyle
  label: string
  preview: readonly string[]
  activeStyle: OrderedListStyle
  menuItemClass: string
}>) {
  return (
    <DropdownMenuItem
      className={`relative flex min-h-20 min-w-0 flex-col justify-center gap-1 rounded-lg border px-2.5 py-2 text-xs ${menuItemClass} ${activeStyle === style ? "border-[#1a73e8] bg-[#e8f0fe] text-[#174ea6]" : "border-transparent"}`}
      onSelect={() => applyOrderedListStyle(editor, style)}
      title={label}
      aria-label={label}
    >
      {preview.map((item) => (
        <span key={item} className="pointer-events-none flex min-w-0 items-center gap-1 text-[10px] leading-tight">
          <span className="shrink-0">{item}</span>
          <span className="h-px min-w-0 flex-1 bg-[#9aa0a6]/70" />
        </span>
      ))}
      {activeStyle === style && <Check className="absolute right-1 top-1 h-3 w-3" />}
    </DropdownMenuItem>
  )
}

function OrderedPresetItem({
  editor,
  preset,
  label,
  preview,
  activePreset,
  menuItemClass,
}: Readonly<{
  editor: Editor
  preset: OrderedListPreset
  label: string
  preview: readonly string[]
  activePreset: OrderedListPreset | "plain"
  menuItemClass: string
}>) {
  return (
    <DropdownMenuItem
      className={`relative flex min-h-24 min-w-0 flex-col justify-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-xs ${menuItemClass} ${activePreset === preset ? "border-[#1a73e8] bg-[#e8f0fe] text-[#174ea6]" : "border-transparent"}`}
      onSelect={() => applyOrderedListPreset(editor, preset)}
      title={label}
      aria-label={label}
    >
      {preview.map((item) => (
        <span key={item} className="pointer-events-none flex min-w-0 items-center gap-1 text-[10px] leading-tight">
          <span className="min-w-0 truncate">{item}</span>
          <span className="h-px min-w-3 flex-1 bg-[#9aa0a6]/70" />
        </span>
      ))}
      {activePreset === preset && (
        <Check className="absolute right-2 top-2 h-3 w-3" />
      )}
    </DropdownMenuItem>
  )
}
