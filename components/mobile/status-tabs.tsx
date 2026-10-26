"use client"

import { cn } from "@/lib/utils"

type StatusTabsProps<T extends string> = {
  label: string
  items: readonly { id: T; label: string; count: number }[]
  value: T
  onChange: (value: T) => void
}

/** Selector de una columna a la vez, con contador; reemplaza el scroll horizontal de un tablero. */
export function StatusTabs<T extends string>({
  label,
  items,
  value,
  onChange,
}: Readonly<StatusTabsProps<T>>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid shrink-0 gap-1 rounded-lg bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex min-h-11 min-w-0 flex-col items-center justify-center rounded-md px-1 text-xs font-medium leading-tight transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <span className="w-full truncate whitespace-nowrap text-center">
              {item.label}
            </span>
            <span className="text-2xs text-muted-foreground">{item.count}</span>
          </button>
        )
      })}
    </div>
  )
}
