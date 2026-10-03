import type { Page, Route } from "@playwright/test"
import type { AuthorAnnotation } from "@/types/author-annotation"

const projectId = "e2e-project"
const bookId = "e2e-book"
const chapterId = "e2e-chapter"
const sceneId = "e2e-scene"
const timestamp = "2026-01-01T00:00:00.000Z"

export type JsonDocument = {
  type: string
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  content?: JsonDocument[]
  attrs?: Record<string, unknown>
}

type Project = {
  id: string
  userId: string
  title: string
  description: string
  genre: string
  genreRules: { tone: string; audience: string }
  wordCountTarget: number
  status: string
  createdAt: string
  updatedAt: string
  books: Array<{
    id: string
    title: string
    sortKey: string
    chapters: Array<{
      id: string
      title: string
      sortKey: string
      scenes: Array<{
        id: string
        title: string | null
        sortKey: string
        wordCount: number
        order: number
      }>
    }>
  }>
}

function paragraph(text: string): JsonDocument {
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  }
}

export function starterSceneContent(): JsonDocument {
  return {
    type: "doc",
    content: [
      paragraph("La noche cubría la ciudad."),
      paragraph("La noche llegó antes de lo esperado."),
    ],
  }
}

function makeProject(): Project {
  return {
    id: projectId,
    userId: "e2e-writer",
    title: "Crónicas del viento",
    description: "Novela de prueba",
    genre: "Fantasía",
    genreRules: { tone: "Aventura", audience: "Adulto" },
    wordCountTarget: 50_000,
    status: "En progreso",
    createdAt: timestamp,
    updatedAt: timestamp,
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

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

export type MockBackend = {
  projectCreates: Array<Record<string, unknown>>
  structureCreates: Array<{ kind: string; payload: Record<string, unknown> }>
  sceneWrites: Array<JsonDocument>
  storyboardCreates: Array<Record<string, unknown>>
  annotationUpdates: Array<{ id: string; payload: Record<string, unknown> }>
  annotationDeletes: string[]
  getSceneContent: () => JsonDocument
  getAuthorAnnotations: () => AuthorAnnotation[]
}

type MockBackendOptions = {
  authorAnnotations?: AuthorAnnotation[]
}

export async function installMockBackend(
  page: Page,
  options: MockBackendOptions = {},
): Promise<MockBackend> {
  const project = makeProject()
  const projects: Project[] = [project]
  let sceneContent = starterSceneContent()
  let cards: Array<Record<string, unknown>> = []
  let authorAnnotations = structuredClone(options.authorAnnotations ?? [])
  let generatedId = 0

  const mock: MockBackend = {
    projectCreates: [],
    structureCreates: [],
    sceneWrites: [],
    storyboardCreates: [],
    annotationUpdates: [],
    annotationDeletes: [],
    getSceneContent: () => structuredClone(sceneContent),
    getAuthorAnnotations: () => structuredClone(authorAnnotations),
  }

  await page.route(
    "https://identitytoolkit.googleapis.com/**",
    async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith("/accounts:signInWithPassword")) {
        const credentials = route.request().postDataJSON() as {
          email?: string
        }
        await json(route, {
          kind: "identitytoolkit#VerifyPasswordResponse",
          localId: "e2e-writer",
          email: credentials.email ?? "writer@example.test",
          displayName: "Escritora de prueba",
          idToken: "e2e-firebase-id-token",
          registered: true,
          refreshToken: "e2e-refresh-token",
          expiresIn: "3600",
        })
        return
      }

      if (url.pathname.endsWith("/accounts:lookup")) {
        await json(route, {
          users: [
            {
              localId: "e2e-writer",
              email: "writer@example.test",
              displayName: "Escritora de prueba",
              emailVerified: true,
            },
          ],
        })
        return
      }

      await json(route, {
        idToken: "e2e-firebase-id-token",
        refreshToken: "e2e-refresh-token",
        expiresIn: "3600",
        user_id: "e2e-writer",
      })
    },
  )

  await page.route(/^(https?:\/\/[^/]+:3000\/.*)$/, async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname === "/auth/login" && request.method() === "POST") {
      await json(route, {
        user: {
          id: "e2e-writer",
          name: "Escritora",
          lastname: "Prueba",
          email: "writer@example.test",
          displayName: "Escritora de prueba",
          avatarUrl: null,
          role: "AUTHOR",
          plan: "FREE",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
      return
    }

    if (url.pathname === "/projects" && request.method() === "GET") {
      await json(route, projects)
      return
    }

    if (url.pathname === "/projects" && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>
      mock.projectCreates.push(payload)
      const createdProject: Project = {
        ...makeProject(),
        id: `created-project-${mock.projectCreates.length}`,
        title: String(payload.title),
        description: String(payload.description ?? ""),
        genre: String(payload.genre ?? ""),
        wordCountTarget: Number(payload.wordCountTarget ?? 0),
        books: [],
      }
      projects.unshift(createdProject)
      await json(route, createdProject, 201)
      return
    }

    const projectMatch = url.pathname.match(/^\/projects\/([^/]+)$/)
    if (projectMatch && request.method() === "GET") {
      await json(route, projects.find((entry) => entry.id === projectMatch[1]) ?? project)
      return
    }

    const sceneMatch = url.pathname.match(/^\/scenes\/([^/]+)$/)
    if (sceneMatch && request.method() === "GET") {
      await json(route, {
        id: sceneMatch[1],
        title: "El umbral",
        content: sceneContent,
        updatedAt: timestamp,
        hash: "e2e-hash",
      })
      return
    }

    if (sceneMatch && request.method() === "PATCH") {
      const payload = request.postDataJSON() as { content: JsonDocument }
      sceneContent = structuredClone(payload.content)
      mock.sceneWrites.push(structuredClone(sceneContent))
      await json(route, {
        updatedAt: new Date().toISOString(),
        hash: "updated-e2e-hash",
        contentChanged: true,
      })
      return
    }

    const annotationCollectionMatch = url.pathname.match(
      /^\/scenes\/([^/]+)\/annotations$/,
    )
    if (annotationCollectionMatch && request.method() === "GET") {
      await json(route, authorAnnotations)
      return
    }

    if (annotationCollectionMatch && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>
      const annotation: AuthorAnnotation = {
        id: `e2e-annotation-${++generatedId}`,
        sceneId: annotationCollectionMatch[1],
        authorId: "e2e-writer",
        author: {
          id: "e2e-writer",
          name: "Escritora",
          lastname: "Prueba",
          displayName: "Escritora de prueba",
          avatarUrl: null,
        },
        body: String(payload.body ?? ""),
        quote: typeof payload.quote === "string" ? payload.quote : null,
        anchorFrom: typeof payload.anchorFrom === "number" ? payload.anchorFrom : null,
        anchorTo: typeof payload.anchorTo === "number" ? payload.anchorTo : null,
        contextBefore: typeof payload.contextBefore === "string" ? payload.contextBefore : null,
        contextAfter: typeof payload.contextAfter === "string" ? payload.contextAfter : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
      }
      authorAnnotations = [...authorAnnotations, annotation]
      await json(route, annotation, 201)
      return
    }

    const annotationMatch = url.pathname.match(
      /^\/scenes\/[^/]+\/annotations\/([^/]+)$/,
    )
    if (annotationMatch && request.method() === "PATCH") {
      const id = annotationMatch[1]
      const payload = request.postDataJSON() as Record<string, unknown>
      mock.annotationUpdates.push({ id, payload })
      let updated: AuthorAnnotation | undefined
      authorAnnotations = authorAnnotations.map((annotation) => {
        if (annotation.id !== id) return annotation
        updated = {
          ...annotation,
          ...(typeof payload.body === "string" ? { body: payload.body } : {}),
          ...(typeof payload.isResolved === "boolean"
            ? { resolvedAt: payload.isResolved ? new Date().toISOString() : null }
            : {}),
          updatedAt: new Date().toISOString(),
        }
        return updated
      })
      if (!updated) {
        await json(route, { message: "No se encontró la anotación" }, 404)
        return
      }
      await json(route, updated)
      return
    }

    if (annotationMatch && request.method() === "DELETE") {
      const id = annotationMatch[1]
      mock.annotationDeletes.push(id)
      authorAnnotations = authorAnnotations.filter((annotation) => annotation.id !== id)
      await route.fulfill({ status: 204 })
      return
    }

    if (/^\/scenes\/[^/]+\/versions$/.test(url.pathname) && request.method() === "GET") {
      await json(route, [])
      return
    }

    const createBookMatch = url.pathname.match(/^\/projects\/([^/]+)\/books$/)
    if (createBookMatch && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>
      mock.structureCreates.push({ kind: "book", payload })
      const newBook = {
        id: `e2e-book-${++generatedId}`,
        title: String(payload.title),
        sortKey: String(payload.sortKey),
        chapters: [],
      }
      project.books.push(newBook)
      await json(route, newBook, 201)
      return
    }

    const createChapterMatch = url.pathname.match(/^\/books\/([^/]+)\/chapters$/)
    if (createChapterMatch && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>
      mock.structureCreates.push({ kind: "chapter", payload })
      const parentBook = project.books.find((entry) => entry.id === createChapterMatch[1])
      const newChapter = {
        id: `e2e-chapter-${++generatedId}`,
        title: String(payload.title),
        sortKey: String(payload.sortKey),
        scenes: [],
      }
      parentBook?.chapters.push(newChapter)
      await json(route, newChapter, 201)
      return
    }

    const createSceneMatch = url.pathname.match(/^\/chapters\/([^/]+)\/scenes$/)
    if (createSceneMatch && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>
      mock.structureCreates.push({ kind: "scene", payload })
      const parentChapter = project.books
        .flatMap((entry) => entry.chapters)
        .find((entry) => entry.id === createSceneMatch[1])
      const newScene = {
        id: `e2e-scene-${++generatedId}`,
        title: String(payload.title),
        sortKey: String(payload.sortKey),
        wordCount: 0,
        order: Number(payload.order ?? 1),
      }
      parentChapter?.scenes.push(newScene)
      await json(route, newScene, 201)
      return
    }

    if (/^\/projects\/[^/]+\/editor-styles$/.test(url.pathname)) {
      await json(route, [])
      return
    }

    if (/^\/projects\/[^/]+\/storyboard-cards$/.test(url.pathname)) {
      if (request.method() === "GET") {
        await json(route, cards)
        return
      }

      if (request.method() === "POST") {
        const payload = request.postDataJSON() as Record<string, unknown>
        mock.storyboardCreates.push(payload)
        const card = {
          id: `e2e-card-${++generatedId}`,
          projectId,
          chapterId: null,
          title: String(payload.title),
          description: String(payload.description ?? ""),
          status: String(payload.status ?? "ideas"),
          tags: payload.tags ?? [],
          characters: payload.characters ?? [],
          entityIds: payload.entityIds ?? [],
          hasAudio: false,
          audioDurationSecs: null,
          sortKey: String(payload.sortKey ?? "000001"),
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        cards = [...cards, card]
        await json(route, card, 201)
        return
      }
    }

    if (url.pathname.startsWith("/knowledge/")) {
      await json(route, [])
      return
    }

    await json(
      route,
      { message: `Endpoint e2e no simulado: ${request.method()} ${url.pathname}` },
      404,
    )
  })

  return mock
}

export const e2eProjectId = projectId
