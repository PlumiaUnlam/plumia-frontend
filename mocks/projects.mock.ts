import { type SidebarBook } from "@/components/left-sidebar"

export const projectMock: SidebarBook[] = [
  {
    id: "1",
    title: "La Sombra del Abismo",
    sortKey: "001",
    chapters: [
      {
        id: "Capitulo 1",
        title: "Capitulo I: El Despertar",
        sortKey: "001",
        scenes: [
          { id: "ch1", title: "La Ciudad Que Olvido", sortKey: "001", order: 1, wordCount: 3240 },
          { id: "ch2", title: "El Ultimo Testigo", sortKey: "002", order: 2, wordCount: 2890 },
          { id: "ch3", title: "Cenizas y Sal", sortKey: "003", order: 3, wordCount: 1847 },
          { id: "ch4", title: "La Ciudad Que Olvido", sortKey: "004", order: 4, wordCount: 3240 },
          { id: "ch5", title: "El Ultimo Testigo", sortKey: "005", order: 5, wordCount: 2890 },
          { id: "ch6", title: "Cenizas y Sal", sortKey: "006", order: 6, wordCount: 1847 },
          { id: "ch7", title: "La Ciudad Que Olvido", sortKey: "007", order: 7, wordCount: 3240 },
          { id: "ch8", title: "El Ultimo Testigo", sortKey: "008", order: 8, wordCount: 2890 },
          { id: "ch9", title: "Cenizas y Sal", sortKey: "009", order: 9, wordCount: 1847 },
        ],
      },
    ],
  },
]
