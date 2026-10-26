"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Camera, CircleAlert, KeyRound, LogOut, Monitor, Moon, Search, Settings, SlidersHorizontal, Sun, Trash2, UserRound, X } from "lucide-react"
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
  type RejectedEntityRecognitionProposal,
} from "@/services/entity-recognition-settings.service"
import {
  getDashboardProjects,
  updateProject,
  type ProjectResponse,
} from "@/services/project.service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

function normalizeEntityName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  CHARACTER: "Personaje",
  LOCATION: "Ubicaci\u00f3n",
  OBJECT: "Objeto",
  ORGANIZATION: "Organizaci\u00f3n",
  EVENT: "Evento",
  CONCEPT: "Concepto",
}

function getEntityTypeLabel(type: string | null) {
  if (!type) return "Entidad"
  return ENTITY_TYPE_LABELS[type.toUpperCase()] ?? type
}

function getProjectWorldRules(project: ProjectResponse | undefined) {
  const genreRules = project?.genreRules
  if (!genreRules || Array.isArray(genreRules)) return []

  const rules = genreRules.rules
  return Array.isArray(rules)
    ? rules.filter((rule): rule is string => typeof rule === "string")
    : []
}

function normalizeWorldRule(rule: string) {
  return rule.trim().toLocaleLowerCase()
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

type UserMenuProps = {
  readonly inverted?: boolean
}

type ProfileSection =
  | "account"
  | "ai"
  | "entityRecognition"
  | "inconsistencies"
type EntityCatalogSection = "important" | "ignored" | "rejected"

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
  const [worldRules, setWorldRules] = useState<string[]>([])
  const [newWorldRule, setNewWorldRule] = useState("")
  const [worldRulesSearch, setWorldRulesSearch] = useState("")
  const [worldRulesSaving, setWorldRulesSaving] = useState(false)
  const [worldRulesError, setWorldRulesError] = useState<string | null>(null)
  const [worldRulesNotice, setWorldRulesNotice] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [importantEntityNames, setImportantEntityNames] = useState<string[]>([])
  const [newImportantEntityName, setNewImportantEntityName] = useState("")
  const [ignoredEntityNames, setIgnoredEntityNames] = useState<string[]>([])
  const [newIgnoredEntityName, setNewIgnoredEntityName] = useState("")
  const [rejectedEntityProposals, setRejectedEntityProposals] = useState<RejectedEntityRecognitionProposal[]>([])
  const [entityCatalogOpen, setEntityCatalogOpen] = useState(false)
  const [entityCatalogSection, setEntityCatalogSection] = useState<EntityCatalogSection>("important")
  const [importantEntitySearch, setImportantEntitySearch] = useState("")
  const [ignoredEntitySearch, setIgnoredEntitySearch] = useState("")
  const [rejectedEntitySearch, setRejectedEntitySearch] = useState("")
  const [rejectedEntityTypeFilter, setRejectedEntityTypeFilter] = useState("ALL")
  const [projectNamesLoading, setProjectNamesLoading] = useState(false)
  const [projectNamesError, setProjectNamesError] = useState<string | null>(null)
  const [profileCloseWarningOpen, setProfileCloseWarningOpen] = useState(false)
  const entityCatalogOpenRef = useRef(false)
  const entityRecognitionBaselineRef = useRef({
    projectId: null as string | null,
    importantEntityNames: [] as string[],
    ignoredEntityNames: [] as string[],
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setEntityCatalogVisibility = (open: boolean) => {
    entityCatalogOpenRef.current = open
    setEntityCatalogOpen(open)
  }

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
      setAiError("No pudimos cargar la configuración de IA.")
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
      setWorldRules(
        getProjectWorldRules(nextProjects.find((project) => project.id === nextProjectId)),
      )
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
    setProfileCloseWarningOpen(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    setError(null)
    setAiKey("")
    setAiNotice(null)
    setAutoAnalysisError(null)
    setEntityRecognitionError(null)
    setEntityRecognitionNotice(null)
    setWorldRulesError(null)
    setWorldRulesNotice(null)
    setNewWorldRule("")
    setWorldRulesSearch("")
    setProjectNamesError(null)
    setNewImportantEntityName("")
    setNewIgnoredEntityName("")
    setEntityCatalogVisibility(false)
    setEntityCatalogSection("important")
    setImportantEntitySearch("")
    setIgnoredEntitySearch("")
    setRejectedEntitySearch("")
    setRejectedEntityTypeFilter("ALL")
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
      setAiError("Ingresá una API Key de Gemini.")
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
      setAiError("No pudimos guardar la API Key. Intentá nuevamente.")
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
      setAiError("No pudimos eliminar la API Key. Intentá nuevamente.")
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
              { importantEntityNames, ignoredEntityNames },
            )
          : Promise.resolve(null),
      ])
      setAiSettings(nextSettings)
      setEntityThresholds(nextSettings.entityExtractionThresholds)
      if (nextProjectSettings) {
        setImportantEntityNames(nextProjectSettings.importantEntityNames)
        setIgnoredEntityNames(nextProjectSettings.ignoredEntityNames)
        setRejectedEntityProposals(nextProjectSettings.rejectedEntities)
        entityRecognitionBaselineRef.current = {
          projectId: selectedProjectId,
          importantEntityNames: [...nextProjectSettings.importantEntityNames],
          ignoredEntityNames: [...nextProjectSettings.ignoredEntityNames],
        }
      }
      setEntityRecognitionNotice("La precisión de reconocimiento fue guardada.")
    } catch {
      setEntityRecognitionError("No pudimos guardar la precisión de reconocimiento.")
    } finally {
      setEntityRecognitionSaving(false)
    }
  }

  const addWorldRule = () => {
    const value = newWorldRule.trim()
    if (!value) return

    if (!worldRules.some((rule) => normalizeWorldRule(rule) === normalizeWorldRule(value))) {
      setWorldRules((current) => [...current, value])
    }
    setNewWorldRule("")
    setWorldRulesError(null)
    setWorldRulesNotice(null)
  }

  const handleWorldRulesSubmit = async () => {
    if (!selectedProjectId) {
      setWorldRulesError("Selecciona un proyecto para guardar sus reglas.")
      return
    }

    const selectedProject = projects.find((project) => project.id === selectedProjectId)
    const currentGenreRules =
      selectedProject?.genreRules && !Array.isArray(selectedProject.genreRules)
        ? selectedProject.genreRules
        : {}

    setWorldRulesSaving(true)
    setWorldRulesError(null)
    setWorldRulesNotice(null)
    try {
      const savedProject = await updateProject(selectedProjectId, {
        genreRules: {
          ...currentGenreRules,
          rules: worldRules,
        },
      })
      setProjects((current) =>
        current.map((project) => (project.id === savedProject.id ? savedProject : project)),
      )
      setWorldRules(getProjectWorldRules(savedProject))
      setWorldRulesNotice("Las reglas del mundo fueron guardadas.")
    } catch {
      setWorldRulesError("No pudimos guardar las reglas del mundo.")
    } finally {
      setWorldRulesSaving(false)
    }
  }

  const loadProjectEntityNames = async (projectId: string) => {
    setProjectNamesLoading(true)
    setProjectNamesError(null)
    try {
      const settings = await getProjectEntityRecognitionSettings(projectId)
      setImportantEntityNames(settings.importantEntityNames)
      setIgnoredEntityNames(settings.ignoredEntityNames)
      setRejectedEntityProposals(settings.rejectedEntities)
      entityRecognitionBaselineRef.current = {
        projectId,
        importantEntityNames: [...settings.importantEntityNames],
        ignoredEntityNames: [...settings.ignoredEntityNames],
      }
    } catch {
      setProjectNamesError("No pudimos cargar la lista de entidades importantes.")
      setImportantEntityNames([])
      setIgnoredEntityNames([])
      setRejectedEntityProposals([])
      entityRecognitionBaselineRef.current = {
        projectId,
        importantEntityNames: [],
        ignoredEntityNames: [],
      }
    } finally {
      setProjectNamesLoading(false)
    }
  }

  const addImportantEntityName = () => {
    const value = newImportantEntityName.trim()
    if (!value) return
    if (!importantEntityNames.some((name) => normalizeEntityName(name) === normalizeEntityName(value))) {
      setImportantEntityNames((current) => [...current, value])
    }
    setNewImportantEntityName("")
    setProjectNamesError(null)
  }

  const addIgnoredEntityName = () => {
    const value = newIgnoredEntityName.trim()
    if (!value) return
    if (!ignoredEntityNames.some((name) => normalizeEntityName(name) === normalizeEntityName(value))) {
      setIgnoredEntityNames((current) => [...current, value])
    }
    setNewIgnoredEntityName("")
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
  const filterEntityNames = (names: string[], search: string) => {
    const normalizedSearch = normalizeEntityName(search)
    if (!normalizedSearch) return names
    return names.filter((name) => normalizeEntityName(name).includes(normalizedSearch))
  }
  const filteredImportantEntityNames = filterEntityNames(
    importantEntityNames,
    importantEntitySearch,
  )
  const filteredIgnoredEntityNames = filterEntityNames(
    ignoredEntityNames,
    ignoredEntitySearch,
  )
  const filteredRejectedEntityProposals = rejectedEntityProposals.filter((proposal) => {
    const searchText = normalizeEntityName(
      [proposal.name, ...proposal.aliases].join(" "),
    )
    const matchesSearch =
      !normalizeEntityName(rejectedEntitySearch) ||
      searchText.includes(normalizeEntityName(rejectedEntitySearch))
    const matchesType =
      rejectedEntityTypeFilter === "ALL" ||
      proposal.type?.toUpperCase() === rejectedEntityTypeFilter
    return matchesSearch && matchesType
  })
  const normalizedWorldRulesSearch = normalizeEntityName(worldRulesSearch)
  const filteredWorldRules = worldRules.filter(
    (rule) =>
      !normalizedWorldRulesSearch ||
      normalizeEntityName(rule).includes(normalizedWorldRulesSearch),
  )

  const hasUnsavedProfileChanges = () => {
    const savedThresholds =
      aiSettings?.entityExtractionThresholds ?? DEFAULT_ENTITY_RECOGNITION_THRESHOLDS
    const thresholdsChanged = Object.entries(entityThresholds).some(
      ([type, value]) => savedThresholds[type as keyof EntityRecognitionThresholds] !== value,
    )
    const entityBaseline = entityRecognitionBaselineRef.current
    const entityListsChanged =
      entityBaseline.projectId === selectedProjectId &&
      (!areStringArraysEqual(importantEntityNames, entityBaseline.importantEntityNames) ||
        !areStringArraysEqual(ignoredEntityNames, entityBaseline.ignoredEntityNames))
    const savedWorldRules = getProjectWorldRules(
      projects.find((project) => project.id === selectedProjectId),
    )
    const worldRulesChanged =
      selectedProjectId !== null && !areStringArraysEqual(worldRules, savedWorldRules)

    return (
      displayName.trim() !== currentDisplayName.trim() ||
      avatarFile !== null ||
      avatarPreview !== null ||
      removeAvatar ||
      aiKey.trim().length > 0 ||
      thresholdsChanged ||
      entityListsChanged ||
      newImportantEntityName.trim().length > 0 ||
      newIgnoredEntityName.trim().length > 0 ||
      worldRulesChanged ||
      newWorldRule.trim().length > 0
    )
  }

  const requestProfileClose = (open: boolean) => {
    if (open) {
      setProfileOpen(true)
      return
    }
    if (
      entityCatalogOpenRef.current ||
      document.querySelectorAll('[data-slot="dialog-content"]').length > 1
    ) {
      return
    }
    if (hasUnsavedProfileChanges()) {
      setProfileCloseWarningOpen(true)
      return
    }
    setProfileOpen(false)
  }

  const discardProfileChanges = () => {
    setProfileCloseWarningOpen(false)
    setProfileOpen(false)
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
        onOpenChange={requestProfileClose}
        title={
          <span className="flex items-center gap-2">
            <UserRound className="size-4" />
            Configuración
          </span>
        }
        description="Administrá tus datos y la configuración de IA de tu cuenta."
        size="lg"
        contentClassName="md:h-[min(88dvh,800px)]"
        submitLabel={
          profileSection === "account"
            ? "Guardar cambios"
            : profileSection === "ai"
              ? "Guardar API Key"
              : profileSection === "entityRecognition"
                ? "Guardar configuración"
                : "Guardar reglas"
        }
        submitDisabled={
          (profileSection === "ai" && !aiKey.trim()) ||
          (profileSection === "inconsistencies" && !selectedProjectId)
        }
        loading={
          profileSection === "account"
            ? saving
            : profileSection === "ai"
              ? aiSaving || autoAnalysisSaving
              : profileSection === "entityRecognition"
                ? entityRecognitionSaving
                : worldRulesSaving
        }
        onSubmit={
          profileSection === "account"
            ? handleProfileSubmit
            : profileSection === "ai"
              ? handleAiSubmit
              : profileSection === "entityRecognition"
                ? handleEntityRecognitionSubmit
                : handleWorldRulesSubmit
        }
        onInteractOutside={(event) => {
          if (
            entityCatalogOpenRef.current ||
            document.querySelectorAll('[data-slot="dialog-content"]').length > 1
          ) {
            event.preventDefault()
            return
          }
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
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="inconsistencies">
            <CircleAlert />
            Inconsistencias
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
                  className="min-w-0 flex-1 accent-primary"
                />
                <span className="w-10 text-right text-sm tabular-nums text-primary">
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
                  setWorldRules(
                    getProjectWorldRules(projects.find((project) => project.id === projectId)),
                  )
                  setWorldRulesError(null)
                  setWorldRulesNotice(null)
                  if (projectId) {
                    void loadProjectEntityNames(projectId)
                  } else {
                    setImportantEntityNames([])
                    setIgnoredEntityNames([])
                    setRejectedEntityProposals([])
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
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{importantEntityNames.length} importantes</p>
                    <p className="text-xs text-muted-foreground">
                      {ignoredEntityNames.length} ignoradas · {rejectedEntityProposals.length} rechazadas
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEntityCatalogVisibility(true)}
                    disabled={projectNamesLoading || entityRecognitionSaving}
                  >
                    Administrar entidades
                  </Button>
                </div>
                {/* The catalog modal owns the editable lists to keep this tab compact. */}
                {/*
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
                </>
                */}
                {projectNamesError && <FieldError>{projectNamesError}</FieldError>}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inconsistencies" className="mt-0 space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Reglas del mundo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Agrega reglas narrativas concretas para que el analisis pueda advertir cuando una
              escena contradice la logica de tu obra.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="world-rules-project">Proyecto</FieldLabel>
            <select
              id="world-rules-project"
              value={selectedProjectId ?? ""}
              onChange={(event) => {
                const projectId = event.target.value || null
                setSelectedProjectId(projectId)
                setWorldRulesSearch("")
                setWorldRules(
                  getProjectWorldRules(projects.find((project) => project.id === projectId)),
                )
                setWorldRulesError(null)
                setWorldRulesNotice(null)
                if (projectId) {
                  void loadProjectEntityNames(projectId)
                }
              }}
              disabled={projectsLoading || worldRulesSaving || projects.length === 0}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Selecciona un proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </Field>

          {selectedProjectId && (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="rounded-xl border border-dashed bg-muted/20 p-4">
                <div className="mb-3">
                  <p className="font-medium">Agregar regla al universo</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Escribi una regla concreta y verificable para tu historia.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="new-world-rule"
                    value={newWorldRule}
                    onChange={(event) => setNewWorldRule(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addWorldRule()
                      }
                    }}
                    placeholder="Ej. La magia requiere contacto visual"
                    disabled={worldRulesSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addWorldRule}
                    disabled={worldRulesSaving || !newWorldRule.trim()}
                  >
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Reglas configuradas</p>
                  <span className="text-xs text-muted-foreground">
                    {worldRules.length} {worldRules.length === 1 ? "regla" : "reglas"}
                  </span>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={worldRulesSearch}
                    onChange={(event) => setWorldRulesSearch(event.target.value)}
                    placeholder="Buscar una regla..."
                    aria-label="Buscar reglas del mundo"
                    className="pl-9"
                  />
                </div>
              </div>

              {filteredWorldRules.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredWorldRules.map((rule) => {
                    const ruleIndex = worldRules.indexOf(rule)
                    return (
                      <div
                        key={`${rule}-${ruleIndex}`}
                        className="group flex min-h-28 items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CircleAlert className="size-4" />
                        </div>
                        <p className="min-w-0 flex-1 text-sm leading-6">{rule}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
                          onClick={() =>
                            setWorldRules((current) =>
                              current.filter((_, itemIndex) => itemIndex !== ruleIndex),
                            )
                          }
                          disabled={worldRulesSaving}
                          aria-label="Eliminar regla del mundo"
                        >
                          <X />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  {worldRules.length === 0
                    ? "Todavia no hay reglas configuradas para este proyecto."
                    : "No se encontraron reglas con esa busqueda."}
                </div>
              )}

            </div>
          )}

          {worldRulesError && <FieldError>{worldRulesError}</FieldError>}
          {worldRulesNotice && (
            <Alert>
              <AlertDescription>{worldRulesNotice}</AlertDescription>
            </Alert>
          )}
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

      <FormDialog
        open={entityCatalogOpen}
        onOpenChange={(open) => {
          if (open) {
            setEntityCatalogVisibility(true)
            return
          }
          setEntityCatalogOpen(false)
          setProfileOpen(true)
          entityCatalogOpenRef.current = true
          window.setTimeout(() => {
            entityCatalogOpenRef.current = false
          }, 0)
        }}
        title="Administrar entidades"
        description="Configurá qué entidades deben priorizarse o ignorarse en este proyecto."
        size="md"
        layer={2}
        contentClassName="md:h-[min(78dvh,680px)]"
        bodyClassName="min-h-0"
      >
        <Tabs
          value={entityCatalogSection}
          onValueChange={(value) => setEntityCatalogSection(value as EntityCatalogSection)}
          className="min-h-0"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="important">Importantes</TabsTrigger>
            <TabsTrigger value="ignored">Ignoradas</TabsTrigger>
            <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
          </TabsList>

          <TabsContent value="important" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Se proponen aunque no superen el umbral de relevancia. La coincidencia ignora
              mayúsculas y acentos, pero exige el nombre completo o un alias.
            </p>
            <Input
              type="search"
              value={importantEntitySearch}
              onChange={(event) => setImportantEntitySearch(event.target.value)}
              placeholder="Buscar entidad importante"
              aria-label="Buscar entidad importante"
            />
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
              />
              <Button type="button" variant="outline" onClick={addImportantEntityName}>
                Agregar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredImportantEntityNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                  onClick={() =>
                    setImportantEntityNames((current) => current.filter((item) => item !== name))
                  }
                  title="Quitar entidad importante"
                >
                  <span>{name}</span>
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ))}
              {filteredImportantEntityNames.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {importantEntityNames.length === 0
                    ? "No hay entidades importantes."
                    : "No hay coincidencias."
                  }
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ignored" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Estas entidades no generarán propuestas nuevas para este proyecto. Las entidades
              ya confirmadas y sus actualizaciones continúan analizándose.
            </p>
            <Input
              type="search"
              value={ignoredEntitySearch}
              onChange={(event) => setIgnoredEntitySearch(event.target.value)}
              placeholder="Buscar entidad ignorada"
              aria-label="Buscar entidad ignorada"
            />
            <div className="flex gap-2">
              <Input
                value={newIgnoredEntityName}
                onChange={(event) => setNewIgnoredEntityName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    addIgnoredEntityName()
                  }
                }}
                placeholder="Ej. una escalera"
              />
              <Button type="button" variant="outline" onClick={addIgnoredEntityName}>
                Agregar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredIgnoredEntityNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                  onClick={() =>
                    setIgnoredEntityNames((current) => current.filter((item) => item !== name))
                  }
                  title="Quitar entidad ignorada"
                >
                  <span>{name}</span>
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ))}
              {filteredIgnoredEntityNames.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {ignoredEntityNames.length === 0
                    ? "No hay entidades ignoradas."
                    : "No hay coincidencias."
                  }
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Son propuestas que rechazaste anteriormente. Podés agregarlas a Ignoradas para
              evitar que vuelvan a proponerse en análisis futuros.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="search"
                value={rejectedEntitySearch}
                onChange={(event) => setRejectedEntitySearch(event.target.value)}
                placeholder="Buscar por nombre o alias"
                aria-label="Buscar entidades rechazadas"
              />
              <select
                value={rejectedEntityTypeFilter}
                onChange={(event) => setRejectedEntityTypeFilter(event.target.value)}
                aria-label="Filtrar entidades rechazadas por tipo"
                className="h-9 rounded-md border bg-background px-3 text-sm sm:w-44"
              >
                <option value="ALL">Todos los tipos</option>
                {Object.entries(ENTITY_TYPE_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {filteredRejectedEntityProposals.map((proposal) => {
                const isIgnored = ignoredEntityNames.some(
                  (name) => normalizeEntityName(name) === normalizeEntityName(proposal.name),
                )
                const isImportant = importantEntityNames.some(
                  (name) => normalizeEntityName(name) === normalizeEntityName(proposal.name),
                )
                return (
                  <div key={proposal.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{proposal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getEntityTypeLabel(proposal.type)}
                        {proposal.sceneTitle ? `\u00b7 ${proposal.sceneTitle}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant={isIgnored ? "secondary" : "outline"}
                        size="sm"
                        onClick={() =>
                          setIgnoredEntityNames((current) =>
                            isIgnored
                              ? current.filter(
                                  (name) => normalizeEntityName(name) !== normalizeEntityName(proposal.name),
                                )
                              : [...current, proposal.name],
                          )
                        }
                      >
                        {isIgnored ? "Quitar ignorada" : "Ignorar"}
                      </Button>
                      <Button
                        type="button"
                        variant={isImportant ? "secondary" : "outline"}
                        size="sm"
                        onClick={() =>
                          setImportantEntityNames((current) =>
                            isImportant
                              ? current.filter(
                                  (name) => normalizeEntityName(name) !== normalizeEntityName(proposal.name),
                                )
                              : [...current, proposal.name],
                          )
                        }
                      >
                        {isImportant ? "Quitar importante" : "Importante"}
                      </Button>
                    </div>
                  </div>
                )
              })}
              {filteredRejectedEntityProposals.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {rejectedEntityProposals.length === 0
                    ? "No hay propuestas rechazadas."
                    : "No hay coincidencias."
                  }
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </FormDialog>

      <AlertDialog
        open={profileCloseWarningOpen}
        onOpenChange={setProfileCloseWarningOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salir sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Hay cambios de configuracion pendientes. Si cerras ahora, se perderan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={discardProfileChanges}
            >
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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



