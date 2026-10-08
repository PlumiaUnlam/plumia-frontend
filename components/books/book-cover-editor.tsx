"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { BookOpen, ImageUp, Loader2, Trash2 } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  COVER_ACCEPT,
  getBookCover,
  getCoverDimensionWarning,
  removeBookCover,
  translateCoverError,
  uploadBookCover,
  validateCoverFile,
} from "@/services/book-cover.service"

// La URL firmada vence a los 15 minutos; se renueva antes.
const COVER_REFRESH_MS = 10 * 60 * 1000

type BookCoverEditorProps = {
  bookId: string
  bookTitle: string
  disabled?: boolean
  compact?: boolean
}

export function BookCoverEditor({
  bookId,
  bookTitle,
  disabled = false,
  compact = false,
}: Readonly<BookCoverEditorProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localPreviewRef = useRef<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const {
    data: coverUrl,
    isLoading,
    mutate,
  } = useSWR(["book-cover", bookId], () => getBookCover(bookId), {
    refreshInterval: COVER_REFRESH_MS,
    revalidateOnFocus: true,
    onError: (error) => {
      toast.error(translateCoverError(error, "No se pudo cargar la portada."))
    },
  })

  const replaceLocalPreview = (next: string | null) => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    localPreviewRef.current = next
    setLocalPreview(next)
  }

  useEffect(() => () => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
  }, [])

  const isBusy = isUploading || isRemoving
  const controlsDisabled = disabled || isBusy || isLoading
  const previewUrl = localPreview ?? coverUrl ?? null
  const hasCover = Boolean(coverUrl)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      validateCoverFile(file)
    } catch (error) {
      toast.error(translateCoverError(error, "No se pudo usar esa imagen."))
      return
    }

    const warning = await getCoverDimensionWarning(file)
    if (warning) toast.warning(warning)

    setIsUploading(true)
    replaceLocalPreview(URL.createObjectURL(file))
    try {
      const nextUrl = await uploadBookCover(bookId, file)
      await mutate(nextUrl, { revalidate: false })
      toast.success(hasCover ? "Portada actualizada." : "Portada agregada.")
    } catch (error) {
      toast.error(translateCoverError(error, "No se pudo subir la portada."))
    } finally {
      replaceLocalPreview(null)
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeBookCover(bookId)
      await mutate(null, { revalidate: false })
      toast.success("Portada quitada.")
    } catch (error) {
      toast.error(translateCoverError(error, "No se pudo quitar la portada."))
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className={cn("flex gap-4", compact ? "items-center" : "items-start")}>
      <div
        className={cn(
          "relative aspect-[5/8] shrink-0 overflow-hidden rounded-md border border-border bg-muted",
          compact ? "w-20" : "w-32",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada de R2 que vence; no pasa por next/image.
          <img
            src={previewUrl}
            alt={`Portada de ${bookTitle}`}
            className="size-full object-cover"
            onError={() => {
              if (!localPreview) void mutate()
            }}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center text-muted-foreground">
            <BookOpen className={compact ? "size-5" : "size-7"} strokeWidth={1.6} />
            <span
              className={cn(
                "line-clamp-4 break-words font-serif leading-tight text-foreground/80",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {bookTitle || "Sin título"}
            </span>
          </div>
        )}
        {(isBusy || isLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-5 animate-spin text-foreground" aria-label="Cargando portada" />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={COVER_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void handleFileChange(event)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={controlsDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageUp />
            {hasCover ? "Cambiar portada" : "Subir portada"}
          </Button>
          {hasCover && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={controlsDisabled}
              onClick={() => setIsConfirmOpen(true)}
            >
              <Trash2 />
              Quitar portada
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG o PNG, hasta 10 MB. Recomendado: 1600 × 2560 px.
        </p>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar la portada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra la imagen de “{bookTitle}”. El EPUB se exportará sin portada,
              empezando por la página de título.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleRemove()}
            >
              Quitar portada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
