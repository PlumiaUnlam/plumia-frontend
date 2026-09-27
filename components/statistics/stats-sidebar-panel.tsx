"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Flame,
  Gauge,
  LoaderCircle,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { getAnalyticsDashboard } from "@/services/analytics.service";
import type { WritingGoal, WritingGoalType } from "@/types/analytics";

const REFRESH_INTERVAL_MS = 15_000;
const numberFormatter = new Intl.NumberFormat("es-ES");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-secondary"
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

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        <p className="text-[10px] font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-2 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function GoalSummary({
  type,
  goal,
}: {
  type: WritingGoalType;
  goal?: WritingGoal;
}) {
  const label = type === "DAILY" ? "Meta diaria" : "Meta semanal";

  return (
    <div className="space-y-2 rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{label}</p>
        <span className="text-[11px] font-semibold text-primary">
          {goal ? `${goal.progressPercent}%` : "Sin definir"}
        </span>
      </div>
      {goal ? (
        <>
          <ProgressBar value={goal.progressPercent} />
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(goal.currentWords)} de {formatNumber(goal.targetWords)} palabras
          </p>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Configurala desde el panel completo.
        </p>
      )}
    </div>
  );
}

function StatsSidebarSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-label="Cargando estadísticas">
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function StatsSidebarPanel({ projectId }: { projectId: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    projectId ? `analytics-sidebar:${projectId}` : null,
    () => getAnalyticsDashboard(projectId),
    { refreshInterval: REFRESH_INTERVAL_MS },
  );

  if (isLoading && !data) return <StatsSidebarSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Target className="size-8 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium">No pudimos cargar tus estadísticas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Revisá la conexión e intentá nuevamente.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void mutate()}>
          <RefreshCw />
          Reintentar
        </Button>
      </div>
    );
  }

  const goals = new Map(data.goals.map((goal) => [goal.goalType, goal]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Resumen de escritura</p>
          <p className="text-[11px] text-muted-foreground">{data.project.title}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Actualizar estadísticas"
          onClick={() => void mutate()}
          disabled={isValidating}
        >
          {isValidating ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="rounded-xl bg-gradient-to-br from-[#32134a] via-[#5e2b7c] to-[#8146a3] p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/65">
                Avance del proyecto
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {formatNumber(data.project.wordCount)}
              </p>
              <p className="text-[11px] text-white/65">
                {data.project.wordCountTarget
                  ? `de ${formatNumber(data.project.wordCountTarget)} palabras`
                  : "palabras escritas"}
              </p>
            </div>
            {data.project.progressPercent !== null ? (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
                {data.project.progressPercent}%
              </span>
            ) : null}
          </div>
          {data.project.progressPercent !== null ? (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-500"
                style={{ width: `${data.project.progressPercent}%` }}
              />
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-2" aria-label="Métricas principales">
          <Metric
            icon={TrendingUp}
            label="Hoy"
            value={formatNumber(data.summary.todayWords)}
          />
          <Metric
            icon={CalendarDays}
            label="Semana"
            value={formatNumber(data.summary.weekWords)}
          />
          <Metric
            icon={Flame}
            label="Racha"
            value={`${data.summary.currentStreak} días`}
          />
          <Metric
            icon={Gauge}
            label="Ritmo diario"
            value={formatNumber(data.summary.averageDailyWords)}
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mis metas
            </h3>
          </div>
          <GoalSummary type="DAILY" goal={goals.get("DAILY")} />
          <GoalSummary type="WEEKLY" goal={goals.get("WEEKLY")} />
        </section>
      </div>

      <div className="border-t p-3">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/projects/${projectId}/statistics`}>
            Ver estadísticas completas
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
