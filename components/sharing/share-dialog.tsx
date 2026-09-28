"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Check, Copy, ExternalLink, Link2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { isEmail } from "@/helpers/validation"
import {
  createFrozenShare,
  getBookShares,
  revokeBookShare,
} from "@/services/sharing.service"
import type { SharePermission, ShareSummary } from "@/types/sharing"

type ShareDialogProps = {
  books: Array<{ id: string; title: string }>
  activeBookId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBeforeShare: () => Promise<void>
}

const permissionLabels: Record<SharePermission, string> = {
  READ_ONLY: "Solo lectura",
  COMMENT: "Puede comentar",
}

export function ShareDialog({
  books,
  activeBookId,
  open,
  onOpenChange,
  onBeforeShare,
}: ShareDialogProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] =
    useState<SharePermission>("READ_ONLY")
  const [selectedBookId, setSelectedBookId] = useState("")
  const [shares, setShares] = useState<ShareSummary[]>([])
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bookId = books.some((book) => book.id === selectedBookId)
    ? selectedBookId
    : activeBookId && books.some((book) => book.id === activeBookId)
      ? activeBookId
      : books[0]?.id ?? ""

  const loadShares = useCallback(async () => {
    if (!bookId) {
      setShares([])
      return
    }
    setLoading(true)
    try {
      setShares(await getBookShares(bookId))
      setError(null)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las invitaciones.",
      )
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    if (!open) return
    void Promise.resolve().then(loadShares)
  }, [loadShares, open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCreatedLink(null)
      setCopied(false)
      setSelectedBookId("")
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!isEmail(normalizedEmail)) {
      setError("Ingresá una dirección de email válida.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onBeforeShare()
      if (!bookId) {
        setError("Seleccioná un libro para compartir.")
        return
      }
      const share = await createFrozenShare(bookId, {
        email: normalizedEmail,
        permission,
      })
      const link = `${window.location.origin}/shared/${share.slug}?token=${encodeURIComponent(share.token)}`
      setCreatedLink(link)
      setEmail("")
      setShares((current) => [share, ...current])
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear la invitación.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const copyCreatedLink = async () => {
    if (!createdLink) return
    await navigator.clipboard.writeText(createdLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const revoke = async (shareId: string) => {
    if (!bookId) return
    try {
      await revokeBookShare(bookId, shareId)
      setShares((current) =>
        current.map((share) =>
          share.id === shareId ? { ...share, status: "REVOKED" } : share,
        ),
      )
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "No se pudo revocar la invitación.",
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compartir un libro</DialogTitle>
          <DialogDescription>
            Se guardará una copia inmutable del libro elegido. Los cambios que hagas
            después no aparecerán en este enlace.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-1.5 text-sm font-medium">
            Libro
            <select
              value={bookId}
              onChange={(event) => {
                setSelectedBookId(event.target.value)
                setCreatedLink(null)
              }}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {books.length === 0 && <option value="">No hay libros</option>}
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="space-y-1.5 text-sm font-medium">
              Email de la persona
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="lectora@ejemplo.com"
                autoComplete="email"
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Permiso
              <select
                value={permission}
                onChange={(event) =>
                  setPermission(event.target.value as SharePermission)
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="READ_ONLY">Solo lectura</option>
                <option value="COMMENT">Lectura y comentarios</option>
              </select>
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !bookId}
            className="w-full"
          >
            {submitting ? <Spinner className="size-4" /> : <Link2 />}
            Crear enlace seguro
          </Button>
        </form>

        {createdLink && (
          <section className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-semibold">Enlace creado</p>
            <p className="text-xs text-muted-foreground">
              Solo podrá aceptarlo una cuenta con el email indicado. Copialo y
              envialo por el medio que prefieras.
            </p>
            <div className="flex gap-2">
              <Input value={createdLink} readOnly className="text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copyCreatedLink()}
                aria-label="Copiar enlace"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
              <Button type="button" variant="outline" size="icon" asChild>
                <a
                  href={createdLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir versión compartida"
                >
                  <ExternalLink />
                </a>
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Invitaciones</h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-5" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no compartiste ninguna versión.
            </p>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {share.invitedEmail}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {permissionLabels[share.permission]} ·{" "}
                      {share.status === "PENDING"
                        ? "Pendiente"
                        : share.status === "ACCEPTED"
                          ? "Aceptada"
                          : "Revocada"}
                    </p>
                  </div>
                  {share.status !== "REVOKED" && (
                    <Button type="button" variant="ghost" size="icon-sm" asChild>
                      <a
                        href={`/shared/${share.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir versión compartida con ${share.invitedEmail}`}
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                  {share.status !== "REVOKED" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void revoke(share.id)}
                      aria-label={`Revocar invitación de ${share.invitedEmail}`}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
