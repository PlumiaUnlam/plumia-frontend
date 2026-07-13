"use client"

import { useRef, useState } from "react"
import { Plus } from "lucide-react"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile"
import type { Entity } from "@/types/entity"
import { TYPE_TO_CATEGORY } from "@/types/entity"

type EntitySelectorProps = {
  entities: Entity[]
  selectedEntityIds: string[]
  onChange: (entityIds: string[]) => void
  onCreateEntity?: (canonicalName: string) => void
}

export function EntitySelector({
  entities,
  selectedEntityIds,
  onChange,
  onCreateEntity,
}: EntitySelectorProps) {
  const portalContainerRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useComboboxAnchor()
  const [searchValue, setSearchValue] = useState("")
  const selectedEntities = selectedEntityIds
    .map((entityId) => entities.find((entity) => entity.id === entityId))
    .filter((entity): entity is Entity => !!entity)
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase()
  const canCreateEntity =
    !!onCreateEntity && normalizedSearchValue.length > 0

  return (
    <Field>
      <FieldLabel>Entidades relacionadas</FieldLabel>
      <FieldContent>
        <div ref={portalContainerRef} />
        <Combobox<Entity, true>
          items={entities}
          multiple
          value={selectedEntities}
          onValueChange={(nextEntities) => {
            onChange(nextEntities.map((entity) => entity.id))
          }}
          itemToStringValue={(entity) => entity.canonicalName}
          itemToStringLabel={(entity) =>
            `${entity.canonicalName} ${TYPE_TO_CATEGORY[entity.type]}`
          }
          isItemEqualToValue={(entity, value) => entity.id === value.id}
        >
          <ComboboxChips
            ref={anchorRef}
            className="min-h-10 w-full border-border bg-background px-3.5 py-2 text-base md:text-sm dark:bg-input/30"
          >
            <ComboboxValue>
              {(value: Entity[]) => (
                <>
                  {value.map((entity) => (
                    <ComboboxChip
                      key={entity.id}
                      aria-label={entity.canonicalName}
                      className="rounded-md border border-primary/20 bg-primary/10 pr-1 text-primary [&_[data-slot=combobox-chip-remove]]:size-4 [&_[data-slot=combobox-chip-remove]]:rounded-sm [&_[data-slot=combobox-chip-remove]]:text-primary/70 [&_[data-slot=combobox-chip-remove]]:hover:bg-primary/10 [&_[data-slot=combobox-chip-remove]]:hover:text-primary [&_[data-slot=combobox-chip-remove]_svg]:size-3"
                    >
                      {entity.canonicalName}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    className="placeholder:text-muted-foreground"
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={
                      value.length > 0 ? "" : "Buscar y seleccionar entidades..."
                    }
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>

          <ComboboxContent
            anchor={anchorRef}
            side="bottom"
            align="start"
            className="w-[var(--anchor-width)] min-w-[var(--anchor-width)]"
            portalContainer={portalContainerRef}
          >
            <ComboboxEmpty>No hay entidades para mostrar</ComboboxEmpty>
            <ComboboxList>
              {(entity: Entity) => (
                <ComboboxItem key={entity.id} value={entity}>
                  <EntityIconTile
                    category={TYPE_TO_CATEGORY[entity.type]}
                    className="size-7"
                    iconClassName="size-4"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {entity.canonicalName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {TYPE_TO_CATEGORY[entity.type]}
                    </span>
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
            {canCreateEntity && (
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary/5"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onCreateEntity(searchValue.trim())
                  setSearchValue("")
                }}
              >
                <Plus className="size-4" />
                Crear &ldquo;{searchValue.trim()}&rdquo;
              </button>
            )}
          </ComboboxContent>
        </Combobox>
      </FieldContent>
    </Field>
  )
}
