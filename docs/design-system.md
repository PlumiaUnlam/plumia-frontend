# Guía de estilo del frontend

Base: shadcn/ui (`radix-nova`) sobre `radix-ui`, Tailwind v4. Los tokens viven en `app/globals.css`.
Regla de oro: **fuera de `components/ui/` no se escriben hex ni paletas de Tailwind (`violet-500`, `amber-*`…), solo tokens.**

## Breakpoints (px absolutos)

| Rango | Nombre | Prefijo | Referencia |
|---|---|---|---|
| 0–767px | Mobile | (base) | teléfonos de 360–430px |
| 768–1023px | Tablet | `md:` | iPad 768/810/820 |
| 1024px+ | Desktop | `lg:` | laptops, monitores |
| 1280px+ / 1536px+ | Desktop amplio | `xl:` / `2xl:` | 1080p, 4K escalado |

- Definidos en px en `@theme` de `app/globals.css`; las constantes de JS están en `lib/breakpoints.ts` (`useIsMobile` las usa).
- Nada con ancho mínimo fijo (`min-w-[520px]` está prohibido): con zoom del navegador al 200% o 400% el viewport CSS se achica y el layout debe reacomodarse.
- Topes en px para pantallas grandes: shell `max-w-[1440px]`, lectura `max-w-[760px]`.
- Tipografía y espaciado en rem, así respetan el tamaño de fuente del usuario.

## Color

Tokens semánticos (claro/oscuro): `background`, `foreground`, `card`, `popover`, `primary`, `primary-text` (violeta legible sobre fondo oscuro), `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`, y los de estado `success`, `warning`, `info` (+ `-foreground` y `-muted`).

Contraste verificado (WCAG AA): texto/fondo 16:1 claro y 15:1 oscuro; botón primario 6.4:1 claro y 5.6:1 oscuro; texto secundario 7:1 claro y 8:1 oscuro.

## Tipografía

Poppins 400 / 500 / 600 (local). No se usa `font-bold`.

| Uso | Clase |
|---|---|
| Título de página | `text-2xl font-semibold` (`md:text-3xl`) |
| Título de modal / sección | `text-lg font-semibold` |
| Subtítulo | `text-base font-medium` |
| Cuerpo y controles | `text-sm` |
| Secundario | `text-xs` |
| Badges y contadores | `text-2xs` (11px, único tamaño menor permitido) |

## Radios y elevación

Controles `rounded-lg`, tarjetas y modales `rounded-xl`, chips `rounded-full`. Sombras: tarjeta `shadow-sm`, menú `shadow-md`, modal `shadow-xl`.

## Modales

Elegir por propósito:

| Tipo | Componente | Ancho (desktop) | Cuándo |
|---|---|---|---|
| Confirmación | `ConfirmDialog` (`components/modal/confirm-dialog.tsx`) | 448px | Sí/No, borrar, descartar, avisos |
| Formulario simple | `FormDialog size="sm"` | 544px | 1–3 campos |
| Formulario | `FormDialog size="md"` | 704px | secciones, scroll |
| Espacio de trabajo | `FormDialog size="lg"` | 944px | 2 columnas, galerías, vistas previas |
| Panel lateral | `Sheet` | 320–420px | consulta mientras se usa la pantalla |

Anatomía (`DialogContent layout="sectioned"`): encabezado fijo (título + descripción), `DialogBody` con scroll (20px entre campos), pie fijo con Cancelar a la izquierda de la acción principal. En mobile (< 768px) los formularios ocupan toda la pantalla y los botones van a ancho completo; las confirmaciones quedan centradas.

Reglas:
- Mientras `loading` el modal no se cierra (Esc y click afuera bloqueados) y el botón muestra `Spinner`.
- Errores del envío: prop `error` (usa `FormError`); errores por campo: `FieldError`.
- Modal sobre otro modal: `layer={1|2}` (nunca `z-[…]` sueltos).
- Si el contenido tiene botones sin `type="button"`, usar `enterToSubmit={false}`.
- Prohibido en un modal: `min-w-*`, `w-[…px]`, `max-w-*`, colores hex, paddings propios en header/footer.

```tsx
<ConfirmDialog
  open={!!entity}
  onOpenChange={(open) => !open && setEntity(null)}
  title="Eliminar entidad"
  description={`¿Querés eliminar “${entity?.name}”? Esta acción no se puede deshacer.`}
  loading={deleting}
  onConfirm={handleDelete}
/>

<FormDialog open={open} onOpenChange={setOpen} title="Nuevo capítulo" size="sm"
  submitLabel="Crear capítulo" loading={saving} error={error} onSubmit={handleCreate}>
  <Field>
    <FieldLabel htmlFor="name">Nombre</FieldLabel>
    <Input id="name" value={name} onChange={…} />
  </Field>
</FormDialog>
```

## Pendiente (siguientes pasos)

- Reemplazar `Loader2 … animate-spin` por `<Spinner />`, estados vacíos por `Empty`, `<button>` crudos por `Button`.
- Reemplazar `text-[8–10px]` por `text-2xs`/`text-xs` y `amber/emerald/violet-*` por los tokens semánticos.
- Unificar las tarjetas de entidad entre `components/wiki-panel.tsx` y `components/worldbuilding/wiki-panel.tsx`.
