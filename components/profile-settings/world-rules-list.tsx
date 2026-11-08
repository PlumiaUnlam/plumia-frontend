"use client"

import { CircleAlert, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type WorldRulesListProps = {
  rules: string[]
  filteredRules: string[]
  search: string
  onSearchChange: (value: string) => void
  onRemove: (ruleIndex: number) => void
  disabled?: boolean
}

function emptyMessage(totalRules: number) {
  return totalRules === 0
    ? "Todavía no hay reglas configuradas para este proyecto."
    : "No se encontraron reglas con esa búsqueda."
}

/** Buscador y lista de las reglas del mundo de un proyecto. */
export function WorldRulesList({
  rules,
  filteredRules,
  search,
  onSearchChange,
  onRemove,
  disabled = false,
}: Readonly<WorldRulesListProps>) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Reglas configuradas</p>
          <span className="text-xs text-muted-foreground">
            {rules.length} {rules.length === 1 ? "regla" : "reglas"}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar una regla..."
            aria-label="Buscar reglas del mundo"
            className="pl-9"
          />
        </div>
      </div>

      {filteredRules.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredRules.map((rule) => {
            const ruleIndex = rules.indexOf(rule)
            return (
              <div
                key={`${rule}-${ruleIndex}`}
                className="group flex min-h-28 items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CircleAlert className="size-4" />
                </div>
                <p className="min-w-0 flex-1 text-sm leading-6">{rule}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
                  onClick={() => onRemove(ruleIndex)}
                  disabled={disabled}
                  aria-label="Eliminar regla del mundo"
                >
                  <X />
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage(rules.length)}
        </div>
      )}
    </>
  )
}
