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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const visibleGroups = useMemo(() => {
    const search = normalizeSearch(query)

    return TEXT_FONT_FAMILY_GROUPS.map((group) => ({
      label: group.label,
      options: group.options.filter((font) =>
        normalizeSearch(font.label).includes(search),
      ),
    })).filter((group) => group.options.length > 0)
  }, [query])
  const hasResults = visibleGroups.length > 0

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-[#dadce0] bg-white p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#5f6368]" />
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key.length === 1) event.stopPropagation()
            }}
            placeholder="Buscar fuente..."
            aria-label="Buscar familia tipográfica"
            className="h-9 rounded-md border-[#dadce0] bg-white pl-9 pr-2 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]"
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
          <div className="max-h-[min(60vh,32rem)] overflow-y-auto p-1">
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
