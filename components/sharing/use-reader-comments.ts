"use client"

import { useCallback, useState } from "react"

import { messageForApiError } from "@/helpers/api-errors"
import {
  createReaderComment,
  createReaderCommentReply,
  updateReaderComment,
} from "@/services/sharing.service"
import type { ReaderComment, TextSelectionAnchor } from "@/types/sharing"

/** Devuelve null si el id coincide con el actual; si no, conserva el actual. */
function clearIfSame(current: string | null, id: string) {
  return current === id ? null : current
}

function toggleSameId(current: string | null, id: string) {
  return current === id ? null : id
}

function replaceComment(comments: ReaderComment[], updated: ReaderComment) {
  return comments.map((item) => (item.id === updated.id ? updated : item))
}

/** Enfoca la tarjeta del comentario; devuelve false si todavía no está en el DOM. */
function focusReaderCommentCard(commentId: string) {
  const card = document.getElementById(`reader-comment-${commentId}`)
  card?.scrollIntoView({ behavior: "smooth", block: "center" })
  card?.focus({ preventScroll: true })
  return Boolean(card)
}

function scrollToAnchorOf(commentId: string) {
  const anchor = Array.from(
    document.querySelectorAll<HTMLElement>("[data-comment-id]"),
  ).find((element) => element.dataset.commentId === commentId)
  anchor?.scrollIntoView({ behavior: "smooth", block: "center" })
}

type UseReaderCommentsOptions = Readonly<{
  slug: string
  initialToken: string | undefined
  initialComments: ReaderComment[]
  isMobile: boolean
}>

/** Estado y acciones de la discusión del lector: seleccionar, comentar, responder y resolver. */
export function useReaderComments({
  slug,
  initialToken,
  initialComments,
  isMobile,
}: UseReaderCommentsOptions) {
  const [comments, setComments] = useState(initialComments)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [selection, setSelection] = useState<TextSelectionAnchor | null>(null)
  // Mobile: la selección espera a que se toque «Comentar».
  const [pendingSelection, setPendingSelection] =
    useState<TextSelectionAnchor | null>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentBody, setCommentBody] = useState("")
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null,
  )
  const [showResolvedComments, setShowResolvedComments] = useState(false)
  const [submittingReplyFor, setSubmittingReplyFor] = useState<string | null>(
    null,
  )
  const [submittingComment, setSubmittingComment] = useState(false)
  const [discussionError, setDiscussionError] = useState<string | null>(null)

  const openComments = comments.filter((comment) => comment.status === "OPEN")
  const resolvedComments = comments.filter(
    (comment) => comment.status === "RESOLVED",
  )
  const visibleComments = showResolvedComments
    ? [...openComments, ...resolvedComments]
    : openComments

  const openComment = useCallback(
    (commentId: string) => {
      setActiveCommentId(commentId)
      if (isMobile) {
        const isResolved = comments.some(
          (comment) =>
            comment.id === commentId && comment.status === "RESOLVED",
        )
        if (isResolved) setShowResolvedComments(true)
        setCommentsOpen(true)
        return
      }
      window.requestAnimationFrame(() => {
        if (focusReaderCommentCard(commentId)) return
        setShowResolvedComments(true)
        window.requestAnimationFrame(() => focusReaderCommentCard(commentId))
      })
    },
    [comments, isMobile],
  )

  const scrollToCommentAnchor = useCallback((commentId: string) => {
    setActiveCommentId(commentId)
    setCommentsOpen(false)
    window.requestAnimationFrame(() => scrollToAnchorOf(commentId))
  }, [])

  const submitComment = async () => {
    if (!selection || !commentBody.trim()) return
    setSubmittingComment(true)
    try {
      const created = await createReaderComment(slug, initialToken, {
        ...selection,
        body: commentBody.trim(),
      })
      setComments((current) => [...current, created])
      setSelection(null)
      setPendingSelection(null)
      setCommentBody("")
      setActiveCommentId(created.id)
      setDiscussionError(null)
    } catch (submitError) {
      setDiscussionError(
        messageForApiError(submitError, "No se pudo guardar el comentario."),
      )
    } finally {
      setSubmittingComment(false)
    }
  }

  const toggleResolved = async (comment: ReaderComment) => {
    try {
      const updated = await updateReaderComment(
        slug,
        comment.id,
        comment.status === "OPEN" ? "RESOLVED" : "OPEN",
      )
      setComments((current) => replaceComment(current, updated))
      if (updated.status === "RESOLVED") {
        setActiveCommentId((current) => clearIfSame(current, updated.id))
        setReplyingToCommentId((current) => clearIfSame(current, updated.id))
      }
      setDiscussionError(null)
    } catch (updateError) {
      setDiscussionError(
        messageForApiError(
          updateError,
          "No se pudo actualizar el estado del comentario.",
        ),
      )
    }
  }

  const submitReply = async (comment: ReaderComment) => {
    const body = replyDrafts[comment.id]?.trim()
    if (!body) return
    setSubmittingReplyFor(comment.id)
    try {
      const updated = await createReaderCommentReply(
        slug,
        initialToken,
        comment.id,
        body,
      )
      setComments((current) => replaceComment(current, updated))
      setReplyDrafts((current) => ({ ...current, [comment.id]: "" }))
      setReplyingToCommentId(null)
      setDiscussionError(null)
    } catch (replyError) {
      setDiscussionError(
        messageForApiError(replyError, "No se pudo guardar la respuesta."),
      )
    } finally {
      setSubmittingReplyFor(null)
    }
  }

  return {
    comments,
    openComments,
    resolvedComments,
    visibleComments,
    activeCommentId,
    selection,
    setSelection,
    pendingSelection,
    setPendingSelection,
    commentsOpen,
    setCommentsOpen,
    commentBody,
    setCommentBody,
    submittingComment,
    submitComment,
    discussionProps: {
      openComments,
      resolvedComments,
      visibleComments,
      discussionError,
      activeCommentId,
      replyingToCommentId,
      replyDrafts,
      submittingReplyFor,
      showResolvedComments,
      onToggleResolvedComments: () =>
        setShowResolvedComments((current) => !current),
      onToggleResolved: toggleResolved,
      onScrollToCommentAnchor: scrollToCommentAnchor,
      onToggleReply: (commentId: string) =>
        setReplyingToCommentId((current) => toggleSameId(current, commentId)),
      onReplyDraftChange: (commentId: string, body: string) =>
        setReplyDrafts((current) => ({ ...current, [commentId]: body })),
      onCancelReply: () => setReplyingToCommentId(null),
      onSubmitReply: submitReply,
    },
    openComment,
  }
}
