"use client"

import { NodeSelection } from "@tiptap/pm/state"
import { useCallback, useMemo, useRef } from "react"
import { useEditorState } from "@tiptap/react"
import type { Editor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { AlignCenter, AlignLeft, AlignRight, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  IMAGE_TEXT_FLOW_OPTIONS,
  normalizeImageTextFlow,
  type ImageTextFlow,
} from "./image-text-flow"

const TEXT_FLOW_ICONS: Record<ImageTextFlow, typeof AlignCenter> = {
  break: AlignCenter,
  "text-right": AlignLeft,
  "text-left": AlignRight,
}

type ImageTextFlowMenuProps = {
  editor: Editor
}

export function ImageTextFlowMenu({ editor }: Readonly<ImageTextFlowMenuProps>) {
  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  const imageSelection = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const { selection } = currentEditor.state
      if (
        !(selection instanceof NodeSelection) ||
        selection.node.type.name !== "image"
      ) {
        return null
      }

      return {
        position: selection.from,
        textFlow: normalizeImageTextFlow(selection.node.attrs.textFlow),
      }
    },
  })
  const scrollTarget =
    editor.view.dom.closest<HTMLElement>("[data-editor-scroll-container]") ??
    undefined
  const appendToBody = useCallback(() => document.body, [])
  const keepMenuHidden = useCallback(() => {
    const menu = bubbleMenuRef.current
    if (!menu) return

    menu.style.visibility = "hidden"
    menu.style.pointerEvents = "none"
  }, [])
  const revealPositionedMenu = useCallback(() => {
    const menu = bubbleMenuRef.current
    if (!menu) return

    menu.style.visibility = "visible"
    menu.style.pointerEvents = "auto"
  }, [])
  const shouldShow = useCallback(
    ({ state }: { state: Editor["state"] }) => {
      const { selection } = state
      return (
        editor.isEditable &&
        selection instanceof NodeSelection &&
        selection.node.type.name === "image"
      )
    },
    [editor],
  )
  const bubbleMenuOptions = useMemo(
    () => ({
      strategy: "fixed" as const,
      placement: "bottom" as const,
      offset: 8,
      scrollTarget,
      onShow: keepMenuHidden,
      onHide: keepMenuHidden,
      onUpdate: revealPositionedMenu,
    }),
    [keepMenuHidden, revealPositionedMenu, scrollTarget],
  )

  const updateTextFlow = (value: string) => {
    if (!imageSelection) return

    editor.commands.setImageTextFlow(
      imageSelection.position,
      normalizeImageTextFlow(value),
    )
  }

  const textFlowLabel =
    IMAGE_TEXT_FLOW_OPTIONS.find(
      (option) => option.value === imageSelection?.textFlow,
    )?.shortLabel ?? "Ajuste de imagen"
  const textFlow = imageSelection?.textFlow ?? "break"
  const TextFlowIcon = TEXT_FLOW_ICONS[textFlow]

  return (
    <BubbleMenu
      ref={bubbleMenuRef}
      editor={editor}
      appendTo={appendToBody}
      className="z-50"
      shouldShow={shouldShow}
      options={bubbleMenuOptions}
    >
      {imageSelection && editor.isEditable && (
        <div className="rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 max-w-full gap-1.5 border-[#dadce0] bg-white px-2 text-xs text-[#3c4043] shadow-sm dark:border-border dark:bg-background dark:text-foreground"
                title="Ajuste de imagen"
                aria-label={`Ajuste de imagen: ${textFlowLabel}`}
              >
                <TextFlowIcon className="size-4 shrink-0" />
                <span className="truncate">{textFlowLabel}</span>
                <ChevronDown className="size-3 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="w-64 border-[#dadce0] bg-white text-[#3c4043] dark:border-border dark:bg-popover dark:text-popover-foreground"
            >
              <DropdownMenuRadioGroup
                value={imageSelection.textFlow}
                onValueChange={updateTextFlow}
              >
                {IMAGE_TEXT_FLOW_OPTIONS.map((option) => {
                  const OptionIcon = TEXT_FLOW_ICONS[option.value]
                  return (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="min-h-10 gap-2"
                    >
                      <OptionIcon className="size-4" />
                      {option.label}
                    </DropdownMenuRadioItem>
                  )
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </BubbleMenu>
  )
}
