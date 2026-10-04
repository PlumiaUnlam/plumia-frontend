"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  Gauge,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function parseDateInput(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T12:00:00`);
}

function DeadlineDatePicker({
  id,
  value,
  onChange,
}: Readonly<{
  id: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateInput(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-between px-3 font-normal"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })
              : "Seleccionar fecha"}
          </span>
          <CalendarDays className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          locale={es}
          autoFocus
        />
        {value ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <X />
              Quitar fecha
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function getRefreshIconClass(refreshing: boolean) {
  if (refreshing) return "animate-spin"
  return ""
}

function getWordTargetLabel(target: number | null) {
  if (!target) return "palabras escritas"
  return `de ${formatNumber(target)} palabras`
}

function ProjectProgress({
  progressPercent,
}: Readonly<{ progressPercent: number | null }>) {
  if (progressPercent === null) return null

  return (
    <div className="mt-5 max-w-2xl">
      <div className="mb-2 flex justify-between text-xs text-white/70">
        <span>Progreso</span>
        <span>{progressPercent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

function ProgressBar({ value }: Readonly<{ value: number }>) {
  return (
    <progress
      className="block h-2.5 w-full appearance-none overflow-hidden rounded-full bg-secondary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
      value={Math.min(100, Math.max(0, value))}
      max={100}
      aria-label="Progreso de escritura"
    />
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: Readonly<{
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
}>) {
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
}: Readonly<{
  data: AnalyticsDashboard["dailyActivity"];
}>) {
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

function GoalCard({
  type,
  goal,
}: Readonly<{
  type: WritingGoalType;
  goal?: WritingGoal;
}>) {
  const label = type === "DAILY" ? "Meta diaria" : "Meta semanal";
  const period = type === "DAILY" ? "Cada día" : "Cada semana";

  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <Target className="size-4" />
          </span>
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{period}</p>
          </div>
        </div>
        {goal ? (
          <Badge variant="secondary">{goal.progressPercent}%</Badge>
        ) : (
          <Badge variant="outline">Sin configurar</Badge>
        )}
      </div>
      {goal ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold tracking-tight">
              {formatNumber(goal.currentWords)}
            </p>
            <p className="pb-0.5 text-xs text-muted-foreground">
              de {formatNumber(goal.targetWords)} palabras
            </p>
          </div>
          <ProgressBar value={goal.progressPercent} />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {goal.deadline
              ? `Fecha objetivo: ${formatLongDate(goal.deadline)}`
              : "Sin fecha objetivo"}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Definí una cantidad de palabras para empezar a medir tu avance.
        </p>
      )}
    </div>
  );
}

function GoalsDialog({
  onOpenChange,
  projectId,
  dailyGoal,
  weeklyGoal,
  onSaved,
}: Readonly<{
  onOpenChange: (open: boolean) => void;
  projectId: string;
  dailyGoal?: WritingGoal;
  weeklyGoal?: WritingGoal;
  onSaved: () => Promise<void>;
}>) {
  const [dailyTarget, setDailyTarget] = useState(
    String(dailyGoal?.targetWords ?? ""),
  );
  const [dailyDeadline, setDailyDeadline] = useState(
    dailyGoal?.deadline?.slice(0, 10) ?? "",
  );
  const [weeklyTarget, setWeeklyTarget] = useState(
    String(weeklyGoal?.targetWords ?? ""),
  );
  const [weeklyDeadline, setWeeklyDeadline] = useState(
    weeklyGoal?.deadline?.slice(0, 10) ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    const entries = [
      {
        type: "DAILY" as const,
        target: dailyTarget,
        deadline: dailyDeadline,
      },
      {
        type: "WEEKLY" as const,
        target: weeklyTarget,
        deadline: weeklyDeadline,
      },
    ].filter((entry) => entry.target.trim());

    if (!entries.length) {
      setMessage("Definí al menos una meta para continuar.");
      return;
    }

    if (
      entries.some((entry) => {
        const value = Number(entry.target);
        return !Number.isInteger(value) || value < 1 || value > 1_000_000;
      })
    ) {
      setMessage("Ingresá cantidades válidas de entre 1 y 1.000.000 palabras.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await Promise.all(
        entries.map((entry) =>
          upsertWritingGoal(projectId, entry.type, {
            targetWords: Number(entry.target),
            ...(entry.deadline
              ? {
                  deadline: new Date(
                    `${entry.deadline}T12:00:00`,
                  ).toISOString(),
                }
              : {}),
          }),
        ),
      );
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudieron guardar las metas",
      );
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    {
      type: "daily",
      title: "Meta diaria",
      description: "La cantidad que querés escribir cada día.",
      placeholder: "500",
      target: dailyTarget,
      deadline: dailyDeadline,
      setTarget: setDailyTarget,
      setDeadline: setDailyDeadline,
    },
    {
      type: "weekly",
      title: "Meta semanal",
      description: "Tu objetivo acumulado de lunes a domingo.",
      placeholder: "3500",
      target: weeklyTarget,
      deadline: weeklyDeadline,
      setTarget: setWeeklyTarget,
      setDeadline: setWeeklyDeadline,
    },
  ];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Definir metas de escritura</DialogTitle>
          <DialogDescription>
            Configurá una o ambas metas. Podés volver a editarlas cuando cambie
            tu ritmo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.type} className="rounded-xl border bg-background p-4">
              <div className="mb-4">
                <p className="font-medium">{field.title}</p>
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`${field.type}-target`}>Palabras</Label>
                  <Input
                    id={`${field.type}-target`}
                    type="number"
                    min={1}
                    max={1_000_000}
                    placeholder={field.placeholder}
                    value={field.target}
                    onChange={(event) => field.setTarget(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${field.type}-deadline`}>
                    Fecha objetivo <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <DeadlineDatePicker
                    id={`${field.type}-deadline`}
                    value={field.deadline}
                    onChange={field.setDeadline}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar metas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WordCountTree({ books }: Readonly<{ books: WordCountBook[] }>) {
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

export function StatisticsDashboard({ projectId }: Readonly<{ projectId: string }>) {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);

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
    const initialLoadId = window.setTimeout(
      () => void loadDashboard(controller.signal),
      0,
    );
    const intervalId = window.setInterval(
      () => void loadDashboard(controller.signal, true),
      REFRESH_INTERVAL_MS,
    );
    return () => {
      controller.abort();
      window.clearTimeout(initialLoadId);
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
            <Button
              onClick={() => setGoalsDialogOpen(true)}
              disabled={loading || !dashboard}
            >
              <Pencil />
              Definir metas
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Actualizar estadísticas"
              onClick={() => void loadDashboard(undefined, true)}
              disabled={refreshing}
            >
              <RefreshCw className={getRefreshIconClass(refreshing)} />
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
                      {getWordTargetLabel(dashboard.project.wordCountTarget)}
                    </p>
                  </div>
                  <ProjectProgress
                    progressPercent={dashboard.project.progressPercent}
                  />
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
                  <CardTitle>Mis metas</CardTitle>
                  <CardDescription>
                    Tu avance diario y semanal en un solo lugar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GoalCard type="DAILY" goal={goals.get("DAILY")} />
                  <GoalCard type="WEEKLY" goal={goals.get("WEEKLY")} />
                </CardContent>
              </Card>
            </div>

            {goalsDialogOpen ? (
              <GoalsDialog
                onOpenChange={setGoalsDialogOpen}
                projectId={projectId}
                dailyGoal={goals.get("DAILY")}
                weeklyGoal={goals.get("WEEKLY")}
                onSaved={() => loadDashboard(undefined, true)}
              />
            ) : null}

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
