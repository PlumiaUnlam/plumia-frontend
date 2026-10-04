"use client"

import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  getFontFamilyCss,
  TEXT_FONT_FAMILY_GROUPS,
  type TextFontFamily,
} from "./text-font-family"

type TextFontFamilyMenuOptionsProps = {
  value: TextFontFamily
  onValueChange: (value: TextFontFamily) => void
  itemClassName: string
}

const INITIAL_FONT_LIMIT = 16
const FONT_LOAD_STEP = 16

function normalizeSearch(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function TextFontFamilyMenuOptions({
  value,
  onValueChange,
  itemClassName,
}: Readonly<TextFontFamilyMenuOptionsProps>) {
  const [query, setQuery] = useState("")
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_FONT_LIMIT)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filteredGroups = useMemo(() => {
    const search = normalizeSearch(query)

    return TEXT_FONT_FAMILY_GROUPS.map((group) => ({
      label: group.label,
      options: group.options.filter((font) =>
        normalizeSearch(font.label).includes(search),
      ),
    })).filter((group) => group.options.length > 0)
  }, [query])
  const resultCount = filteredGroups.reduce(
    (total, group) => total + group.options.length,
    0,
  )
  const visibleGroups = useMemo(() => {
    return filteredGroups.flatMap((group, index) => {
      const precedingOptions = filteredGroups
        .slice(0, index)
        .reduce((total, precedingGroup) => total + precedingGroup.options.length, 0)
      const options = group.options.slice(
        0,
        Math.max(0, visibleLimit - precedingOptions),
      )
      return options.length > 0 ? [{ ...group, options }] : []
    })
  }, [filteredGroups, visibleLimit])
  const hasResults = visibleGroups.length > 0
  const hasMoreResults = visibleLimit < resultCount

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-[#dadce0] bg-white p-2 dark:border-border dark:bg-popover">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#5f6368] dark:text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value)
              setVisibleLimit(INITIAL_FONT_LIMIT)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key.length === 1) event.stopPropagation()
            }}
            placeholder="Buscar fuente..."
            aria-label="Buscar familia tipográfica"
            className="h-9 rounded-md border-[#dadce0] bg-white pl-9 pr-2 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] dark:border-border dark:bg-input/30 dark:text-foreground dark:focus-visible:ring-ring"
          />
        </div>
      </div>

      {hasResults ? (
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) =>
            onValueChange(nextValue as TextFontFamily)
          }
        >
          <div
            className="max-h-[min(60vh,32rem)] overflow-y-auto p-1"
            onScroll={(event) => {
              if (!hasMoreResults) return
              const target = event.currentTarget
              const distanceToBottom =
                target.scrollHeight - target.scrollTop - target.clientHeight
              if (distanceToBottom < 80) {
                setVisibleLimit((current) => current + FONT_LOAD_STEP)
              }
            }}
          >
            {visibleGroups.map((group, index) => (
              <div key={group.label}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#5f6368]">
                  {group.label}
                </DropdownMenuLabel>
                {group.options.map((font) => (
                  <DropdownMenuRadioItem
                    key={font.value}
                    value={font.value}
                    className={itemClassName}
                    style={{ fontFamily: getFontFamilyCss(font.value) }}
                  >
                    {font.label}
                  </DropdownMenuRadioItem>
                ))}
              </div>
            ))}
            {hasMoreResults ? (
              <p className="px-2 py-3 text-center text-xs text-[#5f6368] dark:text-muted-foreground">
                Desplazate para cargar más fuentes
              </p>
            ) : null}
          </div>
        </DropdownMenuRadioGroup>
      ) : (
        <p className="px-3 py-5 text-center text-sm text-[#5f6368]">
          No se encontraron fuentes.
        </p>
      )}
    </>
  )
}
