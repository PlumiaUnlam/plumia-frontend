"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import {
  Funnel,
  GitBranch,
  Loader2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";

import { relationStyleOptions, relationStyles } from "@/lib/relation-style";
import type { Entity } from "@/types/entity";
import type { Relationship, RelationType } from "@/types/relationship";

type RelationshipsPanelProps = {
  readonly entities: readonly Entity[];
  readonly relationships: readonly Relationship[];
  readonly loading: boolean;
  readonly error?: Error;
};

export function RelationshipsPanel({
  entities,
  relationships,
  loading,
  error,
}: RelationshipsPanelProps) {
  const [selectedTypes, setSelectedTypes] = useState<RelationType[]>([]);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<
    string | null
  >(null);
  const [flowNodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const characterEntities = useMemo(
    () => entities.filter((entity) => entity.type === "CHARACTER"),
    [entities],
  );
  const entityById = useMemo(
    () => new Map(characterEntities.map((entity) => [entity.id, entity])),
    [characterEntities],
  );
  const characterIds = useMemo(
    () => new Set(characterEntities.map((entity) => entity.id)),
    [characterEntities],
  );
  const visibleRelationships = useMemo(
    () =>
      relationships.filter(
        (relationship) =>
          characterIds.has(relationship.sourceEntityId) &&
          characterIds.has(relationship.targetEntityId),
      ),
    [characterIds, relationships],
  );
  const filteredRelationships = useMemo(
    () =>
      selectedTypes.length === 0
        ? visibleRelationships
        : visibleRelationships.filter((relationship) =>
            selectedTypes.includes(relationship.relationType),
          ),
    [selectedTypes, visibleRelationships],
  );
  const selectedRelationship = useMemo(
    () =>
      visibleRelationships.find(
        (relationship) => relationship.id === selectedRelationshipId,
      ) ?? null,
    [selectedRelationshipId, visibleRelationships],
  );
  const selectedEntityIds = useMemo(
    () =>
      new Set(
        selectedRelationship
          ? [
              selectedRelationship.sourceEntityId,
              selectedRelationship.targetEntityId,
            ]
          : [],
      ),
    [selectedRelationship],
  );
  const layoutedNodes = useMemo<Node[]>(
    () =>
      characterEntities.map((entity, index) => {
        const total = Math.max(characterEntities.length, 1);
        const angle = (index / total) * Math.PI * 2;
        const radius = total > 5 ? 320 : total > 2 ? 230 : 150;
        const isSelected = selectedEntityIds.has(entity.id);

        return {
          id: entity.id,
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          },
          data: {
            label: (
              <div className="w-44 text-left">
                <p className="truncate text-sm font-semibold text-foreground">
                  {entity.canonicalName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {entity.aliases[0] ?? "Personaje"}
                </p>
              </div>
            ),
          },
          type: "default",
          selected: isSelected,
          style: {
            width: 208,
            border: isSelected
              ? "1px solid color-mix(in oklch, var(--primary), transparent 35%)"
              : "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--card)",
            color: "var(--foreground)",
            boxShadow: isSelected
              ? "0 14px 30px color-mix(in oklch, var(--primary), transparent 82%)"
              : "0 10px 24px rgb(0 0 0 / 0.08)",
            padding: 12,
          },
        };
      }),
    [characterEntities, selectedEntityIds],
  );

  const toggleSelectedRelationship = (relationshipId: string) => {
    setSelectedRelationshipId((current) =>
      current === relationshipId ? null : relationshipId,
    );
  };

  const layoutedEdges = useMemo<Edge[]>(
    () =>
      filteredRelationships.map((relationship) => {
        const isSelected = relationship.id === selectedRelationshipId;
        const relationStyle = relationStyles[relationship.relationType];

        return {
          id: relationship.id,
          source: relationship.sourceEntityId,
          target: relationship.targetEntityId,
          label: relationStyle.label,
          animated: isSelected,
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: relationStyle.color,
            width: 16,
            height: 16,
          },
          style: {
            stroke: relationStyle.color,
            strokeWidth: isSelected
              ? Math.max(4, relationship.intensity + 1)
              : Math.max(2, relationship.intensity * 0.85),
            opacity: isSelected || !selectedRelationshipId ? 0.95 : 0.28,
          },
          labelStyle: {
            fill: relationStyle.color,
            fontWeight: 700,
            fontSize: 12,
          },
          labelBgStyle: {
            fill: "var(--card)",
            fillOpacity: 0.95,
          },
          labelBgPadding: [8, 4] as [number, number],
          labelBgBorderRadius: 8,
          selected: isSelected,
        };
      }),
    [filteredRelationships, selectedRelationshipId],
  );

  useEffect(() => {
    let isCurrent = true;

    queueMicrotask(() => {
      if (!isCurrent) return;

      setNodes((currentNodes) =>
        layoutedNodes.map((node) => {
          const existingNode = currentNodes.find(
            (currentNode) => currentNode.id === node.id,
          );

          return {
            ...node,
            position: existingNode?.position ?? node.position,
          };
        }),
      );
    });

    return () => {
      isCurrent = false;
    };
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    let isCurrent = true;

    queueMicrotask(() => {
      if (!isCurrent) return;
      setEdges(layoutedEdges);
    });

    return () => {
      isCurrent = false;
    };
  }, [layoutedEdges, setEdges]);

  const toggleType = (type: RelationType) => {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((selectedType) => selectedType !== type)
        : [...current, type],
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-primary">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm font-medium">Cargando relaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>No se pudieron cargar las relaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (characterEntities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center text-primary opacity-70">
        <div className="space-y-2">
          <Users className="mx-auto size-12" />
          <h2 className="text-lg font-semibold">No hay personajes</h2>
          <p>Crea personajes en la wiki para construir el mapa de relaciones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <aside className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/30">
        <div className="space-y-3 border-b border-border bg-card/50 p-3">
          <div className="flex items-center gap-1">
            <Funnel size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-muted-foreground">
              TIPOS
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                selectedTypes.length === 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted"
              }`}
              onClick={() => setSelectedTypes([])}
            >
              Todas
            </button>

            {relationStyleOptions.map(({ id, label, color, icon: Icon }) => {
              const isSelected = selectedTypes.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                  onClick={() => toggleType(id)}
                >
                  <Icon className="size-3.5" style={{ color }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-border bg-card/50 p-3">
          <GitBranch className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">
            RELACIONES
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1 p-3">
          <ItemGroup className="min-w-0">
            {filteredRelationships.length > 0 ? (
              filteredRelationships.map((relationship) => {
                const source = entityById.get(relationship.sourceEntityId);
                const target = entityById.get(relationship.targetEntityId);
                const isSelected = selectedRelationshipId === relationship.id;
                const relationStyle = relationStyles[relationship.relationType];
                const RelationIcon = relationStyle.icon;

                return (
                  <Item
                    key={relationship.id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectedRelationship(relationship.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleSelectedRelationship(relationship.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    className={`cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "bg-white hover:bg-muted/50"
                    }`}
                  >
                    <ItemMedia variant="icon">
                      <RelationIcon
                        className="size-4"
                        style={{ color: relationStyle.color }}
                      />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="max-w-full">
                        {source?.canonicalName ?? "Personaje"} →{" "}
                        {target?.canonicalName ?? "Personaje"}
                      </ItemTitle>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge>{relationStyle.label}</Badge>
                        <span className="text-xs font-medium text-primary">
                          {relationship.intensity} / 5
                        </span>
                      </div>
                      <ItemDescription className="break-words">
                        {relationship.description ?? "Sin descripción"}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                {visibleRelationships.length > 0
                  ? "No hay relaciones para los filtros seleccionados."
                  : "Crea una relación para conectar personajes en el grafo."}
              </div>
            )}
          </ItemGroup>
        </ScrollArea>
      </aside>

      <main className="min-h-0 flex-1 bg-muted/30">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          onEdgeClick={(_, edge) => toggleSelectedRelationship(edge.id)}
          onPaneClick={() => setSelectedRelationshipId(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--border)" gap={24} size={1.2} />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) =>
              selectedEntityIds.has(node.id) ? "var(--primary)" : "var(--muted)"
            }
            maskColor="color-mix(in oklch, var(--background), transparent 22%)"
          />
        </ReactFlow>
      </main>
    </div>
  );
}
