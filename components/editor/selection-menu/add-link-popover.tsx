"use client"

import { useMemo, useState } from "react"
import type { Editor } from "@tiptap/react"
import { Link2, Search } from "lucide-react"
import useSWR from "swr"

import { Button } from "@/components/ui/button"
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile"
import { getEntities } from "@/services/entities.service"
import type { Entity } from "@/types/entity"
import { TYPE_TO_CATEGORY } from "@/types/entity"

type AddLinkPopoverProps = {
  editor: Editor
  projectId: string
  onDone: () => void
}

type LinkMode = "url" | "entity"

export function AddLinkPopover({ editor, projectId, onDone }: AddLinkPopoverProps) {
  const [mode, setMode] = useState<LinkMode>("entity")
  const [url, setUrl] = useState("")
  const [query, setQuery] = useState("")

  const { data: entities, isLoading } = useSWR(
    projectId ? `/knowledge/entities?projectId=${projectId}` : null,
    () => getEntities(projectId),
  )

  const filteredEntities = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const list = entities ?? []
    if (!normalized) return list
    return list.filter(
      (entity) =>
        entity.canonicalName.toLowerCase().includes(normalized) ||
        entity.aliases.some((alias) => alias.toLowerCase().includes(normalized)),
    )
  }, [entities, query])

  function applyEntity(entity: Entity) {
    const { to } = editor.state.selection

    editor
      .chain()
      .focus()
      .setEntityLink({
        entityId: entity.id,
        entityType: entity.type,
        entityName: entity.canonicalName,
      })
      .setTextSelection(to)
      .run()
    onDone()
  }

  function applyUrl() {
    const trimmed = url.trim()
    if (!trimmed) return

    const { to } = editor.state.selection

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .unsetEntityLink()
      .setLink({ href: trimmed })
      .setTextSelection(to)
      .run()
    onDone()
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md">
      <div className="mb-2 flex gap-1 rounded-md bg-muted p-0.5">
        <Button
          type="button"
          size="xs"
          variant={mode === "entity" ? "default" : "ghost"}
          className="flex-1"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setMode("entity")}
        >
          Entidad wiki
        </Button>
        <Button
          type="button"
          size="xs"
          variant={mode === "url" ? "default" : "ghost"}
          className="flex-1"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setMode("url")}
        >
          URL
        </Button>
      </div>

      {mode === "url" ? (
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyUrl()
            }}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring"
          />
          <Button
            type="button"
            size="icon-sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={applyUrl}
            disabled={!url.trim()}
          >
            <Link2 className="size-4" />
          </Button>
        </div>
      ) : (
        <div>
          <div className="mb-1.5 flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar entidad..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                Cargando entidades...
              </p>
            ) : filteredEntities.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No se encontraron entidades.
              </p>
            ) : (
              filteredEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyEntity(entity)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-muted"
                >
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
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
