"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { BookOpen, FileText, Loader2, RotateCcw, X } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  createExport,
  getExportStatus,
  type ExportFormat,
  type ExportJob,
} from "@/services/export.service"

type ExportDialogProps = {
  projectId: string
  open: boolean
  isHistoricalVersion: boolean
  onOpenChange: (open: boolean) => void
  onBeforeExport?: () => Promise<void>
}

const formatOptions: ReadonlyArray<{
  format: ExportFormat
  title: string
  description: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}> = [
  {
    format: "DOCX",
    title: "Documento de Word",
    description: "Para editoriales y procesos de edición",
    icon: FileText,
  },
  {
    format: "PDF",
    title: "Documento PDF",
    description: "Ideal para impresión y lectura",
    icon: FileText,
  },
  {
    format: "EPUB",
    title: "Libro electrónico",
    description: "Compatible con lectores digitales",
    icon: BookOpen,
  },
]

function statusLabel(status: ExportJob["status"]): string {
  if (status === "QUEUED") return "En cola"
  if (status === "PROCESSING") return "Generando"
  if (status === "COMPLETED") return "Listo"
  return "Error"
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo exportar la obra"
}

export function ExportDialog({
  projectId,
  open,
  isHistoricalVersion,
  onOpenChange,
  onBeforeExport,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [job, setJob] = useState<ExportJob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const downloadedJobRef = useRef<string | null>(null)
  const currentJobId = job?.id

  useEffect(() => {
    if (!open || !currentJobId) return

    let cancelled = false
    let timer: number | null = null
    const controller = new AbortController()

    const poll = async () => {
      try {
        const current = await getExportStatus(projectId, currentJobId, controller.signal)
        if (cancelled) return

        setJob(current)
        if (current.status === "COMPLETED") {
          if (current.downloadUrl && downloadedJobRef.current !== current.id) {
            downloadedJobRef.current = current.id
            window.location.assign(current.downloadUrl)
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
  }, [currentJobId, onOpenChange, open, projectId])

  const reset = () => {
    setSelectedFormat(null)
    setJob(null)
    setIsSubmitting(false)
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleExport = async (format: ExportFormat) => {
    if (isHistoricalVersion || isSubmitting || job) return

    setSelectedFormat(format)
    setIsSubmitting(true)
    setError(null)

    try {
      await onBeforeExport?.()
      setJob(await createExport(projectId, format))
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
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-[10px] border-[#e8dff0] bg-white p-0 text-[#2f1d40] shadow-xl sm:max-w-[450px]"
      >
        <DialogHeader className="relative gap-0 border-b border-[#eee4f5] px-3.5 py-3">
          <DialogTitle className="text-[16px] font-semibold leading-5 text-[#2f1d40]">
            Exportar Manuscrito
          </DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-[#9875b1] transition-colors hover:bg-[#f5eff8] hover:text-[#633c7e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b98ad2]"
              aria-label="Cerrar"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4 px-3.5 py-5">
          <DialogDescription className="max-w-[285px] text-[14px] leading-[1.35] text-[#8f70ae]">
            Selecciona el formato en el que deseas exportar tu manuscrito
          </DialogDescription>

          {isHistoricalVersion ? (
            <Alert className="border-[#e8dff0] bg-[#fbf8fd] text-[#5f3b78]">
              <AlertTitle>Versión histórica seleccionada</AlertTitle>
              <AlertDescription className="text-[#8f70ae]">
                Volvé al borrador principal para exportar
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-2.5">
              {formatOptions.map(({ format, title, description, icon: Icon }) => (
                <Button
                  key={format}
                  type="button"
                  variant="outline"
                  className="flex min-h-[76px] w-full items-center justify-start gap-3 rounded-[9px] border-[#e8dff0] bg-white px-3 text-left font-normal whitespace-normal shadow-none hover:border-[#d9c5e7] hover:bg-[#fdfaff]"
                  disabled={isSubmitting || Boolean(job)}
                  onClick={() => void handleExport(format)}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#f2ebf7] text-[#8745ad]">
                    {isSubmitting && selectedFormat === format ? (
                      <Loader2 className="size-7 animate-spin" />
                    ) : (
                      <Icon className="size-7" strokeWidth={1.8} />
                    )}
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-[14px] font-semibold leading-4 text-[#30203f]">
                      {format}
                    </span>
                    <span className="block text-[12px] font-medium leading-4 text-[#3e2a4e]">
                      {title}
                    </span>
                    <span className="block text-[11px] font-normal leading-3 text-[#8d6aa8]">
                      {description}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}

          {job && !error && (
            <div className="space-y-2 rounded-lg border border-[#e8dff0] bg-[#fbf8fd] p-3 text-[#5f3b78]">
              <div className="flex items-center justify-between text-sm">
                <span>{statusLabel(job.status)}</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#eee4f5]">
                <div
                  className="h-full rounded-full bg-[#8745ad] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo exportar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="m-0 flex-row justify-end rounded-none border-t border-[#eee4f5] bg-white px-3.5 py-3">
          {error && job && (
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-md border-[#e7d9f1] px-3 text-xs font-medium text-[#362046] hover:bg-[#faf6fd]"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
