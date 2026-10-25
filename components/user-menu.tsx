"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Camera, CircleAlert, LogOut, Monitor, Moon, Settings, Sun, Trash2, UserRound } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { useAuth } from "@/contexts/AuthContext"
import { deleteAccountErrorMessage } from "@/helpers/api-errors"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormDialog } from "@/components/modal/form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { uploadProfileImage } from "@/services/upload.service"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

type UserMenuProps = {
  readonly inverted?: boolean
}

type ProfileAvatarProps = {
  readonly src: string | null
  readonly alt: string
  readonly initials: string
  readonly inverted?: boolean
  readonly large?: boolean
}

function ProfileAvatar({
  src,
  alt,
  initials,
  inverted = false,
  large = false,
}: ProfileAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  // Las iniciales solo van cuando NO hay imagen que mostrar. Dejar el
  // AvatarFallback montado atrás del `Image` hace que se vean a través de un
  // PNG con fondo transparente (un avatar recortado), que es justamente el
  // caso donde más se nota. Y si la imagen falla, recién ahí vuelven.
  const hayImagen = Boolean(src) && failedSrc !== src

  return (
    <Avatar className={large ? undefined : "size-9"} size={large ? "lg" : "default"}>
      {!hayImagen && (
        <AvatarFallback className={cn(inverted && "bg-white/15 text-white")}>
          {initials}
        </AvatarFallback>
      )}
      {hayImagen && src && (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          unoptimized
          className="absolute inset-0 z-10 rounded-full object-cover"
          sizes={large ? "2.5rem" : "2.25rem"}
          onError={() => setFailedSrc(src)}
        />
      )}
    </Avatar>
  )
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.split("@")[0] || "Usuario"

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

export function UserMenu({ inverted = false }: UserMenuProps) {
  const router = useRouter()
  const { setTheme, theme } = useTheme()
  const { firebaseUser, user, logout, deleteAccount, updateUserProfile } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  let ThemeIcon = Monitor
  if (theme === "dark") {
    ThemeIcon = Moon
  } else if (theme === "light") {
    ThemeIcon = Sun
  }

  const currentDisplayName =
    user?.displayName || firebaseUser?.displayName || user?.name || "Usuario"
  const currentPhotoURL = user?.avatarUrl || firebaseUser?.photoURL || null
  const storedProfileUserId = currentPhotoURL?.match(/\/profiles\/([^/]+)\//)?.[1]
  const profileUserId = user?.id || storedProfileUserId || firebaseUser?.uid
  const currentAvatarSrc =
    user?.avatarUrl && profileUserId
      ? `/api/storage/profile-image/${profileUserId}?v=${Date.parse(user.updatedAt)}`
      : null
  // Lo que se muestra en el diálogo, que no siempre coincide con lo guardado:
  // "Quitar" pone la vista previa en null sin borrar todavía `currentPhotoURL`,
  // y ahí el botón tiene que decir "Subir imagen" porque ya no hay imagen que
  // cambiar.
  const previewSrc = avatarPreview || (!removeAvatar ? currentAvatarSrc : null)
  const email = user?.email || firebaseUser?.email || ""
  const initials = useMemo(
    () => getInitials(currentDisplayName, email),
    [currentDisplayName, email],
  )

  const openProfileDialog = () => {
    setDisplayName(currentDisplayName)
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    setError(null)
    setProfileOpen(true)
  }

  const openDeleteDialog = () => {
    setConfirmEmail("")
    setDeleteError(null)
    setDeleteOpen(true)
  }

  const closeDeleteDialog = () => {
    setDeleteOpen(false)
    setConfirmEmail("")
    setDeleteError(null)
  }

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError("Elegí una imagen JPG, PNG, WebP o AVIF.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("La imagen no puede superar los 5 MB.")
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setRemoveAvatar(false)
    setError(null)
  }

  const handleProfileSubmit = async () => {
    const normalizedName = displayName.trim()

    if (!normalizedName) {
      setError("Ingresá un nombre para mostrar.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      let nextPhotoURL = removeAvatar ? null : currentPhotoURL
      if (avatarFile && profileUserId) {
        const uploaded = await uploadProfileImage(profileUserId, avatarFile)
        nextPhotoURL = uploaded.publicUrl
      }

      await updateUserProfile({
        displayName: normalizedName,
        photoURL: nextPhotoURL,
      })
      setProfileOpen(false)
    } catch {
      setError("No pudimos guardar los cambios. Intentá nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      await logout()
      router.replace("/login")
    } catch {
      setLoggingOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteAccount()
      closeDeleteDialog()
      // El diálogo de perfil queda abierto debajo de la confirmación: lo
      // cerramos nosotros para que no se vea mientras se navega.
      setProfileOpen(false)
      router.replace("/login")
    } catch (err) {
      setDeleteError(deleteAccountErrorMessage(err))
      setDeleting(false)
    }
  }

  const emailMatchesConfirmation = confirmEmail.trim() === email

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full",
              inverted && "text-white hover:bg-white/10 hover:text-white",
            )}
            aria-label="Abrir menú de usuario"
          >
            <ProfileAvatar
              src={currentAvatarSrc}
              alt={currentDisplayName}
              initials={initials}
              inverted={inverted}
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2 font-normal">
            <ProfileAvatar
              src={currentAvatarSrc}
              alt={currentDisplayName}
              initials={initials}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {currentDisplayName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {email}
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={openProfileDialog}>
            <Settings />
            Configurar perfil
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ThemeIcon />
              Tema
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40">
              <DropdownMenuRadioGroup
                value={theme ?? "system"}
                onValueChange={setTheme}
              >
                <DropdownMenuRadioItem value="light">
                  <Sun />
                  Claro
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon />
                  Oscuro
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor />
                  Sistema
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={loggingOut}
            onSelect={() => void handleLogout()}
          >
            {loggingOut ? <Spinner /> : <LogOut />}
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title={
          <span className="flex items-center gap-2">
            <UserRound className="size-4" />
            Configurar perfil
          </span>
        }
        description="Elegí cómo querés aparecer dentro de PlumIA."
        size="sm"
        submitLabel="Guardar cambios"
        loading={saving}
        onSubmit={handleProfileSubmit}
        onInteractOutside={(event) => {
          // La confirmación de eliminación vive en un portal propio, así que
          // sus eventos se ven como "afuera" de este diálogo y Radix lo
          // cerraría. Se decide por el DOM y no por el estado `deleteOpen`:
          // Radix emite el evento más de una vez por click y la última
          // llegada ocurre recién cuando `deleteOpen` ya volvió a false.
          const confirmacionMontada = document.querySelector(
            '[data-slot="alert-dialog-content"]',
          )
          if (confirmacionMontada) event.preventDefault()
        }}
      >
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <ProfileAvatar
          src={previewSrc}
          alt="Vista previa"
          initials={getInitials(displayName, email)}
          large
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName || "Usuario"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="profile-display-name">Nombre visible</FieldLabel>
          <Input
            id="profile-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            maxLength={100}
            disabled={saving}
          />
          <FieldDescription>
            Es el nombre que aparece como autor en tus libros exportados.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Foto de perfil</FieldLabel>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={handleAvatarChange}
            disabled={saving}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <Camera />
              {previewSrc ? "Cambiar imagen" : "Subir imagen"}
            </Button>
            {(currentPhotoURL || avatarFile) && !removeAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAvatarFile(null)
                  setAvatarPreview(null)
                  setRemoveAvatar(true)
                }}
                disabled={saving}
              >
                <Trash2 />
                Quitar
              </Button>
            )}
          </div>
          <FieldDescription>
            JPG, PNG, WebP o AVIF. Máximo 5 MB.
          </FieldDescription>
        </Field>
        {error && <FieldError>{error}</FieldError>}
      </FieldGroup>

      {/* Zona de peligro: deliberadamente separada de los campos
          editables y fuera del FieldGroup, para que no se confunda con
          el formulario de perfil. `type="button"` explícito: esto vive
          dentro del form de "Guardar cambios" y no debe heredar submit,
          o apretar Enter en un input borraría la cuenta. */}
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-sm font-medium text-destructive">
          Eliminar cuenta
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Se borran tus proyectos, capítulos, escenas e imágenes. Esta
          acción no se puede deshacer.
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={openDeleteDialog}
          disabled={saving}
        >
          <Trash2 />
          Eliminar cuenta
        </Button>
      </div>
      </FormDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (open) {
            setDeleteOpen(true)
            return
          }
          // Mientras se está borrando no se cierra: el error tiene que verse.
          if (!deleting) closeDeleteDialog()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se van a borrar tus proyectos, capítulos, escenas, imágenes y tu
              acceso a PlumIA. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="confirm-delete-email">
              Escribí tu email para confirmar
            </FieldLabel>
            <Input
              id="confirm-delete-email"
              type="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              placeholder={email}
              autoComplete="off"
              disabled={deleting}
            />
          </Field>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting || !emailMatchesConfirmation}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteAccount()
              }}
            >
              {deleting ? <Spinner className="size-4" /> : <Trash2 />}
              {deleting ? "Eliminando…" : "Eliminar mi cuenta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
