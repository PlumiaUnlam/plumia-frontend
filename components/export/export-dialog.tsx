"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { BookOpen, FileText, Info, Loader2, RotateCcw } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
        className="max-h-[calc(100dvh-1rem)] w-[min(40rem,calc(100vw-1.5rem))] max-w-none gap-0 overflow-x-hidden overflow-y-auto border-border bg-popover p-0 text-popover-foreground shadow-xl sm:max-h-[min(90dvh,52rem)] sm:max-w-none"
      >
        <DialogHeader className="relative gap-0 border-b border-border px-3.5 py-3 pr-12">
          <DialogTitle className="text-base font-semibold leading-5 text-foreground">
            Exportar libro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-3.5 py-5">
          <DialogDescription className="leading-snug">
            Elegí el libro, el formato y el diseño de página
          </DialogDescription>

          {isHistoricalVersion ? (
            <Alert className="bg-muted/50">
              <AlertTitle>Versión histórica seleccionada</AlertTitle>
              <AlertDescription>
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

                <div className="grid gap-2.5">
                  {formatOptions.map(({ format, title, description, icon: Icon }) => {
                    const isSelected = selectedFormat === format
                    return (
                      <Button
                        key={format}
                        type="button"
                        variant="outline"
                        aria-pressed={isSelected}
                        className={`flex min-h-[76px] w-full items-center justify-start gap-3 bg-card px-3 text-left font-normal whitespace-normal shadow-none hover:border-primary/30 hover:bg-primary/5 ${
                          isSelected
                            ? "border-primary/50 bg-primary/5 ring-2 ring-primary/10"
                            : "border-border"
                        }`}
                        disabled={isBusy}
                        onClick={() => setSelectedFormat(format)}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-7" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 space-y-0.5">
                          <span className="block text-sm font-semibold leading-4 text-foreground">
                            {format}
                          </span>
                          <span className="block text-xs font-medium leading-4 text-foreground">
                            {title}
                          </span>
                          <span className="block text-[11px] font-normal leading-3 text-muted-foreground">
                            {description}
                          </span>
                        </span>
                      </Button>
                    )
                  })}
                </div>

                {selectedFormat === "EPUB" && hasBands && (
                  <Alert className="bg-muted/50">
                    <Info className="size-4" />
                    <AlertDescription>
                      En EPUB el encabezado y el pie de página no se aplican;
                      sólo se aproximan los márgenes.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="page" className="space-y-4 pt-2">
                {settingsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
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
                      <legend className="mb-2 text-[13px] font-semibold text-foreground">
                        Márgenes (cm)
                      </legend>
                      <div className="grid grid-cols-2 gap-2.5">
                        {marginFields.map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <label
                              htmlFor={`export-margin-${key}`}
                              className="text-xs font-medium text-foreground"
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

                    <p className="text-[11px] leading-4 text-muted-foreground">
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

        <DialogFooter className="m-0 flex-row justify-end gap-2 rounded-none border-t border-border bg-muted/30 px-3.5 py-3">
          {error && job && (
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          {!isHistoricalVersion && (
            <Button
              type="button"
              size="sm"
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
