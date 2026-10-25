"use client"

import { useEffect, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import { ListRestart, ListStart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FormDialog } from "@/components/modal/form-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  continueOrderedList,
  getOrderedListStart,
  setOrderedListStart,
} from "./list-formatting"
import { ListStyleGrid } from "./list-style-grid"
import { ColorPalette } from "./color-palette"

const menuClass =
  "border-border bg-popover text-foreground shadow-[0_3px_8px_rgba(60,64,67,0.24)] dark:text-popover-foreground"
const itemClass = "gap-3 text-foreground focus:bg-muted focus:text-foreground dark:focus:bg-accent dark:focus:text-accent-foreground"

function applyStartNumber(
  editor: Editor,
  value: string,
  onApplied: () => void,
) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return

  setOrderedListStart(editor, parsed)
  onApplied()
}

type MarkerPosition = {
  x: number
  y: number
}

type ListNumberingMenuProps = {
  editor: Editor
}

type ListNumberingActionsButtonProps = {
  editor: Editor
}

type StartNumberDialogProps = {
  open: boolean
  inputId: string
  value: string
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onApply: () => void
}

type OrderedListActionsProps = {
  editor: Editor
  itemClassName: string
  onOpenStartDialog: () => void
  includeColorPalette?: boolean
}

function OrderedListActions({
  editor,
  itemClassName,
  onOpenStartDialog,
  includeColorPalette = false,
}: Readonly<OrderedListActionsProps>) {
  return (
    <>
      <DropdownMenuLabel>Opciones de numeración</DropdownMenuLabel>
      <DropdownMenuItem
        className={itemClassName}
        onSelect={() => continueOrderedList(editor)}
      >
        <ListRestart className="h-4 w-4" />
        <span>Continuar numeración</span>
      </DropdownMenuItem>
      <DropdownMenuItem className={itemClassName} onSelect={onOpenStartDialog}>
        <ListStart className="h-4 w-4" />
        <span>Comenzar desde…</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={itemClassName}
        onSelect={() => setOrderedListStart(editor, 1)}
      >
        <span className="ml-7">Reiniciar en 1</span>
      </DropdownMenuItem>
      {includeColorPalette && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Color de numeración</DropdownMenuLabel>
          <ColorPalette
            editor={editor}
            kind="ordered"
            menuItemClass={itemClassName}
          />
        </>
      )}
    </>
  )
}

function StartNumberDialog({
  open,
  inputId,
  value,
  onOpenChange,
  onValueChange,
  onApply,
}: Readonly<StartNumberDialogProps>) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Comenzar numeración desde"
      description="Elegí el número inicial para la lista actual."
      size="sm"
      submitLabel="Aplicar"
      onSubmit={onApply}
    >
      <div className="grid gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          Número inicial
        </Label>
        <Input
          id={inputId}
          type="number"
          min="1"
          step="1"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          autoFocus
        />
      </div>
    </FormDialog>
  )
}

/** Toolbar access for the same actions available from an ordered-list marker. */
export function ListNumberingActionsButton({
  editor,
}: Readonly<ListNumberingActionsButtonProps>) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [startValue, setStartValue] = useState("1")
  const orderedListActive = editor.isActive("orderedList")

  const openStartDialog = () => {
    setStartValue(String(getOrderedListStart(editor)))
    setStartDialogOpen(true)
    setMenuOpen(false)
  }

  const applyStartValue = () =>
    applyStartNumber(editor, startValue, () => setStartDialogOpen(false))

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="h-7 w-7 rounded-md p-1 text-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
            disabled={!orderedListActive}
            title="Opciones de numeración"
            aria-label="Opciones de numeración"
            onMouseDown={(event) => event.preventDefault()}
          >
            <ListRestart className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-64 ${menuClass}`}>
          <OrderedListActions
            editor={editor}
            itemClassName={itemClass}
            onOpenStartDialog={openStartDialog}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <StartNumberDialog
        open={startDialogOpen}
        inputId="ordered-list-start-toolbar"
        value={startValue}
        onOpenChange={setStartDialogOpen}
        onValueChange={setStartValue}
        onApply={applyStartValue}
      />
    </>
  )
}

type MarkerHit = {
  listItem: HTMLElement
  list: HTMLOListElement | HTMLUListElement
  paragraph: HTMLElement
}

function getMarkerHit(
  editor: Editor,
  listItem: Element,
  event: MouseEvent,
): MarkerHit | null {
  if (!(listItem instanceof HTMLElement)) return null
  if (!editor.view.dom.contains(listItem)) return null

  const list = listItem.parentElement
  if (!(list instanceof HTMLOListElement || list instanceof HTMLUListElement)) {
    return null
  }

  const paragraph = Array.from(listItem.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName === "P",
  )
  if (!paragraph) return null

  const paragraphRect = paragraph.getBoundingClientRect()
  const listItemRect = listItem.getBoundingClientRect()
  const editorRect = editor.view.dom.getBoundingClientRect()
  const computedList = window.getComputedStyle(list)
  const paddingLeft = Number.parseFloat(computedList.paddingLeft) || 28
  const markerLeft = Math.max(
    editorRect.left,
    paragraphRect.left - Math.max(20, paddingLeft),
  )
  const markerRight = paragraphRect.left - 2
  const isMarkerArea =
    event.clientX >= markerLeft &&
    event.clientX <= markerRight &&
    event.clientY >= listItemRect.top &&
    event.clientY <= listItemRect.bottom

  return isMarkerArea ? { listItem, list, paragraph } : null
}

function findMarkerHit(editor: Editor, event: MouseEvent): MarkerHit | null {
  const target = event.target
  const targetElement = target instanceof Element ? target : null
  const pointElement = document.elementFromPoint(event.clientX, event.clientY)
  const candidates: Element[] = []

  const addCandidate = (element: Element | null) => {
    if (element && !candidates.includes(element)) candidates.push(element)
  }

  addCandidate(targetElement?.closest("li") ?? null)
  addCandidate(pointElement?.closest("li") ?? null)

  for (const listItem of editor.view.dom.querySelectorAll("li")) {
    addCandidate(listItem)
  }

  for (const candidate of candidates) {
    const hit = getMarkerHit(editor, candidate, event)
    if (hit) return hit
  }

  return null
}

/** Context menu opened from the marker area of any list item. */
export function ListNumberingMenu({ editor }: Readonly<ListNumberingMenuProps>) {
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [markerKind, setMarkerKind] = useState<"bullet" | "ordered">("ordered")
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [startValue, setStartValue] = useState("1")
  const selectedListItemRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const handleMarkerPointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return

      const hit = findMarkerHit(editor, event)
      if (!hit) return

      event.preventDefault()
      event.stopPropagation()

      const textPosition = editor.view.posAtDOM(hit.paragraph, 0) + 1
      const textEnd = textPosition + hit.paragraph.textContent.length

      selectedListItemRef.current?.classList.remove("list-marker-selected")
      hit.listItem.classList.add("list-marker-selected")
      selectedListItemRef.current = hit.listItem

      editor.commands.setTextSelection({
        from: textPosition,
        to: Math.max(textPosition, textEnd),
      })
      setMarkerKind(hit.list.tagName === "UL" ? "bullet" : "ordered")
      setMarkerPosition({
        x: Math.max(8, Math.min(event.clientX, window.innerWidth - 300)),
        y: Math.max(8, Math.min(event.clientY, window.innerHeight - 220)),
      })
      setMenuOpen(true)
    }

    const dom = editor.view.dom
    dom.addEventListener("mousedown", handleMarkerPointerDown)

    return () => {
      dom.removeEventListener("mousedown", handleMarkerPointerDown)
      selectedListItemRef.current?.classList.remove("list-marker-selected")
    }
  }, [editor])

  const closeMenu = () => {
    setMenuOpen(false)
    selectedListItemRef.current?.classList.remove("list-marker-selected")
    selectedListItemRef.current = null
  }

  const openStartDialog = () => {
    setStartValue(String(getOrderedListStart(editor)))
    setStartDialogOpen(true)
    closeMenu()
  }

  const applyStartValue = () =>
    applyStartNumber(editor, startValue, () => setStartDialogOpen(false))

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open)
          if (!open) {
            selectedListItemRef.current?.classList.remove("list-marker-selected")
            selectedListItemRef.current = null
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed z-40 h-1 w-1 opacity-0"
            style={
              markerPosition
                ? { left: markerPosition.x, top: markerPosition.y }
                : { left: 0, top: 0 }
            }
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={`w-[min(34rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[min(75vh,38rem)] overflow-x-hidden overflow-y-auto p-2 ${menuClass}`}
        >
          {markerKind === "bullet" ? (
            <>
              <DropdownMenuLabel>Viñeta seleccionada</DropdownMenuLabel>
              <ListStyleGrid
                editor={editor}
                kind="bullet"
                menuItemClass={itemClass}
              />
            </>
          ) : (
            <OrderedListActions
              editor={editor}
              itemClassName={itemClass}
              onOpenStartDialog={openStartDialog}
              includeColorPalette
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <StartNumberDialog
        open={startDialogOpen}
        inputId="ordered-list-start"
        value={startValue}
        onOpenChange={setStartDialogOpen}
        onValueChange={setStartValue}
        onApply={applyStartValue}
      />
    </>
  )
}
