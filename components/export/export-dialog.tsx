"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { BookOpen, FileText, Info, Loader2, RotateCcw, X } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ExportBandFields,
  FOOTER_OPTIONS,
  HEADER_OPTIONS,
} from "@/components/export/export-band-fields"
import {
  createExport,
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_MARGIN_MAX,
  EXPORT_MARGIN_MIN,
  getExportSettings,
  getExportStatus,
  updateExportSettings,
  type ExportFormat,
  type ExportJob,
  type ExportMargins,
  type ExportSettings,
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

type ExportTab = "format" | "page"

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

const marginFields: ReadonlyArray<{ key: keyof ExportMargins; label: string }> = [
  { key: "topCm", label: "Superior" },
  { key: "bottomCm", label: "Inferior" },
  { key: "leftCm", label: "Izquierdo" },
  { key: "rightCm", label: "Derecho" },
]

function statusLabel(status: ExportJob["status"]): string {
  if (status === "QUEUED") return "En cola"
  if (status === "PROCESSING") return "Generando"
  if (status === "COMPLETED") return "Listo"
  return "Error"
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo exportar el libro"
}

function validateExportSettings(settings: ExportSettings): string | null {
  for (const { key, label } of marginFields) {
    const value = settings.margins[key]
    if (
      !Number.isFinite(value) ||
      value < EXPORT_MARGIN_MIN ||
      value > EXPORT_MARGIN_MAX
    ) {
      return `El margen ${label.toLowerCase()} debe estar entre ${EXPORT_MARGIN_MIN} y ${EXPORT_MARGIN_MAX} cm`
    }
  }
  return null
}

function sameSettings(a: ExportSettings, b: ExportSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
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
  const [activeTab, setActiveTab] = useState<ExportTab>("format")
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [savedSettings, setSavedSettings] = useState<ExportSettings | null>(null)
  const [draftSettings, setDraftSettings] = useState<ExportSettings | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
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
  const baseSettings = savedSettings ?? DEFAULT_EXPORT_SETTINGS
  const settings = draftSettings ?? baseSettings
  const settingsLoading = open && savedSettings === null && settingsError === null
  const validationError = validateExportSettings(settings)
  const isBusy = isSubmitting || Boolean(job)
  const hasBands = settings.header !== null || settings.footer !== null
  const canExport =
    !isHistoricalVersion &&
    !isBusy &&
    !settingsLoading &&
    Boolean(bookId) &&
    selectedFormat !== null &&
    validationError === null

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()

    getExportSettings(projectId, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setSavedSettings(loaded)
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setSettingsError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la configuración de página",
          )
        }
      })

    return () => controller.abort()
  }, [open, projectId])

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
    setActiveTab("format")
    setSelectedBookId(null)
    setSelectedFormat(null)
    setSavedSettings(null)
    setDraftSettings(null)
    setSettingsError(null)
    setJob(null)
    setIsSubmitting(false)
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const updateSettings = (patch: Partial<ExportSettings>) => {
    setDraftSettings({ ...settings, ...patch })
  }

  const updateMargin = (key: keyof ExportMargins, value: number) => {
    updateSettings({ margins: { ...settings.margins, [key]: value } })
  }

  const handleExport = async () => {
    if (!canExport || !bookId || !selectedFormat) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onBeforeExport?.()

      if (!sameSettings(settings, baseSettings)) {
        const saved = await updateExportSettings(
          projectId,
          settings,
        )
        setSavedSettings(saved)
        setDraftSettings(null)
      }

      setJob(await createExport(projectId, bookId, selectedFormat))
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
        className="max-h-[calc(100dvh-1rem)] w-[min(40rem,calc(100vw-1.5rem))] max-w-none gap-0 overflow-x-hidden overflow-y-auto rounded-[10px] border-[#e8dff0] bg-white p-0 text-[#2f1d40] shadow-xl sm:max-h-[min(90dvh,52rem)] sm:max-w-none"
      >
        <DialogHeader className="relative gap-0 border-b border-[#eee4f5] px-3.5 py-3">
          <DialogTitle className="text-[16px] font-semibold leading-5 text-[#2f1d40]">
            Exportar libro
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
          <DialogDescription className="text-[14px] leading-[1.35] text-[#8f70ae]">
            Elegí el libro, el formato y el diseño de página
          </DialogDescription>

          {isHistoricalVersion ? (
            <Alert className="border-[#e8dff0] bg-[#fbf8fd] text-[#5f3b78]">
              <AlertTitle>Versión histórica seleccionada</AlertTitle>
              <AlertDescription className="text-[#8f70ae]">
                Volvé al borrador principal para exportar
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as ExportTab)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="format">Formato</TabsTrigger>
                <TabsTrigger value="page">Página</TabsTrigger>
              </TabsList>

              <TabsContent value="format" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="export-book"
                    className="text-xs font-medium text-[#3e2a4e]"
                  >
                    Libro
                  </label>
                  <select
                    id="export-book"
                    value={bookId ?? ""}
                    disabled={isBusy || books.length === 0}
                    onChange={(event) => setSelectedBookId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {books.length === 0 && (
                      <option value="">El proyecto no tiene libros</option>
                    )}
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2.5">
                  {formatOptions.map(({ format, title, description, icon: Icon }) => {
                    const isSelected = selectedFormat === format
                    return (
                      <Button
                        key={format}
                        type="button"
                        variant="outline"
                        aria-pressed={isSelected}
                        className={`flex min-h-[76px] w-full items-center justify-start gap-3 rounded-[9px] bg-white px-3 text-left font-normal whitespace-normal shadow-none hover:border-[#d9c5e7] hover:bg-[#fdfaff] ${
                          isSelected
                            ? "border-[#b98ad2] bg-[#fbf8fd] ring-2 ring-[#eadcf3]"
                            : "border-[#e8dff0]"
                        }`}
                        disabled={isBusy}
                        onClick={() => setSelectedFormat(format)}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#f2ebf7] text-[#8745ad]">
                          <Icon className="size-7" strokeWidth={1.8} />
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
                    )
                  })}
                </div>

                {selectedFormat === "EPUB" && hasBands && (
                  <Alert className="border-[#e8dff0] bg-[#fbf8fd] text-[#5f3b78]">
                    <Info className="size-4" />
                    <AlertDescription className="text-[#8f70ae]">
                      En EPUB el encabezado y el pie de página no se aplican;
                      sólo se aproximan los márgenes.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="page" className="space-y-4 pt-2">
                {settingsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#8f70ae]">
                    <Loader2 className="size-4 animate-spin" />
                    Cargando configuración…
                  </div>
                ) : (
                  <>
                    {settingsError && (
                      <Alert variant="destructive">
                        <AlertTitle>No se pudo cargar la configuración</AlertTitle>
                        <AlertDescription>
                          {settingsError}. Se usan los valores por defecto.
                        </AlertDescription>
                      </Alert>
                    )}

                    <fieldset className="space-y-2">
                      <legend className="mb-2 text-[13px] font-semibold text-[#30203f]">
                        Márgenes (cm)
                      </legend>
                      <div className="grid grid-cols-2 gap-2.5">
                        {marginFields.map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <label
                              htmlFor={`export-margin-${key}`}
                              className="text-xs font-medium text-[#3e2a4e]"
                            >
                              {label}
                            </label>
                            <Input
                              id={`export-margin-${key}`}
                              type="number"
                              inputMode="decimal"
                              step={0.1}
                              min={EXPORT_MARGIN_MIN}
                              max={EXPORT_MARGIN_MAX}
                              disabled={isBusy}
                              value={
                                Number.isFinite(settings.margins[key])
                                  ? settings.margins[key]
                                  : ""
                              }
                              onChange={(event) =>
                                updateMargin(key, event.target.valueAsNumber)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </fieldset>

                    <ExportBandFields
                      id="export-header"
                      label="Encabezado"
                      options={HEADER_OPTIONS}
                      value={settings.header}
                      disabled={isBusy}
                      onChange={(header) => updateSettings({ header })}
                    />

                    <ExportBandFields
                      id="export-footer"
                      label="Pie de página"
                      options={FOOTER_OPTIONS}
                      value={settings.footer}
                      disabled={isBusy}
                      onChange={(footer) => updateSettings({ footer })}
                    />

                    <p className="text-[11px] leading-4 text-[#8d6aa8]">
                      La configuración se guarda para todo el proyecto al exportar.
                      La portada nunca lleva encabezado ni pie de página.
                    </p>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}

          {!isHistoricalVersion && validationError && !settingsLoading && (
            <Alert variant="destructive">
              <AlertTitle>Revisá la configuración de página</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
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

        <DialogFooter className="m-0 flex-row justify-end gap-2 rounded-none border-t border-[#eee4f5] bg-white px-3.5 py-3">
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
          {!isHistoricalVersion && (
            <Button
              type="button"
              className="h-8 rounded-md bg-[#8745ad] px-3 text-xs font-medium text-white hover:bg-[#763a99]"
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
