
import {type SidebarBook } from "@/components/left-sidebar"

export const projectMock: SidebarBook[] = [
  {
    id: "1",
    title: "La Sombra del Abismo",
    subtitle: "Novela · Draft v2.3",
    parts: [
      {
        id: "part1",
        title: "Parte I: El Despertar",
        chapters: [
          { id: "ch1", title: "La Ciudad Que Olvidó", wordCount: 3240 },
          { id: "ch2", title: "El Último Testigo", wordCount: 2890 },
          { id: "ch3", title: "Cenizas y Sal", wordCount: 1847 },
        ],
      },
    ],
  },
];