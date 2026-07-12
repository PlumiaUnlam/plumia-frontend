import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, GitBranch, Pencil, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";

import type { SceneVersionSummary } from "@/types/scene";

type LeftSidebarHistoryProps = {
  activeSceneId: string | null;
  activeSceneTitle?: string;
  historyOpen: boolean;
  createVersionOpen: boolean;
  versions: SceneVersionSummary[];
  versionsError: string | null;
  versionsLoading: boolean;
  newVersionName: string;
  restoreTarget: SceneVersionSummary | null;
  versionToRename: SceneVersionSummary | null;
  versionToDelete: SceneVersionSummary | null;
  versionEditName: string;
  selectedSceneVersionId: string | null;
  isVersionActionSubmitting: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  onCreateVersionOpen: () => void;
  onCreateVersionOpenChange: (open: boolean) => void;
  onCreateVersionNameChange: (value: string) => void;
  onCreateVersion: () => Promise<void>;
  onSelectDraft: () => void;
  onSelectVersion: (versionId: string) => void;
  onOpenRestore: (version: SceneVersionSummary | null) => void;
  onRestoreVersion: () => Promise<void>;
  onOpenRename: (version: SceneVersionSummary | null) => void;
  onRenameVersionNameChange: (value: string) => void;
  onRenameVersion: () => Promise<void>;
  onOpenDelete: (version: SceneVersionSummary | null) => void;
  onDeleteVersion: () => Promise<void>;
};

export function LeftSidebarHistory({
  activeSceneId,
  activeSceneTitle,
  historyOpen,
  createVersionOpen,
  versions,
  versionsError,
  versionsLoading,
  newVersionName,
  restoreTarget,
  versionToRename,
  versionToDelete,
  versionEditName,
  selectedSceneVersionId,
  isVersionActionSubmitting,
  onHistoryOpenChange,
  onCreateVersionOpen,
  onCreateVersionOpenChange,
  onCreateVersionNameChange,
  onCreateVersion,
  onSelectDraft,
  onSelectVersion,
  onOpenRestore,
  onRestoreVersion,
  onOpenRename,
  onRenameVersionNameChange,
  onRenameVersion,
  onOpenDelete,
  onDeleteVersion,
}: LeftSidebarHistoryProps) {
  return (
    <>
      <Sheet open={historyOpen} onOpenChange={onHistoryOpenChange}>
        <SheetContent side="left" className="w-80 gap-0 p-0 sm:max-w-80">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Undo2 className="size-4 text-sidebar-primary" />
              Historial
            </SheetTitle>
            <SheetDescription className="text-xs">
              {activeSceneTitle ?? "Selecciona una escena para ver sus versiones."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b p-3">
              <Button
                className="w-full justify-start gap-2"
                size="sm"
                variant="outline"
                disabled={!activeSceneId}
                onClick={onCreateVersionOpen}
              >
                <Plus className="size-3.5" />
                Crear version
              </Button>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 p-3">
                {!activeSceneId && (
                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center text-xs text-muted-foreground">
                    Abre una escena para consultar su historial.
                  </div>
                )}

                {activeSceneId && (
                  <Item
                    variant="outline"
                    className={`gap-3 ${
                      selectedSceneVersionId === null
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={onSelectDraft}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ItemMedia>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <GitBranch className="size-4" />
                        </div>
                      </ItemMedia>
                      <ItemContent className="min-w-0 gap-0.5">
                        <ItemTitle className="w-full text-xs text-foreground">
                          Borrador principal
                          {selectedSceneVersionId === null && (
                            <Check className="size-3.5 shrink-0 text-primary" />
                          )}
                        </ItemTitle>
                        <ItemDescription className="text-[10px]">
                          Se usa para terminar o exportar el libro.
                        </ItemDescription>
                      </ItemContent>
                    </button>
                  </Item>
                )}

                {versionsLoading && activeSceneId && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-16 animate-pulse rounded-lg border border-border bg-muted"
                      />
                    ))}
                  </div>
                )}

                {!versionsLoading && versionsError && (
                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-xs text-muted-foreground">
                    {versionsError}
                  </div>
                )}

                {!versionsLoading &&
                  !versionsError &&
                  versions.map((version) => {
                    const selected = selectedSceneVersionId === version.id;

                    return (
                      <Item
                        key={version.id}
                        variant="outline"
                        className={`gap-3 ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectVersion(version.id)}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        >
                          <ItemMedia>
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <GitBranch className="size-4" />
                            </div>
                          </ItemMedia>
                          <ItemContent className="min-w-0 gap-0.5">
                            <ItemTitle className="w-full text-xs text-foreground">
                              {version.label || "Version sin titulo"}
                              {selected && (
                                <Check className="size-3.5 shrink-0 text-primary" />
                              )}
                            </ItemTitle>
                            <ItemDescription className="text-[10px]">
                              {version.wordCount.toLocaleString()} palabras
                            </ItemDescription>
                            <ItemDescription className="text-[10px]">
                              {new Date(version.updatedAt).toLocaleDateString()}
                            </ItemDescription>
                          </ItemContent>
                        </button>
                        <ItemActions className="ml-auto gap-0.5 self-start">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-7"
                            aria-label={`Convertir ${
                              version.label || "version sin titulo"
                            } en principal`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenRestore(version);
                            }}
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-7"
                            aria-label={`Cambiar nombre de ${
                              version.label || "version sin titulo"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenRename(version);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-7 text-destructive hover:text-destructive"
                            aria-label={`Eliminar ${
                              version.label || "version sin titulo"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenDelete(version);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </ItemActions>
                      </Item>
                    );
                  })}

                {!versionsLoading &&
                  !versionsError &&
                  activeSceneId &&
                  versions.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center text-xs text-muted-foreground">
                      Esta escena todavia no tiene versiones.
                    </div>
                  )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={createVersionOpen} onOpenChange={onCreateVersionOpenChange}>
        <DialogContent className="min-w-[420px] gap-0 overflow-hidden">
          <DialogHeader className="border-b p-6 py-4">
            <DialogTitle>Crear version</DialogTitle>
            <DialogDescription>
              Se guardara una copia editable de la escena actual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <Field>
              <FieldLabel htmlFor="new-version-name">Nombre</FieldLabel>
              <FieldContent>
                <Input
                  id="new-version-name"
                  value={newVersionName}
                  onChange={(e) => onCreateVersionNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void onCreateVersion();
                    }
                  }}
                  placeholder="Ej: Reescritura del final"
                />
              </FieldContent>
            </Field>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              disabled={isVersionActionSubmitting}
              onClick={() => onCreateVersionOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={isVersionActionSubmitting}
              onClick={() => {
                void onCreateVersion();
              }}
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!restoreTarget}
        onOpenChange={(open) => {
          if (!open && !isVersionActionSubmitting) onOpenRestore(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir en principal</DialogTitle>
            <DialogDescription>
              Esto reemplazara el borrador principal de la escena por
              &ldquo;{restoreTarget?.label || "Version sin titulo"}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isVersionActionSubmitting}
              onClick={() => onOpenRestore(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={isVersionActionSubmitting}
              onClick={() => {
                void onRestoreVersion();
              }}
            >
              Convertir en principal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!versionToRename}
        onOpenChange={(open) => {
          if (!open && !isVersionActionSubmitting) {
            onOpenRename(null);
            onRenameVersionNameChange("");
          }
        }}
      >
        <DialogContent className="min-w-[420px] gap-0 overflow-hidden">
          <DialogHeader className="border-b p-6 py-4">
            <DialogTitle>Cambiar nombre</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <Field>
              <FieldLabel htmlFor="edit-version-name">Nombre</FieldLabel>
              <FieldContent>
                <Input
                  id="edit-version-name"
                  value={versionEditName}
                  onChange={(e) => onRenameVersionNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void onRenameVersion();
                    }
                  }}
                  placeholder="Nombre de la version"
                />
              </FieldContent>
            </Field>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              disabled={isVersionActionSubmitting}
              onClick={() => {
                onOpenRename(null);
                onRenameVersionNameChange("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={isVersionActionSubmitting}
              onClick={() => {
                void onRenameVersion();
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!versionToDelete}
        onOpenChange={(open) => {
          if (!open && !isVersionActionSubmitting) onOpenDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar version</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar &ldquo;
              {versionToDelete?.label || "Version sin titulo"}&rdquo;? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isVersionActionSubmitting}
              onClick={() => onOpenDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isVersionActionSubmitting}
              onClick={() => {
                void onDeleteVersion();
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
