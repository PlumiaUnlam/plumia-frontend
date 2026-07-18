
import type { Entity } from "@/types/entity"

const mockTimestamp = "2026-07-13T00:00:00.000Z"

export const worldbuildingEntitiesMock: Entity[] = [
  {
    id: "tomas-reyes",
    canonicalName: "Tomás Reyes",
    type: "CHARACTER",
    description: "Librero desaparecido que dejó una nota críptica.",
    aliases: [],
    imageUrl: null,
    projectId: "mock-project",
    isActive: true,
    attributes: {},
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: "maren-solis",
    canonicalName: "Maren Solís",
    type: "CHARACTER",
    description: "Investigadora que sigue las pistas del Códice Carmesí.",
    aliases: [],
    imageUrl: null,
    projectId: "mock-project",
    isActive: true,
    attributes: {},
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: "gabriel-ortega",
    canonicalName: "Gabriel Ortega",
    type: "CHARACTER",
    description: "Rival de Maren y experto en manuscritos antiguos.",
    aliases: [],
    imageUrl: null,
    projectId: "mock-project",
    isActive: true,
    attributes: {},
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: "libreria-vertice",
    canonicalName: "Librería Vértice",
    type: "LOCATION",
    description: "Librería antigua donde comenzó la investigación.",
    aliases: [],
    imageUrl: null,
    projectId: "mock-project",
    isActive: true,
    attributes: {},
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: "archivo-municipal",
    canonicalName: "Archivo Municipal",
    type: "LOCATION",
    description: "Archivo histórico que conserva las inscripciones del Códice.",
    aliases: [],
    imageUrl: null,
    projectId: "mock-project",
    isActive: true,
    attributes: {},
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
]

export const summarymock= [
  {
    id: "1",
    summary: "Resumen generado automáticamente...\n\nEste es un ejemplo de resumen. La IA analizaría los capítulos seleccionados y generaría un resumen coherente...",
  },
];
