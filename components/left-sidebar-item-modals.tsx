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
import { NewItemModal } from "@/components/modal/new-item-modal";

import type {
  EditableItem,
  SidebarModalState,
} from "@/components/left-sidebar-types";

type LeftSidebarItemModalsProps = {
  modalType: SidebarModalState | null;
  editingItem: EditableItem | null;
  itemToDelete: EditableItem | null;
  editName: string;
  isItemActionSubmitting: boolean;
  onModalTypeChange: (value: SidebarModalState | null) => void;
  onEditNameChange: (value: string) => void;
  onCloseEditItem: () => void;
  onUpdateItem: () => Promise<void>;
  onDeleteItemChange: (item: EditableItem | null) => void;
  onDeleteItem: () => Promise<void>;
  onCreateBook: (name: string) => Promise<void>;
  onCreateChapter: (name: string) => Promise<void>;
  onCreateSection: (name: string) => Promise<void>;
};

export function LeftSidebarItemModals({
  modalType,
  editingItem,
  itemToDelete,
  editName,
  isItemActionSubmitting,
  onModalTypeChange,
  onEditNameChange,
  onCloseEditItem,
  onUpdateItem,
  onDeleteItemChange,
  onDeleteItem,
  onCreateBook,
  onCreateChapter,
  onCreateSection,
}: LeftSidebarItemModalsProps) {
  return (
    <>
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) onCloseEditItem();
        }}
      >
        <DialogContent className="min-w-[520px] gap-0 overflow-hidden">
          <DialogHeader className="border-b p-6 py-4">
            <DialogTitle>Editar elemento</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <Field>
              <FieldLabel htmlFor="edit-sidebar-item-name">
                Nombre <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-sidebar-item-name"
                  value={editName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void onUpdateItem();
                    }
                  }}
                  placeholder="Nombre"
                />
              </FieldContent>
            </Field>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              disabled={isItemActionSubmitting}
              onClick={onCloseEditItem}
            >
              Cancelar
            </Button>
            <Button
              disabled={!editName.trim() || isItemActionSubmitting}
              onClick={() => {
                void onUpdateItem();
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open && !isItemActionSubmitting) onDeleteItemChange(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar elemento</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar &ldquo;{itemToDelete?.title}&rdquo;? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isItemActionSubmitting}
              onClick={() => onDeleteItemChange(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isItemActionSubmitting}
              onClick={() => {
                void onDeleteItem();
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewItemModal
        show={modalType?.type === "chapter"}
        onClose={() => onModalTypeChange(null)}
        onSubmit={onCreateChapter}
        title="Nuevo Capítulo"
        label="Nombre del Capítulo"
        placeholder="Ej: Capítulo 1: ..."
        submitText="Crear Capítulo"
      />

      <NewItemModal
        show={modalType?.type === "section"}
        onClose={() => onModalTypeChange(null)}
        onSubmit={onCreateSection}
        title="Nueva Sección"
        label="Nombre de la Sección"
        placeholder="Ej: Sección 1: ..."
        submitText="Crear Sección"
      />

      <NewItemModal
        show={modalType?.type === "book"}
        onClose={() => onModalTypeChange(null)}
        onSubmit={onCreateBook}
        title="Nuevo Libro"
        label="Nombre del Libro"
        placeholder="Ej: Libro 1: ..."
        submitText="Crear Libro"
      />
    </>
  );
}
