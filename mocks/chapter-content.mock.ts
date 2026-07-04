import type { ChapterDocument } from "@/types/chapter"

/**
 * Capa de persistencia falsa para el contenido de los capítulos.
 * Simula la tabla/colección que el backend expondrá vía `GET/PUT /api/chapters/:id`.
 * Mutado en memoria durante la sesión por `services/chapter.service.ts`.
 */
function paragraph(text: string) {
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  }
}

function doc(...paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map(paragraph),
  }
}

export const chapterContentMock: Record<string, ChapterDocument> = {
  ch1: {
    id: "ch1",
    title: "La Ciudad Que Olvidó",
    content: doc(
      "   Lorem ipsum dolor sit amet consectetur adipiscing elit venenatis, sollicitudin aliquam lacus dapibus cursus sapien laoreet fermentum, habitant dictumst leo cum netus eleifend donec. Laoreet suscipit curae sagittis vitae cras pellentesque donec dapibus, at mauris vehicula ad mus duis velit posuere, eleifend himenaeos eu orci lacinia massa sollicitudin. Commodo nam quisque nisl eleifend at donec, scelerisque sagittis arcu massa platea, libero dui dignissim sociosqu quis.",
      "   Ec risus egestas primis nibh parturient suspendisse leo dignissim, rhoncus faucibus aliquam orci volutpat scelerisque et fringilla, inceptos vulputate quam mollis facilisi suscipit vitae. Ornare facilisis mollis dictumst pulvinar a, imperdiet vestibulum blandit. Nostra leo mauris aptent aenean rhoncus elementum potenti congue, tincidunt sem fermentum facilisis hac torquent habitasse.",
    ),
    updatedAt: new Date().toISOString(),
    hash: "",
  },
  ch2: {
    id: "ch2",
    title: "El Último Testigo",
    content: doc(
      "   Ec risus egestas primis nibh parturient suspendisse leo dignissim, rhoncus faucibus aliquam orci volutpat scelerisque et fringilla, inceptos vulputate quam mollis facilisi suscipit vitae. Ornare facilisis mollis dictumst pulvinar a, imperdiet vestibulum blandit. Nostra leo mauris aptent aenean rhoncus elementum potenti congue, tincidunt sem fermentum facilisis hac torquent habitasse.",
      "   Lorem ipsum dolor sit amet consectetur adipiscing elit venenatis, sollicitudin aliquam lacus dapibus cursus sapien laoreet fermentum, habitant dictumst leo cum netus eleifend donec. Laoreet suscipit curae sagittis vitae cras pellentesque donec dapibus, at mauris vehicula ad mus duis velit posuere, eleifend himenaeos eu orci lacinia massa sollicitudin. Commodo nam quisque nisl eleifend at donec, scelerisque sagittis arcu massa platea, libero dui dignissim sociosqu quis.",
    ),
    updatedAt: new Date().toISOString(),
    hash: "",
  },
  ch3: {
    id: "ch3",
    title: "Cenizas y Sal",
    content: doc(
      "   Feugiat est enim parturient justo sapien felis mollis tortor imperdiet, suscipit commodo id elementum molestie nullam netus. Eu vulputate ante urna pretium potenti mi fusce orci, cum eros bibendum himenaeos volutpat nec litora curae ad, torquent blandit tortor tellus pellentesque quam vehicula. Nulla ligula rutrum elementum aliquam placerat ridiculus nullam ut urna taciti, posuere tempus auctor aliquet consequat enim hac dignissim dis, sagittis scelerisque quisque malesuada integer arcu class parturient venenatis. Penatibus taciti risus aliquet facilisis pharetra phasellus egestas tellus faucibus erat scelerisque etiam aenean justo libero, quis ac malesuada curae ut commodo congue auctor bibendum habitasse ante potenti placerat.",
    ),
    updatedAt: new Date().toISOString(),
    hash: "",
  },
}
