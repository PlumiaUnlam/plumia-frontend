"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Camera, CircleAlert, KeyRound, LogOut, Monitor, Moon, Settings, SlidersHorizontal, Sun, Trash2, UserRound } from "lucide-react"
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
import {
  getAiSettings,
  removeGeminiApiKey,
  saveGeminiApiKey,
  updateAutoAnalyzeOnAutosave,
  updateEntityRecognitionThresholds,
  DEFAULT_ENTITY_RECOGNITION_THRESHOLDS,
  type AiSettings,
  type EntityRecognitionThresholds,
} from "@/services/ai-settings.service"
import {
  getProjectEntityRecognitionSettings,
  updateProjectEntityRecognitionSettings,
} from "@/services/entity-recognition-settings.service"
import { getDashboardProjects, type ProjectResponse } from "@/services/project.service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

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

type ProfileSection = "account" | "ai" | "entityRecognition"

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
  const [profileSection, setProfileSection] = useState<ProfileSection>("account")
  const [displayName, setDisplayName] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)
  const [aiKey, setAiKey] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)
  const [autoAnalysisSaving, setAutoAnalysisSaving] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [autoAnalysisError, setAutoAnalysisError] = useState<string | null>(null)
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const [removeAiKeyOpen, setRemoveAiKeyOpen] = useState(false)
  const [removingAiKey, setRemovingAiKey] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [entityThresholds, setEntityThresholds] = useState<EntityRecognitionThresholds>(
    DEFAULT_ENTITY_RECOGNITION_THRESHOLDS,
  )
  const [entityRecognitionSaving, setEntityRecognitionSaving] = useState(false)
  const [entityRecognitionError, setEntityRecognitionError] = useState<string | null>(null)
  const [entityRecognitionNotice, setEntityRecognitionNotice] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [importantEntityNames, setImportantEntityNames] = useState<string[]>([])
  const [newImportantEntityName, setNewImportantEntityName] = useState("")
  const [projectNamesLoading, setProjectNamesLoading] = useState(false)
  const [projectNamesError, setProjectNamesError] = useState<string | null>(null)
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

  const loadAiSettings = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const settings = await getAiSettings()
      setAiSettings(settings)
      setEntityThresholds(
        settings.entityExtractionThresholds ?? DEFAULT_ENTITY_RECOGNITION_THRESHOLDS,
      )
    } catch {
      setAiError("No pudimos cargar la configuraciÃ³n de IA.")
    } finally {
      setAiLoading(false)
    }
  }

  const loadProjects = async () => {
    setProjectsLoading(true)
    try {
      const nextProjects = await getDashboardProjects()
      setProjects(nextProjects)
      const nextProjectId =
        (selectedProjectId && nextProjects.some((project) => project.id === selectedProjectId)
          ? selectedProjectId
          : nextProjects[0]?.id) ?? null
      setSelectedProjectId(nextProjectId)
      if (nextProjectId) {
        void loadProjectEntityNames(nextProjectId)
      }
    } catch {
      setEntityRecognitionError("No pudimos cargar tus proyectos.")
    } finally {
      setProjectsLoading(false)
    }
  }

  const openProfileDialog = () => {
    setDisplayName(currentDisplayName)
    setProfileSection("account")
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    setError(null)
    setAiKey("")
    setAiNotice(null)
    setAutoAnalysisError(null)
    setEntityRecognitionError(null)
    setEntityRecognitionNotice(null)
    setProjectNamesError(null)
    setNewImportantEntityName("")
    void loadAiSettings()
    void loadProjects()
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

  const handleAiSubmit = async () => {
    const normalizedKey = aiKey.trim()
    if (!normalizedKey) {
      setAiError("IngresÃ¡ una API Key de Gemini.")
      return
    }

    setAiSaving(true)
    setAiError(null)
    setAiNotice(null)
    try {
      const nextSettings = await saveGeminiApiKey(normalizedKey)
      setAiSettings(nextSettings)
      setAiKey("")
      setAiNotice("La API Key de Gemini fue guardada de forma segura.")
    } catch {
      setAiError("No pudimos guardar la API Key. IntentÃ¡ nuevamente.")
    } finally {
      setAiSaving(false)
    }
  }

  const handleRemoveAiKey = async () => {
    setRemovingAiKey(true)
    setAiError(null)
    try {
      await removeGeminiApiKey()
      setAiSettings((current) => ({
        configured: false,
        keyPrefix: null,
        updatedAt: null,
        autoAnalyzeOnAutosave: current?.autoAnalyzeOnAutosave ?? true,
        entityExtractionThresholds:
          current?.entityExtractionThresholds ?? DEFAULT_ENTITY_RECOGNITION_THRESHOLDS,
      }))
      setAiKey("")
      setAiNotice("La API Key propia fue eliminada.")
      setRemoveAiKeyOpen(false)
    } catch {
      setAiError("No pudimos eliminar la API Key. IntentÃ¡ nuevamente.")
    } finally {
      setRemovingAiKey(false)
    }
  }

  const handleAutoAnalysisChange = async (enabled: boolean) => {
    if (autoAnalysisSaving) return

    setAutoAnalysisSaving(true)
    setAutoAnalysisError(null)
    setAiNotice(null)
    try {
      const nextSettings = await updateAutoAnalyzeOnAutosave(enabled)
      setAiSettings(nextSettings)
      setAiNotice(
        enabled
          ? "El analisis automatico al guardar fue activado."
          : "El analisis automatico al guardar fue desactivado.",
      )
    } catch {
      setAutoAnalysisError(
        "No pudimos actualizar la preferencia de analisis automatico.",
      )
    } finally {
      setAutoAnalysisSaving(false)
    }
  }

  const handleEntityRecognitionSubmit = async () => {
    setEntityRecognitionSaving(true)
    setEntityRecognitionError(null)
    setEntityRecognitionNotice(null)
    setProjectNamesError(null)
    try {
      const [nextSettings, nextProjectSettings] = await Promise.all([
        updateEntityRecognitionThresholds(entityThresholds),
        selectedProjectId
          ? updateProjectEntityRecognitionSettings(
              selectedProjectId,
              importantEntityNames,
            )
          : Promise.resolve(null),
      ])
      setAiSettings(nextSettings)
      setEntityThresholds(nextSettings.entityExtractionThresholds)
      if (nextProjectSettings) {
        setImportantEntityNames(nextProjectSettings.importantEntityNames)
      }
      setEntityRecognitionNotice("La precisión de reconocimiento fue guardada.")
    } catch {
      setEntityRecognitionError("No pudimos guardar la precisión de reconocimiento.")
    } finally {
      setEntityRecognitionSaving(false)
    }
  }

  const loadProjectEntityNames = async (projectId: string) => {
    setProjectNamesLoading(true)
    setProjectNamesError(null)
    try {
      const settings = await getProjectEntityRecognitionSettings(projectId)
      setImportantEntityNames(settings.importantEntityNames)
    } catch {
      setProjectNamesError("No pudimos cargar la lista de entidades importantes.")
      setImportantEntityNames([])
    } finally {
      setProjectNamesLoading(false)
    }
  }

  const addImportantEntityName = () => {
    const value = newImportantEntityName.trim()
    if (!value) return
    const normalize = (name: string) =>
      name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    if (!importantEntityNames.some((name) => normalize(name) === normalize(value))) {
      setImportantEntityNames((current) => [...current, value])
    }
    setNewImportantEntityName("")
    setProjectNamesError(null)
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
            Configuración
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
            Configuración
          </span>
        }
        description="Administrá tus datos y la configuración de IA de tu cuenta."
        size="md"
        submitLabel={
          profileSection === "account"
            ? "Guardar cambios"
            : profileSection === "ai"
              ? "Guardar API Key"
              : "Guardar configuración"
        }
        submitDisabled={profileSection === "ai" && !aiKey.trim()}
        loading={
          profileSection === "account"
            ? saving
            : profileSection === "ai"
              ? aiSaving || autoAnalysisSaving
              : entityRecognitionSaving
        }
        onSubmit={
          profileSection === "account"
            ? handleProfileSubmit
            : profileSection === "ai"
              ? handleAiSubmit
              : handleEntityRecognitionSubmit
        }
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
      <Tabs
        value={profileSection}
        onValueChange={(value) => setProfileSection(value as ProfileSection)}
        className="min-h-0"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">
            <UserRound />
            Datos de la cuenta
          </TabsTrigger>
          <TabsTrigger value="ai">
            <KeyRound />
            Configuración de IA
          </TabsTrigger>
          <TabsTrigger value="entityRecognition">
            <SlidersHorizontal />
            Reconocimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-0 space-y-4">
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
        </TabsContent>

        <TabsContent value="entityRecognition" className="mt-0 space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Precisión de entidades nuevas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajustá la relevancia narrativa mínima para que una entidad nueva llegue a propuestas.
              Las entidades confirmadas continúan analizándose aunque tengan baja relevancia.
            </p>
          </div>

          {Object.entries(entityThresholds).map(([type, value]) => (
            <Field key={type}>
              <FieldLabel htmlFor={`entity-threshold-${type}`}>{type}</FieldLabel>
              <div className="flex items-center gap-3">
                <input
                  id={`entity-threshold-${type}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={value}
                  onChange={(event) =>
                    setEntityThresholds((current) => ({
                      ...current,
                      [type]: Number(event.target.value),
                    }))
                  }
                  className="min-w-0 flex-1"
                />
                <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                  {value.toFixed(2)}
                </span>
              </div>
            </Field>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEntityThresholds(DEFAULT_ENTITY_RECOGNITION_THRESHOLDS)}
            disabled={entityRecognitionSaving}
          >
            Restaurar valores recomendados
          </Button>

          {entityRecognitionError && <FieldError>{entityRecognitionError}</FieldError>}
          {entityRecognitionNotice && (
            <Alert>
              <AlertDescription>{entityRecognitionNotice}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">Entidades importantes del proyecto</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estas entidades se proponen aunque no superen el umbral. La coincidencia usa el
                nombre completo o alias, ignorando mayúsculas y acentos.
              </p>
            </div>
            <Field>
              <FieldLabel htmlFor="entity-recognition-project">Proyecto</FieldLabel>
              <select
                id="entity-recognition-project"
                value={selectedProjectId ?? ""}
                onChange={(event) => {
                  const projectId = event.target.value || null
                  setSelectedProjectId(projectId)
                  if (projectId) {
                    void loadProjectEntityNames(projectId)
                  } else {
                    setImportantEntityNames([])
                  }
                }}
                disabled={projectsLoading || projectNamesLoading || projects.length === 0}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Seleccioná un proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </Field>
            {selectedProjectId && (
              <>
                <div className="flex gap-2">
                  <Input
                    value={newImportantEntityName}
                    onChange={(event) => setNewImportantEntityName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addImportantEntityName()
                      }
                    }}
                    placeholder="Ej. La lámpara de obsidiana"
                    disabled={projectNamesLoading || entityRecognitionSaving}
                  />
                  <Button type="button" variant="outline" onClick={addImportantEntityName}>
                    Agregar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {importantEntityNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                      onClick={() =>
                        setImportantEntityNames((current) => current.filter((item) => item !== name))
                      }
                      title="Quitar entidad importante"
                    >
                      {name} ×
                    </button>
                  ))}
                  {importantEntityNames.length === 0 && !projectNamesLoading && (
                    <p className="text-xs text-muted-foreground">No hay entidades agregadas.</p>
                  )}
                </div>
                {projectNamesError && <FieldError>{projectNamesError}</FieldError>}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-0 space-y-4">
          {aiLoading ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Cargando configuración de IA...
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  Extracción de entidades e inconsistencias
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Podés usar tu propia API Key de Gemini. Se almacena cifrada y
                  nunca volvemos a mostrarla completa.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Estado: {aiSettings?.configured ? "Configurada" : "Se usa la clave del servidor"}
                  {aiSettings?.keyPrefix ? ` (${aiSettings.keyPrefix})` : ""}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium">Analizar automaticamente al guardar</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si lo desactivas, los cambios se guardan sin utilizar IA.
                    Podras usar Analizar cambios desde el editor cuando quieras.
                  </p>
                </div>
                <Switch
                  checked={aiSettings?.autoAnalyzeOnAutosave ?? true}
                  onCheckedChange={handleAutoAnalysisChange}
                  disabled={autoAnalysisSaving || aiLoading}
                  aria-label="Analizar automaticamente al guardar"
                />
              </div>

              {autoAnalysisError && <FieldError>{autoAnalysisError}</FieldError>}

              <Field>
                <FieldLabel htmlFor="gemini-api-key">API Key de Gemini</FieldLabel>
                <Input
                  id="gemini-api-key"
                  type="password"
                  value={aiKey}
                  onChange={(event) => {
                    setAiKey(event.target.value)
                    setAiError(null)
                    setAiNotice(null)
                  }}
                  placeholder={
                    aiSettings?.configured
                      ? "Ingresá una nueva clave para reemplazarla"
                      : "Pegá tu API Key"
                  }
                  autoComplete="new-password"
                  disabled={aiSaving || removingAiKey}
                />
                <FieldDescription>
                  La clave se aplicará a todos tus proyectos de PlumIA.
                </FieldDescription>
              </Field>

              {aiError && <FieldError>{aiError}</FieldError>}
              {aiNotice && (
                <Alert>
                  <AlertDescription>{aiNotice}</AlertDescription>
                </Alert>
              )}

              {aiSettings?.configured && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setRemoveAiKeyOpen(true)}
                  disabled={aiSaving || removingAiKey}
                >
                  <Trash2 />
                  Eliminar API Key propia
                </Button>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
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

      <AlertDialog
        open={removeAiKeyOpen}
        onOpenChange={(open) => {
          if (!removingAiKey) setRemoveAiKeyOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu API Key de Gemini?</AlertDialogTitle>
            <AlertDialogDescription>
              Los próximos análisis volverán a utilizar la clave configurada por el servidor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingAiKey}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removingAiKey}
              onClick={(event) => {
                event.preventDefault()
                void handleRemoveAiKey()
              }}
            >
              {removingAiKey ? <Spinner /> : null}
              Eliminar API Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
