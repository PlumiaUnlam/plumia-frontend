import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/modal/confirm-dialog";
import { FormDialog } from "@/components/modal/form-dialog";
import { NewItemModal } from "@/components/modal/new-item-modal";
import { BookCoverEditor } from "@/components/books/book-cover-editor";

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
}: Readonly<LeftSidebarItemModalsProps>) {
  const nameField = (
    <Field>
      <FieldLabel htmlFor="edit-sidebar-item-name">
        Nombre <span className="text-destructive">*</span>
      </FieldLabel>
      <FieldContent>
        <Input
          id="edit-sidebar-item-name"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          placeholder="Nombre"
          autoFocus
        />
      </FieldContent>
    </Field>
  );

  return (
    <>
      <FormDialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) onCloseEditItem();
        }}
        title={editingItem?.type === "book" ? "Editar libro" : "Editar elemento"}
        size={editingItem?.type === "book" ? "md" : "sm"}
        submitLabel="Guardar"
        submitDisabled={!editName.trim()}
        loading={isItemActionSubmitting}
        onSubmit={onUpdateItem}
      >
        {editingItem?.type === "book" ? (
          <BookCoverEditor
            bookId={editingItem.id}
            bookTitle={editName.trim() || editingItem.title}
          >
            {nameField}
          </BookCoverEditor>
        ) : (
          nameField
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open) onDeleteItemChange(null);
        }}
        title="Eliminar elemento"
        description={`¿Querés eliminar “${itemToDelete?.title ?? ""}”? Esta acción no se puede deshacer.`}
        loading={isItemActionSubmitting}
        onConfirm={onDeleteItem}
      />

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
