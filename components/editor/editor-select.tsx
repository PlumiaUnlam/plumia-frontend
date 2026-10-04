"use client"

import { Children, isValidElement, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type OptionProps = { value: string | number; children: ReactNode }
type GroupProps = { label: string; children: ReactNode }

export function EditorSelectOption({ value, children }: Readonly<OptionProps>) {
  return <DropdownMenuRadioItem value={String(value)} className="min-h-9 text-[#3c4043] focus:bg-[#f1f3f4] dark:text-foreground dark:focus:bg-accent">{children}</DropdownMenuRadioItem>
}

export function EditorSelectGroup({ label, children }: Readonly<GroupProps>) {
  return <><DropdownMenuLabel className="text-xs text-[#5f6368] dark:text-muted-foreground">{label}</DropdownMenuLabel>{children}</>
}

function selectedLabel(children: ReactNode, value: string): ReactNode {
  for (const child of Children.toArray(children)) {
    if (!isValidElement<OptionProps | GroupProps>(child)) continue
    if (child.type === EditorSelectOption && "value" in child.props && String(child.props.value) === value) return child.props.children
    if (child.type === EditorSelectGroup) {
      const label = selectedLabel(child.props.children, value)
      if (label !== undefined) return label
    }
  }
  return undefined
}

export function EditorSelect({ id, value, onValueChange, disabled, className, children }: Readonly<{
  id: string
  value: string | number
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  children: ReactNode
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button id={id} type="button" variant="outline" disabled={disabled}
          className={cn("h-9 w-full min-w-0 justify-between gap-2 rounded-md border-[#dadce0] bg-white px-3 py-0 text-left text-sm font-normal text-[#3c4043] shadow-none dark:border-border dark:bg-input/30 dark:text-foreground", className)}>
          <span className="min-w-0 truncate">{selectedLabel(children, String(value))}</span>
          <ChevronDown className="size-4 shrink-0 text-[#5f6368] dark:text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(50dvh,24rem)] w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] overflow-y-auto border-[#dadce0] bg-white text-[#3c4043] dark:border-border dark:bg-popover dark:text-popover-foreground">
        <DropdownMenuRadioGroup value={String(value)} onValueChange={onValueChange}>{children}</DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
