"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAnalyticsDashboard,
  upsertWritingGoal,
} from "@/services/analytics.service";
import type {
  AnalyticsDashboard,
  WordCountBook,
  WritingGoal,
  WritingGoalType,
} from "@/types/analytics";

const REFRESH_INTERVAL_MS = 15_000;
const numberFormatter = new Intl.NumberFormat("es-ES");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatMinutes(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLongDate(value: string | null) {
  if (!value) return "Aún no hay suficiente actividad";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

function ActivityChart({
  data,
}: {
  data: AnalyticsDashboard["dailyActivity"];
}) {
  const maximum = Math.max(1, ...data.map((item) => item.words));

  return (
    <div className="flex h-56 items-end gap-2 pt-6 sm:gap-4">
      {data.map((item) => {
        const height = item.words
          ? Math.max(8, (item.words / maximum) * 100)
          : 2;
        return (
          <div
            key={item.date}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {item.words ? formatNumber(item.words) : "—"}
            </span>
            <div className="flex h-36 w-full items-end justify-center rounded-lg bg-secondary/50 px-1">
              <div
                className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-primary to-purple-400 transition-[height] duration-500"
                style={{ height: `${height}%` }}
                title={`${formatNumber(item.words)} palabras · ${formatMinutes(item.durationSecs)}`}
              />
            </div>
            <span className="truncate text-[11px] text-muted-foreground">
              {formatShortDate(item.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GoalEditor({
  projectId,
  type,
  goal,
  onSaved,
}: {
  projectId: string;
  type: WritingGoalType;
  goal?: WritingGoal;
  onSaved: () => Promise<void>;
}) {
  const [target, setTarget] = useState(String(goal?.targetWords ?? ""));
  const [deadline, setDeadline] = useState(
    goal?.deadline ? goal.deadline.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const label = type === "DAILY" ? "Meta diaria" : "Meta semanal";
  const placeholder = type === "DAILY" ? "500" : "3500";

  const handleSave = async () => {
    const parsedTarget = Number(target);
    if (!Number.isInteger(parsedTarget) || parsedTarget < 1) {
      setMessage("Ingresá una cantidad válida de palabras.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await upsertWritingGoal(projectId, type, {
        targetWords: parsedTarget,
        ...(deadline
          ? { deadline: new Date(`${deadline}T12:00:00`).toISOString() }
          : {}),
      });
      await onSaved();
      setMessage("Meta guardada");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar la meta",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {goal
              ? `${formatNumber(goal.currentWords)} de ${formatNumber(goal.targetWords)} palabras`
              : "Todavía no configurada"}
          </p>
        </div>
        {goal ? (
          <Badge variant="secondary">{goal.progressPercent}%</Badge>
        ) : null}
      </div>
      {goal ? <ProgressBar value={goal.progressPercent} /> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`${type}-target`}>Palabras</Label>
          <Input
            id={`${type}-target`}
            type="number"
            min={1}
            max={1_000_000}
            placeholder={placeholder}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${type}-deadline`}>Fecha objetivo</Label>
          <Input
            id={`${type}-deadline`}
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Guardar
        </Button>
      </div>
      {message ? (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

function WordCountTree({ books }: { books: WordCountBook[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(books.slice(0, 1).map((book) => book.id)),
  );

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!books.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        El proyecto todavía no tiene libros.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {books.map((book) => {
        const bookOpen = expanded.has(book.id);
        return (
          <div key={book.id} className="overflow-hidden rounded-xl border">
            <button
              type="button"
              className="flex w-full items-center gap-3 bg-secondary/40 px-4 py-3 text-left hover:bg-secondary/70"
              onClick={() => toggle(book.id)}
            >
              {bookOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <BookOpen className="size-4 text-primary" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {book.title}
              </span>
              <span className="text-sm font-semibold">
                {formatNumber(book.wordCount)}
              </span>
            </button>
            {bookOpen ? (
              <div className="divide-y">
                {book.chapters.map((chapter) => (
                  <div key={chapter.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-medium">
                      <span className="truncate">{chapter.title}</span>
                      <span>{formatNumber(chapter.wordCount)}</span>
                    </div>
                    <div className="mt-2 space-y-1 border-l pl-4">
                      {chapter.scenes.map((scene) => (
                        <div
                          key={scene.id}
                          className="flex items-center justify-between gap-3 py-1 text-xs text-muted-foreground"
                        >
                          <span className="truncate">{scene.title}</span>
                          <span>{formatNumber(scene.wordCount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function StatisticsDashboard({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (signal?: AbortSignal, silent = false) => {
      if (silent) setRefreshing(true);
      try {
        const data = await getAnalyticsDashboard(projectId, { signal });
        setDashboard(data);
        setError(null);
      } catch (loadError) {
        if (signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar las estadísticas",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [projectId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    const intervalId = window.setInterval(
      () => void loadDashboard(controller.signal, true),
      REFRESH_INTERVAL_MS,
    );
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [loadDashboard]);

  const goals = useMemo(
    () => new Map(dashboard?.goals.map((goal) => [goal.goalType, goal]) ?? []),
    [dashboard?.goals],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary p-2.5 text-primary-foreground">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Estadísticas de escritura
                </h1>
                <p className="text-sm text-muted-foreground">
                  {dashboard?.project.title ??
                    "Productividad y avance del proyecto"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Actualización automática
            </Badge>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Actualizar estadísticas"
              onClick={() => void loadDashboard(undefined, true)}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <DashboardSkeleton />
        ) : dashboard ? (
          <div className="space-y-6">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#32134a] via-[#5e2b7c] to-[#8146a3] p-6 text-white ring-0 sm:p-8">
              <Sparkles className="absolute -right-5 -top-6 size-32 text-white/5" />
              <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-sm font-medium text-white/70">
                    Avance total del manuscrito
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                    <p className="text-4xl font-semibold tracking-tight">
                      {formatNumber(dashboard.project.wordCount)}
                    </p>
                    <p className="pb-1 text-sm text-white/65">
                      {dashboard.project.wordCountTarget
                        ? `de ${formatNumber(dashboard.project.wordCountTarget)} palabras`
                        : "palabras escritas"}
                    </p>
                  </div>
                  {dashboard.project.progressPercent !== null ? (
                    <div className="mt-5 max-w-2xl">
                      <div className="mb-2 flex justify-between text-xs text-white/70">
                        <span>Progreso</span>
                        <span>{dashboard.project.progressPercent}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{
                            width: `${dashboard.project.progressPercent}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-xl bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/65">
                    <CalendarCheck2 className="size-4" /> Finalización estimada
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatLongDate(dashboard.summary.estimatedCompletionDate)}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Ritmo medio:{" "}
                    {formatNumber(dashboard.summary.averageDailyWords)} palabras
                    por día activo
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={TrendingUp}
                label="Hoy"
                value={formatNumber(dashboard.summary.todayWords)}
                detail={`${formatNumber(dashboard.summary.weekWords)} palabras esta semana`}
              />
              <SummaryCard
                icon={Flame}
                label="Racha actual"
                value={`${dashboard.summary.currentStreak} días`}
                detail={`Mejor racha: ${dashboard.summary.bestStreak} días`}
              />
              <SummaryCard
                icon={Gauge}
                label="Velocidad media"
                value={`${dashboard.summary.averageWpm} ppm`}
                detail="Promedio de todas tus sesiones"
              />
              <SummaryCard
                icon={Target}
                label="Ritmo diario"
                value={formatNumber(dashboard.summary.averageDailyWords)}
                detail="Promedio de los últimos 30 días activos"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Actividad de los últimos 7 días</CardTitle>
                  <CardDescription>Palabras producidas por día</CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityChart data={dashboard.dailyActivity} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Metas personales</CardTitle>
                  <CardDescription>
                    Definí objetivos sostenibles para consolidar tu hábito.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GoalEditor
                    projectId={projectId}
                    type="DAILY"
                    goal={goals.get("DAILY")}
                    onSaved={() => loadDashboard(undefined, true)}
                  />
                  <GoalEditor
                    projectId={projectId}
                    type="WEEKLY"
                    goal={goals.get("WEEKLY")}
                    onSaved={() => loadDashboard(undefined, true)}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Recuento por estructura</CardTitle>
                  <CardDescription>
                    Libro, capítulo y escena con datos del último guardado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WordCountTree books={dashboard.hierarchy} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sesiones recientes</CardTitle>
                  <CardDescription>
                    Duración, producción neta y velocidad de escritura.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.recentSessions.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Escena</TableHead>
                          <TableHead>Inicio</TableHead>
                          <TableHead>Duración</TableHead>
                          <TableHead className="text-right">Palabras</TableHead>
                          <TableHead className="text-right">PPM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.recentSessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell className="max-w-44 truncate font-medium">
                              {session.sceneTitle}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDateTime(session.startedAt)}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="size-3.5 text-muted-foreground" />
                                {formatMinutes(session.durationSecs)}
                              </span>
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${session.wordsNet < 0 ? "text-destructive" : "text-emerald-700"}`}
                            >
                              {session.wordsNet > 0 ? "+" : ""}
                              {formatNumber(session.wordsNet)}
                            </TableCell>
                            <TableCell className="text-right">
                              {Math.round(session.avgWpm)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-12 text-center">
                      <Clock3 className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">
                        Aún no hay sesiones registradas
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Empezá a escribir y guardá una escena para ver tu
                        actividad.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
