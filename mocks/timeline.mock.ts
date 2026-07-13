export type TimelineImpact = "high" | "medium" | "low"

export type TimelineEvent = {
  id: string
  date: string
  temporalLabel: string
  title: string
  description: string
  entityIds: string[]
  arc: string
  impact: TimelineImpact
}

export const timelineEventsMock: TimelineEvent[] = [
  {
    id: "tomas-disappearance",
    date: "1847-03-15",
    temporalLabel: "Primavera de 1847",
    title: "Desaparición de Tomás Reyes",
    description:
      "Tomás Reyes desaparece misteriosamente dejando solo una nota críptica.",
    entityIds: ["tomas-reyes", "libreria-vertice"],
    arc: "El Despertar",
    impact: "high",
  },
  {
    id: "first-clue",
    date: "1847-03-22",
    temporalLabel: "Una semana después",
    title: "Maren encuentra la primera pista",
    description:
      "Maren descubre un manuscrito escondido en la Librería Vértice.",
    entityIds: ["maren-solis", "libreria-vertice"],
    arc: "El Despertar",
    impact: "medium",
  },
  {
    id: "codex-revelation",
    date: "1847-04-18",
    temporalLabel: "Abril de 1847",
    title: "Revelación del Códice",
    description:
      "El Códice Carmesí revela inscripciones que conectan con la desaparición.",
    entityIds: ["maren-solis", "archivo-municipal"],
    arc: "El Despertar",
    impact: "high",
  },
  {
    id: "alliance",
    date: "1847-05-04",
    temporalLabel: "Mayo de 1847",
    title: "Una alianza inesperada",
    description:
      "Maren y Gabriel acuerdan investigar juntos el origen del Códice.",
    entityIds: ["maren-solis", "gabriel-ortega", "archivo-municipal"],
    arc: "El Despertar",
    impact: "low",
  },
]
