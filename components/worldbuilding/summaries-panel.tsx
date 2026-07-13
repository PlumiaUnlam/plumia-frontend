"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Album,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Copy,
  FileText,
  Hash,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateChapterSummary,
  getChapterSummary,
  getSummaryJob,
  type SummaryResponse,
} from "@/services/worldbuilding.service";

export type SummaryChapter = {
  id: string;
  title: string;
  wordCount: number;
};

type SummariesPanelProps = {
  chapters: SummaryChapter[];
  loading: boolean;
  error?: Error;
};

type SummaryView = {
  text: string;
  generatedAt: string;
  model: string;
  isDirty: boolean;
};

const SUMMARY_JOB_POLL_MS = 1500;
const SUMMARY_JOB_TIMEOUT_MS = 120000;

function toSummaryView(summary: SummaryResponse): SummaryView {
  return {
    text: summary.content,
    generatedAt: summary.updatedAt,
    model: summary.model ?? summary.provider ?? "PlumIA",
    isDirty: summary.isDirty,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForSummaryJob(jobId: string) {
  const deadline = Date.now() + SUMMARY_JOB_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const job = await getSummaryJob(jobId);

    if (job.status === "COMPLETED") return;
    if (job.status === "FAILED") {
      throw new Error(job.errorMessage ?? "No se pudo generar el resumen");
    }

    await wait(SUMMARY_JOB_POLL_MS);
  }

  throw new Error("El resumen sigue en proceso. Intentalo nuevamente en unos minutos.");
}

export function SummariesPanel({
  chapters,
  loading,
  error,
}: SummariesPanelProps) {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Record<string, SummaryView>>({});
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const activeChapter =
    chapters.find((chapter) => chapter.id === activeChapterId) ?? null;
  const activeSummary = activeChapter ? summaries[activeChapter.id] : null;
  const withSummary = useMemo(
    () => chapters.filter((chapter) => summaries[chapter.id]).length,
    [chapters, summaries],
  );
  const pendingCount = useMemo(
    () =>
      chapters.filter(
        (chapter) => !summaries[chapter.id] && !generatingIds.has(chapter.id),
      ).length,
    [chapters, generatingIds, summaries],
  );

  useEffect(() => {
    if (loading || error || chapters.length === 0) return;

    let cancelled = false;

    async function loadSummaries() {
      const results = await Promise.all(
        chapters.map(async (chapter) => ({
          chapterId: chapter.id,
          summary: await getChapterSummary(chapter.id),
        })),
      );

      if (cancelled) return;

      setSummaries((current) => {
        const next = { ...current };
        results.forEach(({ chapterId, summary }) => {
          if (summary) {
            next[chapterId] = toSummaryView(summary);
          } else {
            delete next[chapterId];
          }
        });
        return next;
      });
    }

    void loadSummaries().catch((loadError: unknown) => {
      if (!cancelled) {
        setSummaryError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los resúmenes.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chapters, error, loading]);

  const handleGenerate = async (chapter: SummaryChapter) => {
    setSummaryError(null);
    setGeneratingIds((current) => new Set(current).add(chapter.id));
    setActiveChapterId(chapter.id);

    try {
      const job = await generateChapterSummary(chapter.id);
      if (job.status !== "COMPLETED") {
        await waitForSummaryJob(job.id);
      }
      const summary = await getChapterSummary(chapter.id);
      if (!summary) {
        throw new Error("El backend no devolvió el resumen generado.");
      }
      setSummaries((current) => ({
        ...current,
        [chapter.id]: toSummaryView(summary),
      }));
    } catch (generateError) {
      setSummaryError(
        generateError instanceof Error
          ? generateError.message
          : "No se pudo generar el resumen.",
      );
    } finally {
      setGeneratingIds((current) => {
        const next = new Set(current);
        next.delete(chapter.id);
        return next;
      });
    }
  };

  const handleRegenerate = async (chapter: SummaryChapter) => {
    await handleGenerate(chapter);
  };

  const handleGenerateAll = () => {
    chapters
      .filter(
        (chapter) =>
          !summaries[chapter.id] && !generatingIds.has(chapter.id),
      )
      .forEach((chapter, index) => {
        window.setTimeout(() => void handleGenerate(chapter), index * 250);
      });
  };

  const handleCopySummary = async (summary: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = summary;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/30">
        <div className="space-y-3 border-b border-border bg-card/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <BookOpen className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">
                CAPÍTULOS
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>
                {withSummary} / {chapters.length} con resumen
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
            disabled={loading || !!error || pendingCount === 0}
            onClick={handleGenerateAll}
          >
            <Wand2 className="size-3.5" />
            Generar {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1 p-3">
          <div className="min-w-0 space-y-1.5">
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <Skeleton className="mt-0.5 size-4 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}

            {!loading &&
              !error &&
              chapters.map((chapter, index) => {
                const isActive = activeChapterId === chapter.id;
                const isGenerating = generatingIds.has(chapter.id);
                const hasSummary = !!summaries[chapter.id];

                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => setActiveChapterId(chapter.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${isActive
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/20 hover:bg-card/80"
                      }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {isGenerating ? (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        ) : hasSummary ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Cap. {index + 1}
                          </span>
                          {hasSummary && !isGenerating && (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                              Generado
                            </span>
                          )}
                          {isGenerating && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Generando...
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm font-medium leading-tight text-foreground">
                          {chapter.title}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash className="size-3 text-muted-foreground/60" />
                          <span>
                            {chapter.wordCount.toLocaleString()} palabras
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

            {!loading && error && (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No se pudieron cargar los capítulos.
              </div>
            )}

            {!loading && !error && chapters.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No hay capítulos disponibles.
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
        {activeChapter ? (
          <div className="flex min-h-full flex-col">
            <div className="shrink-0 border-b border-border bg-card/30 px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <BookOpen className="size-3.5 text-primary/70" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                      Capítulo{" "}
                      {chapters.findIndex(
                        (chapter) => chapter.id === activeChapter.id,
                      ) + 1}
                    </span>
                  </div>
                  <h2 className="truncate text-xl font-semibold text-foreground">
                    {activeChapter.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {activeChapter.wordCount.toLocaleString()} palabras
                    </span>
                    {activeSummary && (
                      <>
                        <span>·</span>
                        <span>
                          Generado el{" "}
                          {new Date(activeSummary.generatedAt).toLocaleDateString(
                            "es-ES",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </span>
                        <span>·</span>
                        <span>{activeSummary.model}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {activeSummary && !generatingIds.has(activeChapter.id) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopySummary(activeSummary.text)}
                      >
                        <Copy className="size-3.5" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleRegenerate(activeChapter)}
                      >
                        <RefreshCw className="size-3.5" />
                        Regenerar
                      </Button>
                    </>
                  )}
                  {!activeSummary && !generatingIds.has(activeChapter.id) && (
                    <Button
                      size="sm"
                      onClick={() => void handleGenerate(activeChapter)}
                    >
                      <Sparkles className="size-3.5" />
                      Generar resumen
                    </Button>
                  )}
                  {generatingIds.has(activeChapter.id) && (
                    <div className="flex h-9 items-center gap-2 rounded-lg bg-primary/10 px-4 text-sm font-medium text-primary">
                      <Loader2 className="size-3.5 animate-spin" />
                      Generando...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 px-8 py-8">
              {generatingIds.has(activeChapter.id) ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                  <div className="relative">
                    <div className="size-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    <Sparkles className="absolute inset-0 m-auto size-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">
                      Analizando el capítulo...
                    </p>
                    <p className="mt-1 text-sm">
                      PlumIA está leyendo y sintetizando el texto
                    </p>
                  </div>
                </div>
              ) : activeSummary ? (
                <div className="w-full space-y-6">
                  {summaryError && (
                    <Alert className="border-destructive/20 bg-destructive/5 text-muted-foreground">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <AlertDescription className="text-xs leading-relaxed">
                        {summaryError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Card className="w-full shadow-sm">
                    <CardHeader className="border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Resumen automático
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[15px] leading-relaxed text-foreground">
                        {activeSummary.text}
                      </p>
                    </CardContent>
                  </Card>

                  {activeSummary.isDirty && (
                    <Alert className="border-amber-500/20 bg-amber-500/5 text-muted-foreground">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <AlertDescription className="text-xs leading-relaxed">
                        Si has editado el capítulo desde que se generó este
                        resumen, usa{" "}
                        <strong className="text-foreground">Regenerar</strong>{" "}
                        para actualizarlo con los cambios más recientes.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-primary opacity-70">
                  {summaryError && (
                    <Alert className="mb-4 max-w-md border-destructive/20 bg-destructive/5 text-muted-foreground opacity-100">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <AlertDescription className="text-xs leading-relaxed">
                        {summaryError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <FileText size={48} />
                  <h2 className="text-lg font-semibold">
                    Sin resumen todavía
                  </h2>
                  <p className="text-center">
                    PlumIA leerá el capítulo y generará una sintesis concisa de la trama y de los personajes
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-80 flex-col items-center justify-center gap-2 text-center text-primary opacity-70">
            <Album size={48} />
            <h2 className="text-lg font-semibold">Selecciona un capítulo</h2>
            <p>
              Haz click en cualquier capítulo de la lista para ver su resumen.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
