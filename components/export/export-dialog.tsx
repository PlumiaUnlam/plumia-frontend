"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, Loader2, RotateCcw } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BookCoverEditor } from "@/components/books/book-cover-editor"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createExport,
  getExportStatus,
  type ExportJob,
} from "@/services/export.service"

export type ExportBookOption = {
  id: string
  title: string
}

type ExportDialogProps = {
  projectId: string
  books: ReadonlyArray<ExportBookOption>
  defaultBookId: string | null
  open: boolean
  isHistoricalVersion: boolean
  onOpenChange: (open: boolean) => void
  onBeforeExport?: () => Promise<void>
}

function statusLabel(status: ExportJob["status"]): string {
  if (status === "QUEUED") return "En cola"
  if (status === "PROCESSING") return "Generando"
  if (status === "COMPLETED") return "Listo"
  return "Error"
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo exportar el libro"
}

export function ExportDialog({
  projectId,
  books,
  defaultBookId,
  open,
  isHistoricalVersion,
  onOpenChange,
  onBeforeExport,
}: Readonly<ExportDialogProps>) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [job, setJob] = useState<ExportJob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const downloadedJobRef = useRef<string | null>(null)
  const currentJobId = job?.id
  const currentJobBookId = job?.bookId

  const bookId =
    selectedBookId && books.some((book) => book.id === selectedBookId)
      ? selectedBookId
      : (defaultBookId ?? books[0]?.id ?? null)
  const isBusy = isSubmitting || Boolean(job)
  const canExport = !isHistoricalVersion && !isBusy && Boolean(bookId)

  useEffect(() => {
    if (!open || !currentJobId || !currentJobBookId) return

    let cancelled = false
    let timer: number | null = null
    const controller = new AbortController()

    const poll = async () => {
      try {
        const current = await getExportStatus(
          projectId,
          currentJobBookId,
          currentJobId,
          controller.signal,
        )
        if (cancelled) return

        setJob(current)
        if (current.status === "COMPLETED") {
          if (current.downloadUrl && downloadedJobRef.current !== current.id) {
            downloadedJobRef.current = current.id
            window.location.assign(current.downloadUrl)
            setJob(null)
            onOpenChange(false)
          } else if (!current.downloadUrl) {
            setError("La exportación terminó, pero no se obtuvo el archivo")
          }
          if (timer !== null) window.clearInterval(timer)
        }
        if (current.status === "FAILED") {
          setError(current.errorMessage ?? "No se pudo generar el archivo")
          if (timer !== null) window.clearInterval(timer)
        }
      } catch (pollError) {
        if (!cancelled && !controller.signal.aborted) {
          setError(getErrorMessage(pollError))
        }
      }
    }

    void poll()
    timer = window.setInterval(() => void poll(), 2000)

    return () => {
      cancelled = true
      controller.abort()
      if (timer !== null) window.clearInterval(timer)
    }
  }, [currentJobBookId, currentJobId, onOpenChange, open, projectId])

  const reset = () => {
    setSelectedBookId(null)
    setJob(null)
    setIsSubmitting(false)
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleExport = async () => {
    if (!canExport || !bookId) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onBeforeExport?.()
      setJob(await createExport(projectId, bookId))
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const retry = () => {
    setJob(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Exportar un libro</DialogTitle>
          <DialogDescription>
            Elegí el libro que querés exportar. El archivo se genera en formato
            EPUB.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {isHistoricalVersion ? (
            <Alert className="bg-muted/50">
              <AlertTitle>Versión histórica seleccionada</AlertTitle>
              <AlertDescription>
                Volvé al borrador principal para exportar
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="export-book"
                  className="text-xs font-medium text-foreground"
                >
                  Libro
                </label>
                <Select
                  value={bookId ?? undefined}
                  disabled={isBusy || books.length === 0}
                  onValueChange={setSelectedBookId}
                >
                  <SelectTrigger id="export-book" className="h-10 w-full">
                    <SelectValue
                      placeholder={
                        books.length === 0
                          ? "El proyecto no tiene libros"
                          : "Seleccioná un libro"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bookId && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Portada <span className="font-normal text-muted-foreground">(opcional)</span>
                  </span>
                  <BookCoverEditor
                    key={bookId}
                    compact
                    bookId={bookId}
                    bookTitle={books.find((book) => book.id === bookId)?.title ?? ""}
                    disabled={isBusy}
                  />
                </div>
              )}

              <div className="flex min-h-[76px] w-full items-center gap-3 rounded-md border border-border bg-card px-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <BookOpen className="size-7" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-semibold leading-4 text-foreground">
                    EPUB
                  </span>
                  <span className="block text-xs font-medium leading-4 text-foreground">
                    Libro electrónico
                  </span>
                  <span className="block text-[11px] font-normal leading-3 text-muted-foreground">
                    Compatible con lectores digitales
                  </span>
                </span>
              </div>
            </div>
          )}

          {job && !error && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3 text-foreground">
              <div className="flex items-center justify-between text-sm">
                <span>{statusLabel(job.status)}</span>
                <span>{job.progress}%</span>
              </div>
              <Progress
                value={Math.min(100, Math.max(0, job.progress))}
                className="h-2"
                aria-label={`Progreso de exportación: ${job.progress}%`}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo exportar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {error && job && (
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          {!isHistoricalVersion && (
            <Button
              type="button"
              disabled={!canExport}
              onClick={() => void handleExport()}
            >
              {isSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Exportar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
