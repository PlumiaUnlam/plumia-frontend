"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  Trash2,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

function getShareStatusLabel(status: ShareSummary["status"]) {
  switch (status) {
    case "PENDING":
      return "Pendiente"
    case "ACCEPTED":
      return "Aceptada"
    case "REVOKED":
      return "Revocada"
  }
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
      const bookShares = await getBookShares(bookId)
      setShares(bookShares.filter((share) => share.status !== "REVOKED"))
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
      setShares((current) => current.filter((share) => share.id !== shareId))
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
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compartir un libro</DialogTitle>
          <DialogDescription>
            Se guardará una copia inmutable del libro elegido. Los cambios que hagas
            después no aparecerán en este enlace.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="share-book">Libro</FieldLabel>
              <Select
                value={bookId || undefined}
                disabled={books.length === 0}
                onValueChange={(value) => {
                  setSelectedBookId(value)
                  setCreatedLink(null)
                }}
              >
                <SelectTrigger id="share-book" className="h-10 w-full">
                  <SelectValue
                    placeholder={
                      books.length === 0 ? "No hay libros" : "Seleccioná un libro"
                    }
                  />
                </SelectTrigger>
                <SelectContent align="start">
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <Field>
                <FieldLabel htmlFor="share-email">Email de la persona</FieldLabel>
                <Input
                  id="share-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="lectora@ejemplo.com"
                  autoComplete="email"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="share-permission">Permiso</FieldLabel>
                <Select
                  value={permission}
                  onValueChange={(value) =>
                    setPermission(value as SharePermission)
                  }
                >
                  <SelectTrigger id="share-permission" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="READ_ONLY">Solo lectura</SelectItem>
                    <SelectItem value="COMMENT">
                      Lectura y comentarios
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>No pudimos completar la acción</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
          <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Enlace creado</p>
            <p className="text-xs text-muted-foreground">
              La persona deberá ingresar con la cuenta de Google del correo
              invitado. No necesita crear una cuenta de PlumIA.
            </p>
            <InputGroup className="h-10 bg-background">
              <InputGroupInput
                value={createdLink}
                readOnly
                className="text-xs"
                aria-label="Enlace compartido"
              />
              <InputGroupAddon align="inline-end" className="gap-0.5 pr-1">
                <InputGroupButton
                  size="icon-sm"
                  onClick={() => void copyCreatedLink()}
                  aria-label="Copiar enlace"
                >
                  {copied ? <Check /> : <Copy />}
                </InputGroupButton>
                <InputGroupButton size="icon-sm" asChild>
                  <a
                    href={createdLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir versión compartida"
                  >
                    <ExternalLink />
                  </a>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </section>
        )}

        <section className="flex min-h-0 flex-1 flex-col gap-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Invitaciones</h3>
          <div className="min-h-0 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <Spinner className="size-5" />
              </div>
            ) : shares.length === 0 ? (
              <Empty className="min-h-32 border bg-muted/30 p-4">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Mail />
                  </EmptyMedia>
                  <EmptyTitle>Sin invitaciones</EmptyTitle>
                  <EmptyDescription>
                    Todavía no compartiste ninguna versión de este libro.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
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
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {permissionLabels[share.permission]}
                        </span>
                        <Badge
                          variant={
                            share.status === "ACCEPTED"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {getShareStatusLabel(share.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Versión del {new Date(share.frozenAt).toLocaleString("es-UY")}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" asChild>
                      <a
                        href={`/shared/${share.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${share.status === "REVOKED" ? "Ver historial" : "Abrir versión"} compartida con ${share.invitedEmail}`}
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                    {share.status !== "REVOKED" && (
                      <Button
                        type="button"
                        variant="destructive"
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
          </div>
        </section>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
