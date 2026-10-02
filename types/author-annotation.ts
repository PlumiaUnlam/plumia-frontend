export type AuthorAnnotationPerson = {
  id: string
  name: string
  lastname: string
  displayName: string | null
  avatarUrl: string | null
}

export type AuthorAnnotation = {
  id: string
  sceneId: string
  authorId: string
  author: AuthorAnnotationPerson
  body: string
  quote: string | null
  anchorFrom: number | null
  anchorTo: number | null
  contextBefore: string | null
  contextAfter: string | null
  createdAt: string
  updatedAt: string
}

export type CreateAuthorAnnotationInput = {
  body: string
  quote?: string
  anchorFrom?: number
  anchorTo?: number
  contextBefore?: string
  contextAfter?: string
}
