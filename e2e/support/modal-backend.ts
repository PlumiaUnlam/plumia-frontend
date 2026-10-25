import type { Page, Route } from "@playwright/test"

import type { AuthorAnnotation } from "@/types/author-annotation"
import { installMockBackend, type MockBackend } from "./mock-backend"

/**
 * Backend simulado con estado para los tests de modales. Se apoya en
 * `installMockBackend` (login, escena, anotaciones…) y le suma lo que
 * necesitan los diálogos: editar y borrar proyectos, libros y capítulos,
 * versiones, tarjetas, arcos, invitaciones, exportaciones, metas y el
 * universo (entidades, relaciones, línea temporal).
 *
 * Cada pedido que modifica datos queda en `calls`, así cada test puede
 * comprobar qué se mandó (o que NO se mandó nada, al cancelar).
 */

export const projectId = "e2e-project"
export const bookId = "e2e-book"
export const chapterId = "e2e-chapter"
export const sceneId = "e2e-scene"
const ts = "2026-01-01T00:00:00.000Z"

export type RecordedCall = {
  method: string
  path: string
  query: string
  body: Record<string, unknown>
}

type Json = Record<string, unknown>

type Failure = {
  method: string
  pattern: RegExp
  status: number
  message: string
  once: boolean
}

export type ModalBackend = {
  /** Backend base (escena, anotaciones…): guardados de la escena, etc. */
  base: MockBackend
  calls: RecordedCall[]
  /** Pedidos que modifican datos y coinciden con método + ruta. */
  callsTo: (method: string, pattern: RegExp) => RecordedCall[]
  /** Hace que el libro tenga una portada (imagen de 1px) para probar «Quitar portada». */
  setCover: (hasCover: boolean) => void
  /** Demora (ms) para toda respuesta que modifica datos. */
  setMutationDelay: (ms: number) => void
  /** Hace que el próximo pedido que coincida falle con ese estado. */
  failNext: (
    method: string,
    pattern: RegExp,
    status?: number,
    message?: string,
  ) => void
}

const entityIds = {
  tomas: "tomas-reyes",
  maren: "maren-solis",
  gabriel: "gabriel-ortega",
}

function makeEntity(id: string, name: string, type: string) {
  return {
    id,
    canonicalName: name,
    type,
    description: `${name} en la historia.`,
    aliases: [],
    imageUrl: null,
    projectId,
    isActive: true,
    attributes: {},
    createdAt: ts,
    updatedAt: ts,
  }
}

function makeProject() {
  return {
    id: projectId,
    userId: "e2e-writer",
    title: "Crónicas del viento",
    description: "Novela de prueba",
    genre: "Fantasía",
    genreRules: { tone: "Aventura", audience: "Adulto" },
    wordCountTarget: 50_000,
    status: "En progreso",
    createdAt: ts,
    updatedAt: ts,
    books: [
      {
        id: bookId,
        title: "Libro I",
        sortKey: "001",
        chapters: [
          {
            id: chapterId,
            title: "Capítulo 1",
            sortKey: "001",
            scenes: [
              {
                id: sceneId,
                title: "El umbral",
                sortKey: "001",
                wordCount: 10,
                order: 1,
              },
            ],
          },
        ],
      },
    ],
  }
}

type Project = ReturnType<typeof makeProject>

function respond(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

export type ModalBackendOptions = {
  /** Agrega un segundo libro («Libro II») al proyecto. */
  secondBook?: boolean
  /** Anotaciones privadas iniciales de la escena. */
  authorAnnotations?: AuthorAnnotation[]
}

export async function installModalBackend(
  page: Page,
  options: ModalBackendOptions = {},
): Promise<ModalBackend> {
  const base = await installMockBackend(page, {
    authorAnnotations: options.authorAnnotations,
  })

  const project: Project = makeProject()
  if (options.secondBook) {
    project.books.push({
      id: "e2e-book-2",
      title: "Libro II",
      sortKey: "002",
      chapters: [],
    })
  }
  let projects: Project[] = [project]
  let versions: Json[] = []
  let cards: Json[] = [
    {
      id: "card-1",
      projectId,
      chapterId: null,
      title: "La carta bajo la puerta",
      description: "Una pista cambia el plan.",
      status: "ideas",
      tags: [],
      characters: [],
      entityIds: [],
      hasAudio: false,
      audioDurationSecs: null,
      sortKey: "000001",
      createdAt: ts,
      updatedAt: ts,
    },
  ]
  let arcs: Json[] = [
    {
      id: "arc-1",
      projectId,
      title: "Arco de Maren",
      sourceType: "custom",
      customType: "Arco emocional",
      entityId: null,
      relationshipId: null,
      sortKey: "001",
      createdAt: ts,
      updatedAt: ts,
      notes: [
        {
          id: "note-1",
          arcId: "arc-1",
          chapterId,
          content: "Maren duda de su aliado.",
          sortKey: "001",
          createdAt: ts,
          updatedAt: ts,
        },
      ],
    },
  ]
  let shares: Json[] = []
  let entities = [
    makeEntity(entityIds.tomas, "Tomás Reyes", "CHARACTER"),
    makeEntity(entityIds.maren, "Maren Solís", "CHARACTER"),
    makeEntity(entityIds.gabriel, "Gabriel Ortega", "CHARACTER"),
  ]
  let relationships: Json[] = []
  let timeline: Json[] = [
    {
      id: "t1",
      projectId,
      title: "Desaparece el librero",
      description: "Tomás deja una nota críptica.",
      date: null,
      temporalLabel: "Día 1",
      impact: "HIGH",
      storyboardArcId: null,
      arc: null,
      entityIds: [entityIds.tomas],
      position: "a0",
      source: "MANUAL",
      sourceSceneId: null,
      confidenceScore: 1,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "t2",
      projectId,
      title: "Maren encuentra el códice",
      description: "Primera pista del Códice Carmesí.",
      date: null,
      temporalLabel: "Día 3",
      impact: "MEDIUM",
      storyboardArcId: null,
      arc: null,
      entityIds: [entityIds.maren],
      position: "a1",
      source: "MANUAL",
      sourceSceneId: null,
      confidenceScore: 1,
      createdAt: ts,
      updatedAt: ts,
    },
  ]
  let threads: Json[] = [
    { id: "thread-1", projectId, title: "Ideas para el final", isArchived: false, createdAt: ts, updatedAt: ts },
    { id: "thread-2", projectId, title: "Duda sobre Maren", isArchived: false, createdAt: ts, updatedAt: ts },
  ]
  let readerComments: Json[] = []
  const goals: Json[] = []
  let editorStyles: Json[] = []
  let counter = 0
  let hasCover = false
  let mutationDelay = 0
  const failures: Failure[] = []

  const mock: ModalBackend = {
    base,
    calls: [],
    callsTo: (method, pattern) =>
      mock.calls.filter(
        (call) => call.method === method && pattern.test(call.path),
      ),
    setCover: (value) => {
      hasCover = value
    },
    setMutationDelay: (ms) => {
      mutationDelay = ms
    },
    failNext: (method, pattern, status = 500, message = "Falla simulada") => {
      failures.push({ method, pattern, status, message, once: true })
    },
  }

  const nextId = (prefix: string) => `${prefix}-${++counter}`

  await page.route(/^https?:\/\/[^/]+:3000\/.*$/, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname
    const isMutation = method !== "GET"

    let body: Json = {}
    if (isMutation && request.postData()) {
      try {
        body = request.postDataJSON() as Json
      } catch {
        body = {}
      }
    }

    const owned = isOwned(method, path)
    if (!owned) {
      await route.fallback()
      return
    }

    if (isMutation) {
      mock.calls.push({ method, path, query: url.search, body })
      if (mutationDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, mutationDelay))
      }
      const failureIndex = failures.findIndex(
        (failure) =>
          failure.method === method && failure.pattern.test(path),
      )
      if (failureIndex >= 0) {
        const [failure] = failures.splice(failureIndex, 1)
        await respond(
          route,
          { statusCode: failure.status, message: failure.message },
          failure.status,
        )
        return
      }
    }

    await handle(route, method, path, body)
  })

  function isOwned(method: string, path: string): boolean {
    if (/^\/projects(\/|$)/.test(path)) {
      if (path === "/projects/import/epub") return true
      if (/^\/projects\/[^/]+\/(editor-styles|storyboard-cards|storyboard-arcs|chat\/threads|books\/[^/]+\/exports.*)$/.test(path)) return true
      if (/^\/projects\/[^/]+\/(books)$/.test(path)) return true
      if (/^\/projects\/[^/]+$/.test(path)) return true
      if (path === "/projects") return true
      return false
    }
    if (/^\/books\/[^/]+\/cover$/.test(path)) return method === "GET" || method === "DELETE"
    if (/^\/(books|chapters)\/[^/]+(\/chapters|\/shares(\/.*)?)?$/.test(path)) return true
    if (/^\/chapters\/[^/]+\/scenes$/.test(path)) return true
    if (/^\/scenes\/[^/]+$/.test(path)) {
      // Guardar el contenido de la escena lo resuelve el backend base.
      return method === "DELETE"
    }
    if (/^\/scenes\/[^/]+\/versions(\/.*)?$/.test(path)) return true
    if (/^\/storyboard-(cards|arcs|matrix-notes)\/.+$/.test(path)) return true
    if (/^\/chat\/threads\/[^/]+(\/messages)?$/.test(path)) return true
    if (/^\/reading\/invitations\/[^/]+(\/accept|\/comments)?$/.test(path)) return true
    if (/^\/analytics\//.test(path)) return true
    if (/^\/knowledge\/(entities|relationships|timeline)(\/.*)?$/.test(path)) return method !== "GET" || !/entities\/[^/]+\/states/.test(path)
    return false
  }

  async function handle(
    route: Route,
    method: string,
    path: string,
    body: Json,
  ) {
    // ---------- proyectos
    if (path === "/projects/import/epub") {
      return respond(route, { message: "No se pudo procesar el archivo" }, 500)
    }
    if (path === "/projects" && method === "GET") return respond(route, projects)
    if (path === "/projects" && method === "POST") {
      const created = { ...makeProject(), ...body, id: nextId("project"), books: [] }
      projects = [created as Project, ...projects]
      return respond(route, created, 201)
    }
    const projectMatch = path.match(/^\/projects\/([^/]+)$/)
    if (projectMatch) {
      if (method === "GET") return respond(route, project)
      if (method === "PATCH") {
        Object.assign(project, body)
        return respond(route, project)
      }
      if (method === "DELETE") {
        projects = projects.filter((entry) => entry.id !== projectMatch[1])
        return route.fulfill({ status: 204 })
      }
    }

    if (/^\/books\/[^/]+\/cover$/.test(path)) {
      if (method === "DELETE") {
        hasCover = false
        return route.fulfill({ status: 204 })
      }
      return respond(route, {
        coverUrl: hasCover
          ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
          : null,
      })
    }

    // ---------- estructura (libros, capítulos, secciones)
    if (/^\/projects\/[^/]+\/books$/.test(path) && method === "POST") {
      const book = {
        id: nextId("book"),
        title: String(body.title),
        sortKey: String(body.sortKey),
        chapters: [],
      }
      project.books.push(book as never)
      return respond(route, book, 201)
    }
    const bookMatch = path.match(/^\/books\/([^/]+)$/)
    if (bookMatch) {
      if (method === "PATCH") {
        const book = project.books.find((entry) => entry.id === bookMatch[1])
        if (book && typeof body.title === "string") book.title = body.title
        return respond(route, book ?? {})
      }
      if (method === "DELETE") {
        project.books = project.books.filter((entry) => entry.id !== bookMatch[1])
        return route.fulfill({ status: 204 })
      }
    }
    const bookChapters = path.match(/^\/books\/([^/]+)\/chapters$/)
    if (bookChapters && method === "POST") {
      const book = project.books.find((entry) => entry.id === bookChapters[1])
      const chapter = {
        id: nextId("chapter"),
        title: String(body.title),
        sortKey: String(body.sortKey),
        scenes: [],
      }
      book?.chapters.push(chapter as never)
      return respond(route, chapter, 201)
    }
    const chapterMatch = path.match(/^\/chapters\/([^/]+)$/)
    if (chapterMatch) {
      if (method === "PATCH") {
        for (const book of project.books) {
          const chapter = book.chapters.find((entry) => entry.id === chapterMatch[1])
          if (chapter && typeof body.title === "string") chapter.title = body.title
        }
        return respond(route, {})
      }
      if (method === "DELETE") {
        for (const book of project.books) {
          book.chapters = book.chapters.filter((entry) => entry.id !== chapterMatch[1])
        }
        return route.fulfill({ status: 204 })
      }
    }
    const chapterScenes = path.match(/^\/chapters\/([^/]+)\/scenes$/)
    if (chapterScenes && method === "POST") {
      const scene = {
        id: nextId("scene"),
        title: String(body.title),
        sortKey: String(body.sortKey),
        wordCount: 0,
        order: Number(body.order ?? 1),
      }
      for (const book of project.books) {
        book.chapters
          .find((entry) => entry.id === chapterScenes[1])
          ?.scenes.push(scene as never)
      }
      return respond(route, scene, 201)
    }
    if (/^\/scenes\/[^/]+$/.test(path) && method === "DELETE") {
      return route.fulfill({ status: 204 })
    }

    // ---------- versiones de escena
    const versionsMatch = path.match(/^\/scenes\/([^/]+)\/versions(?:\/([^/]+))?(\/restore)?$/)
    if (versionsMatch) {
      const [, scene, versionId, restore] = versionsMatch
      if (!versionId && method === "GET") return respond(route, versions)
      if (!versionId && method === "POST") {
        const version = {
          id: nextId("version"),
          sceneId: scene,
          label: (body.label as string | undefined) ?? null,
          wordCount: 10,
          hash: "h",
          createdAt: ts,
          updatedAt: ts,
          content: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "La noche cubría la ciudad." }] },
            ],
          },
          createdFromId: null,
        }
        versions = [version, ...versions]
        return respond(route, version, 201)
      }
      if (versionId && restore && method === "POST") {
        return respond(route, { updatedAt: ts, hash: "restored", contentChanged: true })
      }
      if (versionId && method === "PATCH") {
        versions = versions.map((version) =>
          version.id === versionId ? { ...version, ...body } : version,
        )
        return respond(route, versions.find((version) => version.id === versionId) ?? {})
      }
      if (versionId && method === "DELETE") {
        versions = versions.filter((version) => version.id !== versionId)
        return route.fulfill({ status: 204 })
      }
      if (versionId && method === "GET") {
        return respond(route, versions.find((version) => version.id === versionId) ?? {})
      }
    }

    // ---------- estilos de texto del editor
    if (/^\/projects\/[^/]+\/editor-styles$/.test(path)) {
      if (method === "GET") return respond(route, editorStyles)
      if (method === "POST") {
        const style = {
          id: nextId("style"),
          projectId,
          isActive: true,
          createdAt: ts,
          updatedAt: ts,
          ...body,
        }
        editorStyles = [...editorStyles, style]
        return respond(route, style, 201)
      }
    }

    // ---------- tablero
    if (/^\/projects\/[^/]+\/storyboard-cards$/.test(path)) {
      if (method === "GET") return respond(route, cards)
      if (method === "POST") {
        const card = {
          id: nextId("card"),
          projectId,
          chapterId: null,
          hasAudio: false,
          audioDurationSecs: null,
          sortKey: "000002",
          createdAt: ts,
          updatedAt: ts,
          tags: [],
          characters: [],
          entityIds: [],
          ...body,
        }
        cards = [...cards, card]
        return respond(route, card, 201)
      }
    }
    const cardMatch = path.match(/^\/storyboard-cards\/([^/]+)$/)
    if (cardMatch) {
      if (method === "PATCH") {
        cards = cards.map((card) =>
          card.id === cardMatch[1] ? { ...card, ...body } : card,
        )
        return respond(route, cards.find((card) => card.id === cardMatch[1]) ?? {})
      }
      if (method === "DELETE") {
        cards = cards.filter((card) => card.id !== cardMatch[1])
        return route.fulfill({ status: 204 })
      }
    }

    // ---------- matriz de arcos
    if (/^\/projects\/[^/]+\/storyboard-arcs$/.test(path)) {
      if (method === "GET") return respond(route, arcs)
      if (method === "POST") {
        const arc = {
          id: nextId("arc"),
          projectId,
          customType: null,
          entityId: null,
          relationshipId: null,
          sortKey: "002",
          createdAt: ts,
          updatedAt: ts,
          notes: [],
          ...body,
        }
        arcs = [...arcs, arc]
        return respond(route, arc, 201)
      }
    }
    const arcMatch = path.match(/^\/storyboard-arcs\/([^/]+)(\/notes)?$/)
    if (arcMatch) {
      if (!arcMatch[2] && method === "DELETE") {
        arcs = arcs.filter((arc) => arc.id !== arcMatch[1])
        return route.fulfill({ status: 204 })
      }
      if (arcMatch[2] && method === "POST") {
        const note = {
          id: nextId("note"),
          arcId: arcMatch[1],
          sortKey: "002",
          createdAt: ts,
          updatedAt: ts,
          ...body,
        }
        arcs = arcs.map((arc) =>
          arc.id === arcMatch[1]
            ? { ...arc, notes: [...(arc.notes as Json[]), note] }
            : arc,
        )
        return respond(route, note, 201)
      }
    }
    const noteMatch = path.match(/^\/storyboard-matrix-notes\/([^/]+)$/)
    if (noteMatch && method === "DELETE") {
      arcs = arcs.map((arc) => ({
        ...arc,
        notes: (arc.notes as Json[]).filter((note) => note.id !== noteMatch[1]),
      }))
      return route.fulfill({ status: 204 })
    }

    // ---------- chat
    if (/^\/projects\/[^/]+\/chat\/threads$/.test(path) && method === "GET") {
      return respond(route, {
        items: threads,
        page: 1,
        pageSize: 20,
        total: threads.length,
        hasMore: false,
      })
    }
    const threadMatch = path.match(/^\/chat\/threads\/([^/]+)(\/messages)?$/)
    if (threadMatch) {
      if (threadMatch[2]) {
        // Conversación larga: obliga al panel del chat a scrollear.
        return respond(
          route,
          Array.from({ length: 30 }, (_, index) => ({
            id: `message-${index + 1}`,
            threadId: threadMatch[1],
            role: index % 2 === 0 ? "user" : "assistant",
            content: `Mensaje número ${index + 1}`,
            sources: [],
            actions: [],
            inputTokens: null,
            outputTokens: null,
            createdAt: ts,
          })),
        )
      }
      if (method === "DELETE") {
        threads = threads.filter((thread) => thread.id !== threadMatch[1])
        return route.fulfill({ status: 204 })
      }
    }

    // ---------- lector compartido
    const readingMatch = path.match(/^\/reading\/invitations\/([^/]+)(\/accept|\/comments)?$/)
    if (readingMatch) {
      if (readingMatch[2] === "/comments") {
        if (method === "GET") return respond(route, readerComments)
        if (method === "POST") {
          const comment = {
            id: nextId("comment"),
            prefix: null,
            suffix: null,
            status: "OPEN",
            isVisible: true,
            replies: [],
            statusHistory: [],
            author: { id: "e2e-writer", displayName: "Escritora de prueba" },
            createdAt: ts,
            updatedAt: ts,
            ...body,
          }
          readerComments = [...readerComments, comment]
          return respond(route, comment, 201)
        }
      }
      return respond(route, {
        invitation: {
          id: "share-1",
          slug: readingMatch[1],
          invitedEmail: "writer@example.test",
          permission: "COMMENT",
          status: "ACCEPTED",
          expiresAt: null,
          createdAt: ts,
          frozenAt: ts,
        },
        manuscript: {
          schemaVersion: 1,
          projectId,
          title: "Crónicas del viento",
          frozenAt: ts,
          books: [
            {
              id: bookId,
              title: "Libro I",
              chapters: [
                {
                  id: chapterId,
                  title: "Capítulo 1",
                  scenes: [
                    {
                      id: sceneId,
                      title: "El umbral",
                      wordCount: 10,
                      content: {
                        type: "doc",
                        content: [
                          { type: "paragraph", content: [{ type: "text", text: "La noche cubría la ciudad." }] },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        viewer: { isOwner: false, canComment: true },
      })
    }

    // ---------- compartir
    const sharesMatch = path.match(/^\/books\/([^/]+)\/shares(?:\/([^/]+))?$/)
    if (sharesMatch) {
      if (!sharesMatch[2] && method === "GET") return respond(route, shares)
      if (!sharesMatch[2] && method === "POST") {
        const share = {
          id: nextId("share"),
          slug: "invitacion-1",
          token: "token-1",
          invitedEmail: body.email,
          permission: body.permission,
          status: "PENDING",
          expiresAt: null,
          createdAt: ts,
          frozenAt: ts,
        }
        shares = [share, ...shares]
        return respond(route, share, 201)
      }
      if (sharesMatch[2] && method === "DELETE") {
        shares = shares.filter((share) => share.id !== sharesMatch[2])
        return route.fulfill({ status: 204 })
      }
    }

    // ---------- exportación
    const exportsMatch = path.match(
      /^\/projects\/([^/]+)\/books\/([^/]+)\/exports(?:\/([^/]+))?$/,
    )
    if (exportsMatch) {
      return respond(route, {
        id: "export-1",
        projectId,
        bookId,
        format: "EPUB",
        status: "PROCESSING",
        progress: 40,
        errorMessage: null,
        downloadUrl: null,
        createdAt: ts,
        completedAt: null,
      }, method === "POST" ? 201 : 200)
    }

    // ---------- estadísticas
    if (/^\/analytics\/projects\/[^/]+\/dashboard$/.test(path)) {
      return respond(route, {
        project: {
          id: projectId,
          title: "Crónicas del viento",
          wordCount: 18420,
          wordCountTarget: 50000,
          progressPercent: 37,
        },
        hierarchy: [],
        summary: {
          todayWords: 640,
          weekWords: 4200,
          currentStreak: 6,
          bestStreak: 14,
          averageWpm: 28,
          averageDailyWords: 610,
          estimatedCompletionDate: null,
        },
        dailyActivity: [],
        recentSessions: [],
        goals,
        generatedAt: ts,
      })
    }
    const goalMatch = path.match(/^\/analytics\/projects\/[^/]+\/goals\/(DAILY|WEEKLY)$/)
    if (goalMatch && method === "PUT") {
      const goal = {
        id: `goal-${goalMatch[1]}`,
        goalType: goalMatch[1],
        targetWords: body.targetWords,
        currentWords: 0,
        deadline: body.deadline ?? null,
        progressPercent: 0,
      }
      goals.push(goal)
      return respond(route, goal)
    }

    // ---------- universo
    if (path === "/knowledge/entities") {
      if (method === "GET") return respond(route, entities)
      if (method === "POST") {
        const entity = {
          ...makeEntity(nextId("entity"), String(body.canonicalName), String(body.type)),
          ...body,
        }
        entities = [...entities, entity]
        return respond(route, entity, 201)
      }
    }
    const entityMatch = path.match(/^\/knowledge\/entities\/([^/]+)$/)
    if (entityMatch && method === "DELETE") {
      entities = entities.filter((entity) => entity.id !== entityMatch[1])
      return route.fulfill({ status: 204 })
    }
    if (path === "/knowledge/relationships") {
      if (method === "GET") return respond(route, relationships)
      if (method === "POST") {
        const relationship = {
          id: nextId("relationship"),
          projectId,
          createdAt: ts,
          updatedAt: ts,
          description: null,
          validFromSceneId: null,
          validToSceneId: null,
          ...body,
        }
        relationships = [...relationships, relationship]
        return respond(route, relationship, 201)
      }
    }
    const relationshipMatch = path.match(/^\/knowledge\/relationships\/([^/]+)$/)
    if (relationshipMatch && method === "DELETE") {
      relationships = relationships.filter((entry) => entry.id !== relationshipMatch[1])
      return route.fulfill({ status: 204 })
    }
    if (path === "/knowledge/timeline") {
      if (method === "GET") return respond(route, timeline)
      if (method === "POST") {
        const event = {
          id: nextId("event"),
          projectId,
          description: null,
          date: null,
          temporalLabel: null,
          impact: "MEDIUM",
          storyboardArcId: null,
          arc: null,
          entityIds: [],
          position: `b${counter}`,
          source: "MANUAL",
          sourceSceneId: null,
          confidenceScore: 1,
          createdAt: ts,
          updatedAt: ts,
          ...body,
        }
        timeline = [...timeline, event]
        return respond(route, event, 201)
      }
    }
    const moveMatch = path.match(/^\/knowledge\/timeline\/([^/]+)\/move$/)
    if (moveMatch && method === "POST") {
      return respond(route, timeline.find((event) => event.id === moveMatch[1]) ?? {})
    }
    const timelineMatch = path.match(/^\/knowledge\/timeline\/([^/]+)$/)
    if (timelineMatch && method === "DELETE") {
      timeline = timeline.filter((event) => event.id !== timelineMatch[1])
      return route.fulfill({ status: 204 })
    }

    await route.fallback()
  }

  return mock
}
