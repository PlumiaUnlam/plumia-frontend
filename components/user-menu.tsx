"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Camera, LogOut, Monitor, Moon, Settings, Sun, Trash2, UserRound } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

  return (
    <Avatar className={large ? undefined : "size-9"} size={large ? "lg" : "default"}>
      <AvatarFallback className={cn(inverted && "bg-white/15 text-white")}>
        {initials}
      </AvatarFallback>
      {src && failedSrc !== src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={large ? "40px" : "36px"}
          unoptimized
          className="z-10 rounded-full object-cover"
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
  const { firebaseUser, user, logout, updateUserProfile } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  let ThemeIcon = Monitor
  if (theme === "dark") {
    ThemeIcon = Moon
  } else if (theme === "light") {
    ThemeIcon = Sun
  }

  const currentDisplayName =
    firebaseUser?.displayName || user?.displayName || user?.name || "Usuario"
  const currentPhotoURL = firebaseUser?.photoURL || user?.avatarUrl || null
  const storedProfileUserId = currentPhotoURL?.match(/\/profiles\/([^/]+)\//)?.[1]
  const profileUserId = user?.id || storedProfileUserId || firebaseUser?.uid
  const currentAvatarSrc = profileUserId
    ? `/api/storage/profile-image/${profileUserId}`
    : currentPhotoURL
  const email = firebaseUser?.email || user?.email || ""
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

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <form onSubmit={handleProfileSubmit} className="contents">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserRound className="size-4" />
                Configurar perfil
              </DialogTitle>
              <DialogDescription>
                Elegí cómo querés aparecer dentro de PlumIA.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <ProfileAvatar
                src={avatarPreview || (!removeAvatar ? currentAvatarSrc : null)}
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
                    {currentPhotoURL || avatarFile ? "Cambiar imagen" : "Subir imagen"}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
