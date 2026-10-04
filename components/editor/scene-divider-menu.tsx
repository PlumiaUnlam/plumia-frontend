"use client"

import { useEditorState, type Editor } from "@tiptap/react"
import { Palette, Plus, Paintbrush } from "lucide-react"
import * as Dropdown from "@/components/ui/dropdown-menu"
import * as Menubar from "@/components/ui/menubar"
import { ColorPalette } from "./color-palette"
import { SCENE_DIVIDER_OPTIONS, SceneDividerPreview, getSceneDividerColor, type SceneDividerVariant } from "./scene-divider"

const itemClass = "min-h-9 gap-2 text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124] dark:text-foreground dark:focus:bg-accent dark:focus:text-accent-foreground"
const contentClass = "w-64 max-w-[calc(100vw-1rem)] max-h-[min(70dvh,30rem)] overflow-y-auto border-[#dadce0] bg-white text-[#3c4043] dark:border-border dark:bg-popover dark:text-popover-foreground"

export function SceneDividerMenuOptions({ editor, onInsert, menuType = "dropdown" }: Readonly<{
  editor: Editor
  onInsert: (variant: SceneDividerVariant) => void
  menuType?: "dropdown" | "menubar"
}>) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    selected: current.isActive("sceneDivider"),
    color: getSceneDividerColor(current),
  }) })
  const isMenubar = menuType === "menubar"
  const Sub = isMenubar ? Menubar.MenubarSub : Dropdown.DropdownMenuSub
  const Trigger = isMenubar ? Menubar.MenubarSubTrigger : Dropdown.DropdownMenuSubTrigger
  const Content = isMenubar ? Menubar.MenubarSubContent : Dropdown.DropdownMenuSubContent
  const Portal = isMenubar ? Menubar.MenubarPortal : Dropdown.DropdownMenuPortal
  const Item = isMenubar ? Menubar.MenubarItem : Dropdown.DropdownMenuItem
  const Label = isMenubar ? Menubar.MenubarLabel : Dropdown.DropdownMenuLabel
  const Separator = isMenubar ? Menubar.MenubarSeparator : Dropdown.DropdownMenuSeparator

  return (
    <>
      <Label>Separadores de escena</Label>
      {SCENE_DIVIDER_OPTIONS.map((option) => (
        <Sub key={option.value}>
          <Trigger className={`${itemClass} min-h-10`}>
            <SceneDividerPreview variant={option.value} color={state.color} className="!w-20 shrink-0 [&_.scene-divider__artwork]:!w-12" />
            <span className="min-w-0 flex-1">{option.label}</span>
          </Trigger>
          <Portal>
            <Content className={contentClass}>
              <Label>{option.label}</Label>
              <div className="px-4 py-3"><SceneDividerPreview variant={option.value} color={state.color} /></div>
              <Item className={itemClass} onSelect={() => onInsert(option.value)}><Plus className="size-4" /> Insertar separador</Item>
              <Item className={itemClass} disabled={!state.selected} onSelect={() => editor.chain().focus().updateAttributes("sceneDivider", { variant: option.value }).run()}>
                <Paintbrush className="size-4" /> Aplicar al seleccionado
              </Item>
            </Content>
          </Portal>
        </Sub>
      ))}
      <Separator />
      <Sub>
        <Trigger className={itemClass}><Palette className="size-4" /> Color del separador</Trigger>
        <Portal><Content className="w-[min(22rem,calc(100vw-1rem))] border-[#dadce0] bg-white p-2 dark:border-border dark:bg-popover">
          <Label>{state.selected ? "Color del separador seleccionado" : "Color del próximo separador"}</Label>
          <ColorPalette editor={editor} kind="sceneDivider" menuItemClass={itemClass} menuType={menuType} />
        </Content></Portal>
      </Sub>
      {!state.selected && <p className="px-2 py-2 text-xs leading-5 text-[#5f6368] dark:text-muted-foreground">El color elegido se aplica al próximo separador. Seleccioná uno del documento para editarlo.</p>}
    </>
  )
}
