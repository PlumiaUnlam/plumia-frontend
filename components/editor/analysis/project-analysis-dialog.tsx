"use client"

import { AlertCircle, CheckCircle2, Loader2, RotateCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useProjectAnalysis } from "@/hooks/use-project-analysis"

type ProjectAnalysisDialogProps = {
  analysis: ReturnType<typeof useProjectAnalysis>
}

const sceneStatusLabels: Record<string, string> = {
  QUEUED: "En espera",
  RUNNING: "Analizando",
  SUCCEEDED: "Completada",
  FAILED: "Fallida",
  NO_CHANGES: "Sin cambios",
}

const runStatusLabels: Record<string, string> = {
  QUEUED: "En espera",
  RUNNING: "En curso",
  SUCCEEDED: "Completado",
  PARTIAL: "Completado con errores",
  FAILED: "Fallido",
  NO_CHANGES: "Sin cambios",
}

export function ProjectAnalysisDialog({
  analysis,
}: Readonly<ProjectAnalysisDialogProps>) {
  const { preview, run } = analysis
  const isActive = run?.status === "QUEUED" || run?.status === "RUNNING"
  const canRetry = Boolean(run && run.failedScenes > 0 && !isActive)

  return (
    <Dialog open={analysis.open} onOpenChange={analysis.setOpen}>
      <DialogContent className="flex max-h-[min(88dvh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <DialogTitle>Analizar cambios del proyecto</DialogTitle>
          <DialogDescription>
            Se procesan en orden narrativo las escenas que tienen fragmentos pendientes. Las propuestas
            y alertas existentes se conservan y se actualizan según la evidencia vigente.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {analysis.error && (
            <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              {analysis.error}
            </div>
          )}
          {analysis.notice && (
            <output aria-live="polite" aria-atomic="true" className="block rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
              {analysis.notice}
            </output>
          )}
          <ProjectAnalysisRunProgress run={run} />
          <ProjectAnalysisPreviewContent
            loadingPreview={analysis.loadingPreview}
            preview={preview}
            run={run}
          />
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-between">
          <div className="flex gap-2">
            {canRetry && (
              <Button type="button" variant="outline" onClick={() => void analysis.retryFailed()} disabled={analysis.retrying}>
                {analysis.retrying ? <Loader2 className="animate-spin" /> : <RotateCw />}
                Reintentar fallidas
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => analysis.setOpen(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => void analysis.start()}
              disabled={analysis.starting || analysis.loadingPreview || !preview || isActive}
            >
              {analysis.starting ? <Loader2 className="animate-spin" /> : null}
              {getAnalysisStartLabel(isActive, preview?.chunkCount)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


type ProjectAnalysisRun = NonNullable<ReturnType<typeof useProjectAnalysis>["run"]>
type ProjectAnalysisPreview = NonNullable<ReturnType<typeof useProjectAnalysis>["preview"]>
type ProjectAnalysisScene =
  | ProjectAnalysisRun["scenes"][number]
  | ProjectAnalysisPreview["scenes"][number]

function ProjectAnalysisRunProgress({
  run,
}: Readonly<{ run: ReturnType<typeof useProjectAnalysis>["run"] }>) {
  if (!run) return null
  const percentage =
    run.totalScenes === 0
      ? 0
      : Math.round((run.processedScenes / run.totalScenes) * 100)

  return (
    <section className="space-y-2 rounded-lg border bg-muted/25 p-3" aria-label="Progreso del análisis del proyecto">
      <div className="flex items-center justify-between gap-3 text-sm">
        <output aria-live="polite" className="font-medium">
          {runStatusLabels[run.status] ?? run.status}
        </output>
        <span className="text-xs text-muted-foreground">
          {run.processedScenes} de {run.totalScenes} escenas
          {run.failedScenes > 0 ? ` · ${run.failedScenes} con error` : ""}
        </span>
      </div>
      <progress
        aria-label="Avance del análisis"
        max={100}
        value={percentage}
        className="h-2 w-full overflow-hidden rounded-full accent-primary"
      />
    </section>
  )
}

function ProjectAnalysisPreviewContent({
  loadingPreview,
  preview,
  run,
}: Readonly<{
  loadingPreview: boolean
  preview: ProjectAnalysisPreview | null
  run: ReturnType<typeof useProjectAnalysis>["run"]
}>) {
  if (loadingPreview) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Calculando los cambios pendientes…
      </div>
    )
  }
  if (!preview) return null

  return (
    <>
      <ProjectAnalysisSummary preview={preview} />
      <ProjectAnalysisSceneList preview={preview} run={run} />
    </>
  )
}

function ProjectAnalysisSummary({
  preview,
}: Readonly<{ preview: ProjectAnalysisPreview }>) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="Escenas" value={preview.sceneCount} />
        <SummaryCard label="Fragmentos" value={preview.chunkCount} />
        {preview.crossChunkAuditMode === "ADJACENT_CHUNKS" && (
          <SummaryCard label="Pares vecinos" value={preview.affectedAdjacentPairs} />
        )}
        {preview.crossChunkAuditMode === "SCENE_GROUPED" && (
          <SummaryCard label="Grupos de escena" value={preview.continuityGroupsToAnalyze} />
        )}
        {preview.crossChunkAuditMode === "PROJECT_SUMMARY" && (
          <SummaryCard label="Escenas de continuidad" value={preview.continuityScenesToRecalculate} />
        )}
        {preview.continuityCheckpointsToRecalculate > 0 && (
          <SummaryCard label="Resúmenes por recalcular" value={preview.continuityCheckpointsToRecalculate} />
        )}
      </div>
      {preview.crossChunkAuditMode === "DISABLED" && (
        <p className="rounded-lg border border-primary/15 bg-primary/[0.03] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          La comparación entre fragmentos está desactivada. Se mantiene la
          revisión de cada fragmento contra la Wiki y las reglas del mundo.
        </p>
      )}
    </>
  )
}

function ProjectAnalysisSceneList({
  preview,
  run,
}: Readonly<{
  preview: ProjectAnalysisPreview
  run: ReturnType<typeof useProjectAnalysis>["run"]
}>) {
  if (preview.sceneCount === 0) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
        No hay cambios pendientes para analizar.
      </div>
    )
  }

  const scenes = run?.scenes ?? preview.scenes
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Escenas que se analizarán</h3>
        <span className="text-xs text-muted-foreground">
          {run ? `${run.processedScenes} de ${run.totalScenes} procesadas` : "Vista previa"}
        </span>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {scenes.map((scene) => (
          <ProjectAnalysisSceneRow key={scene.id} scene={scene} />
        ))}
      </div>
    </section>
  )
}

function ProjectAnalysisSceneRow({
  scene,
}: Readonly<{ scene: ProjectAnalysisScene }>) {
  const runScene = "status" in scene ? scene : null
  const status = runScene?.status
  let chunkCount = 0
  if ("totalChunks" in scene) chunkCount = scene.totalChunks
  if ("pendingChunks" in scene) chunkCount = scene.pendingChunks

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{scene.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {scene.bookTitle} · {scene.chapterTitle} · {chunkCount} fragmentos
        </p>
        {runScene?.error && (
          <p className="mt-1 break-words text-xs text-destructive">{runScene.error}</p>
        )}
      </div>
      {status && (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {status === "RUNNING" && <Loader2 className="size-3 animate-spin" />}
          {status === "SUCCEEDED" && <CheckCircle2 className="size-3 text-emerald-600" />}
          {status === "FAILED" && <AlertCircle className="size-3 text-destructive" />}
          {sceneStatusLabels[status] ?? status}
        </span>
      )}
    </div>
  )
}

function getAnalysisStartLabel(
  isActive: boolean,
  chunkCount: number | undefined,
) {
  if (isActive) return "Análisis en curso"
  if (chunkCount === 0) return "Comprobar estado"
  return "Iniciar análisis"
}

function SummaryCard({
  label,
  value,
}: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border bg-muted/25 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
