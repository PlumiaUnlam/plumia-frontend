"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Camera, CircleAlert, KeyRound, LogOut, Monitor, Moon, Search, Settings, SlidersHorizontal, Sun, Trash2, UserRound, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useSWRConfig } from "swr"

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
  removeProviderApiKey,
  saveAiProviderSettings,
  saveProviderApiKey,
  updateAutoAnalyzeOnAutosave,
  updateEntityRecognitionThresholds,
  DEFAULT_ENTITY_RECOGNITION_THRESHOLDS,
  type AiCredentialSource,
  type AiProvider,
  type AiSettings,
  type EntityRecognitionThresholds,
} from "@/services/ai-settings.service"
import {
  getProjectEntityRecognitionSettings,
  updateProjectEntityRecognitionSettings,
  type RejectedEntityRecognitionProposal,
} from "@/services/entity-recognition-settings.service"
import {
  DEFAULT_KNOWLEDGE_REVIEW_SETTINGS,
  getKnowledgeReviewSettings,
  updateKnowledgeReviewSettings,
  type KnowledgeReviewSettings,
} from "@/services/knowledge-review-settings.service"
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

function formatProviderKeyUpdatedAt(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(value),
  )
}

type UserMenuProps = {
  readonly inverted?: boolean
}

type ProfileSection =
  | "account"
  | "ai"
  | "entityRecognition"
  | "inconsistencies"

type ProfileSubmitHandlers = {
  account: () => Promise<void>
  ai: () => Promise<void>
  entityRecognition: () => Promise<void>
  inconsistencies: () => Promise<void>
}

function getProfileSubmitLabel(
  section: ProfileSection,
  hasUnsavedChanges: boolean,
) {
  if (!hasUnsavedChanges) return "Sin cambios pendientes"
  if (section === "ai") return "Guardar configuración de IA"
  if (section === "account") return "Guardar cambios"
  return "Guardar configuraci\u00f3n"
}

function getProfileLoadingState(
  section: ProfileSection,
  state: {
    account: boolean
    ai: boolean
    entityRecognition: boolean
    inconsistencies: boolean
  },
) {
  switch (section) {
    case "account":
      return state.account
    case "ai":
      return state.ai
    case "entityRecognition":
      return state.entityRecognition
    case "inconsistencies":
      return state.inconsistencies
  }
}

function getProfileSubmitHandler(
  section: ProfileSection,
  handlers: ProfileSubmitHandlers,
) {
  switch (section) {
    case "account":
      return handlers.account
    case "ai":
      return handlers.ai
    case "entityRecognition":
      return handlers.entityRecognition
    case "inconsistencies":
      return handlers.inconsistencies
  }
}

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
  const { mutate } = useSWRConfig()
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
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini")
  const [aiModel, setAiModel] = useState("")
  const [aiCredentialSource, setAiCredentialSource] =
    useState<AiCredentialSource>("SERVER")
  const [providerApiKeys, setProviderApiKeys] = useState<Record<AiProvider, string>>({
    gemini: "",
    anthropic: "",
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)
  const [providerKeySaving, setProviderKeySaving] = useState<AiProvider | null>(null)
  const [autoAnalysisSaving, setAutoAnalysisSaving] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiProviderError, setAiProviderError] = useState<string | null>(null)
  const [aiProviderNotice, setAiProviderNotice] = useState<string | null>(null)
  const [autoAnalysisError, setAutoAnalysisError] = useState<string | null>(null)
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const [removeAiKeyOpen, setRemoveAiKeyOpen] = useState(false)
  const [removingAiKey, setRemovingAiKey] = useState(false)
  const [providerToRemove, setProviderToRemove] = useState<AiProvider>("gemini")
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
  const [knowledgeReviewSettings, setKnowledgeReviewSettings] =
    useState<KnowledgeReviewSettings>(DEFAULT_KNOWLEDGE_REVIEW_SETTINGS)
  const [knowledgeReviewLoading, setKnowledgeReviewLoading] = useState(false)
  const [knowledgeReviewSaving, setKnowledgeReviewSaving] = useState(false)
  const [knowledgeReviewError, setKnowledgeReviewError] = useState<string | null>(null)
  const [knowledgeReviewNotice, setKnowledgeReviewNotice] = useState<string | null>(null)
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
  const [entityRecognitionBaseline, setEntityRecognitionBaseline] = useState({
    projectId: null as string | null,
    importantEntityNames: [] as string[],
    ignoredEntityNames: [] as string[],
  })
  const [knowledgeReviewBaseline, setKnowledgeReviewBaseline] = useState<{
    projectId: string | null
    stateTrackingEnabled: boolean
    stateReviewMode: KnowledgeReviewSettings["stateReviewMode"]
    stateConfidenceThreshold: number
    relationshipReviewMode: KnowledgeReviewSettings["relationshipReviewMode"]
    relationshipConfidenceThreshold: number
    crossChunkAuditMode: KnowledgeReviewSettings["crossChunkAuditMode"]
  }>({
    projectId: null,
    stateTrackingEnabled: false,
    stateReviewMode: "MANUAL",
    stateConfidenceThreshold: 0.9,
    relationshipReviewMode: "MANUAL",
    relationshipConfidenceThreshold: 0.9,
    crossChunkAuditMode: "ADJACENT_CHUNKS",
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
      setAiProvider(settings.provider)
      setAiModel(settings.model)
      setAiCredentialSource(settings.credentialSource)
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
        void loadReviewSettings(nextProjectId)
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
    setProviderApiKeys({ gemini: "", anthropic: "" })
    setAiProviderError(null)
    setAiProviderNotice(null)
    setAiNotice(null)
    setAutoAnalysisError(null)
    setEntityRecognitionError(null)
    setEntityRecognitionNotice(null)
    setWorldRulesError(null)
    setWorldRulesNotice(null)
    setKnowledgeReviewError(null)
    setKnowledgeReviewNotice(null)
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
    if (!aiModel.trim()) {
      setAiProviderError("Elegí o ingresá un modelo válido.")
      return
    }
    const selectedProvider = aiSettings?.providers.find(
      (provider) => provider.provider === aiProvider,
    )
    if (aiCredentialSource === "USER" && !selectedProvider?.userKeyConfigured) {
      setAiProviderError("Guardá una API Key propia para este proveedor antes de seleccionarlo.")
      return
    }
    if (aiCredentialSource === "SERVER" && !selectedProvider?.serverCredentialAvailable) {
      setAiProviderError("No hay una clave de PlumIA disponible para este proveedor.")
      return
    }

    setAiSaving(true)
    setAiProviderError(null)
    setAiProviderNotice(null)
    try {
      const nextSettings = await saveAiProviderSettings({
        provider: aiProvider,
        model: aiModel.trim(),
        credentialSource: aiCredentialSource,
      })
      setAiSettings(nextSettings)
      setAiProvider(nextSettings.provider)
      setAiModel(nextSettings.model)
      setAiCredentialSource(nextSettings.credentialSource)
      setAiProviderNotice("La configuración de proveedor y modelo fue guardada.")
    } catch {
      setAiProviderError("No pudimos guardar la configuración. Revisá la credencial seleccionada e intentá nuevamente.")
    } finally {
      setAiSaving(false)
    }
  }

  const handleSaveProviderKey = async (provider: AiProvider) => {
    const apiKey = providerApiKeys[provider].trim()
    if (!apiKey) {
      setAiError("Ingresá una API Key para guardar.")
      return
    }

    const configurationWasUnchanged = Boolean(
      aiSettings &&
        aiProvider === aiSettings.provider &&
        aiModel.trim() === aiSettings.model &&
        aiCredentialSource === aiSettings.credentialSource,
    )
    setProviderKeySaving(provider)
    setAiError(null)
    setAiNotice(null)
    try {
      const nextSettings = await saveProviderApiKey(provider, apiKey)
      setAiSettings(nextSettings)
      if (configurationWasUnchanged) {
        setAiProvider(nextSettings.provider)
        setAiModel(nextSettings.model)
        setAiCredentialSource(nextSettings.credentialSource)
      }
      setProviderApiKeys((current) => ({ ...current, [provider]: "" }))
      setAiNotice(`La API Key de ${provider === "gemini" ? "Gemini" : "Anthropic"} fue guardada de forma segura.`)
    } catch {
      setAiError("No pudimos guardar la API Key. Verificá el valor e intentá nuevamente.")
    } finally {
      setProviderKeySaving(null)
    }
  }

  const handleRemoveAiKey = async () => {
    setRemovingAiKey(true)
    setAiError(null)
    try {
      await removeProviderApiKey(providerToRemove)
      setAiSettings(await getAiSettings())
      setProviderApiKeys((current) => ({ ...current, [providerToRemove]: "" }))
      setAiNotice(`La API Key de ${providerToRemove === "gemini" ? "Gemini" : "Anthropic"} fue eliminada.`)
      setRemoveAiKeyOpen(false)
    } catch {
      setAiError("No pudimos eliminar la API Key. Si está en uso, cambiá primero la fuente de credencial.")
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
        setEntityRecognitionBaseline({
          projectId: selectedProjectId,
          importantEntityNames: [...nextProjectSettings.importantEntityNames],
          ignoredEntityNames: [...nextProjectSettings.ignoredEntityNames],
        })
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
    setKnowledgeReviewSaving(true)
    setWorldRulesError(null)
    setWorldRulesNotice(null)
    setKnowledgeReviewError(null)
    setKnowledgeReviewNotice(null)
    try {
      const [savedProject, savedReviewSettings] = await Promise.all([
        updateProject(selectedProjectId, {
          genreRules: {
            ...currentGenreRules,
            rules: worldRules,
          },
        }),
        updateKnowledgeReviewSettings(selectedProjectId, {
          stateTrackingEnabled: knowledgeReviewSettings.stateTrackingEnabled,
          stateReviewMode: knowledgeReviewSettings.stateReviewMode,
          stateConfidenceThreshold: knowledgeReviewSettings.stateConfidenceThreshold,
          relationshipReviewMode: knowledgeReviewSettings.relationshipReviewMode,
          relationshipConfidenceThreshold:
            knowledgeReviewSettings.relationshipConfidenceThreshold,
          crossChunkAuditMode: knowledgeReviewSettings.crossChunkAuditMode,
        }),
      ])
      setProjects((current) =>
        current.map((project) => (project.id === savedProject.id ? savedProject : project)),
      )
      setWorldRules(getProjectWorldRules(savedProject))
      setWorldRulesNotice("Las reglas del mundo fueron guardadas.")
      setKnowledgeReviewSettings(savedReviewSettings)
      void mutate(
        `/projects/${encodeURIComponent(selectedProjectId)}/knowledge-review-settings`,
        savedReviewSettings,
        { revalidate: false },
      )
      const stateProposalsKey = `/v1/projects/${encodeURIComponent(selectedProjectId)}/state-proposals`
      if (savedReviewSettings.stateTrackingEnabled) {
        void mutate(stateProposalsKey)
      } else {
        void mutate(stateProposalsKey, [], { revalidate: false })
      }
      setKnowledgeReviewBaseline({
        projectId: selectedProjectId,
        stateTrackingEnabled: savedReviewSettings.stateTrackingEnabled,
        stateReviewMode: savedReviewSettings.stateReviewMode,
        stateConfidenceThreshold: savedReviewSettings.stateConfidenceThreshold,
        relationshipReviewMode: savedReviewSettings.relationshipReviewMode,
        relationshipConfidenceThreshold:
          savedReviewSettings.relationshipConfidenceThreshold,
        crossChunkAuditMode: savedReviewSettings.crossChunkAuditMode,
      })
      setKnowledgeReviewNotice("La revisión automática quedó configurada.")
    } catch {
      setWorldRulesError("No pudimos guardar las reglas del mundo.")
      setKnowledgeReviewError("No pudimos guardar el modo de revisión.")
    } finally {
      setWorldRulesSaving(false)
      setKnowledgeReviewSaving(false)
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
      setEntityRecognitionBaseline({
        projectId,
        importantEntityNames: [...settings.importantEntityNames],
        ignoredEntityNames: [...settings.ignoredEntityNames],
      })
    } catch {
      setProjectNamesError("No pudimos cargar la lista de entidades importantes.")
      setImportantEntityNames([])
      setIgnoredEntityNames([])
      setRejectedEntityProposals([])
      setEntityRecognitionBaseline({
        projectId,
        importantEntityNames: [],
        ignoredEntityNames: [],
      })
    } finally {
      setProjectNamesLoading(false)
    }
  }

  const loadReviewSettings = async (projectId: string) => {
    setKnowledgeReviewLoading(true)
    setKnowledgeReviewError(null)
    try {
      const settings = await getKnowledgeReviewSettings(projectId)
      setKnowledgeReviewSettings(settings)
      setKnowledgeReviewBaseline({
        projectId,
        stateTrackingEnabled: settings.stateTrackingEnabled,
        stateReviewMode: settings.stateReviewMode,
        stateConfidenceThreshold: settings.stateConfidenceThreshold,
        relationshipReviewMode: settings.relationshipReviewMode,
        relationshipConfidenceThreshold: settings.relationshipConfidenceThreshold,
        crossChunkAuditMode: settings.crossChunkAuditMode,
      })
    } catch {
      setKnowledgeReviewSettings(DEFAULT_KNOWLEDGE_REVIEW_SETTINGS)
      setKnowledgeReviewBaseline({
        projectId,
        stateTrackingEnabled: DEFAULT_KNOWLEDGE_REVIEW_SETTINGS.stateTrackingEnabled,
        stateReviewMode: "MANUAL",
        stateConfidenceThreshold: 0.9,
        relationshipReviewMode: "MANUAL",
        relationshipConfidenceThreshold: 0.9,
        crossChunkAuditMode: "ADJACENT_CHUNKS",
      })
      setKnowledgeReviewError("No pudimos cargar la configuración de revisión.")
    } finally {
      setKnowledgeReviewLoading(false)
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
  const selectedAiProviderOption = aiSettings?.providers.find(
    (provider) => provider.provider === aiProvider,
  )
  const selectedProviderModels = selectedAiProviderOption?.suggestedModels ?? []
  const isSuggestedAiModel = selectedProviderModels.some(
    (model) => model.id === aiModel,
  )
  const hasUnsavedAiProviderSettings = Boolean(
    aiSettings &&
      (aiProvider !== aiSettings.provider ||
        aiModel.trim() !== aiSettings.model ||
        aiCredentialSource !== aiSettings.credentialSource),
  )
  const hasUnsubmittedProviderKey = Object.values(providerApiKeys).some(
    (apiKey) => apiKey.trim().length > 0,
  )

  const hasUnsavedAccountChanges = () =>
    displayName.trim() !== currentDisplayName.trim() ||
    avatarFile !== null ||
    avatarPreview !== null ||
    removeAvatar

  const hasUnsavedEntityRecognitionChanges = () => {
    const savedThresholds =
      aiSettings?.entityExtractionThresholds ?? DEFAULT_ENTITY_RECOGNITION_THRESHOLDS
    const thresholdsChanged = Object.entries(entityThresholds).some(
      ([type, value]) => savedThresholds[type as keyof EntityRecognitionThresholds] !== value,
    )
    const entityBaseline = entityRecognitionBaseline
    const entityListsChanged =
      entityBaseline.projectId === selectedProjectId &&
      (!areStringArraysEqual(importantEntityNames, entityBaseline.importantEntityNames) ||
        !areStringArraysEqual(ignoredEntityNames, entityBaseline.ignoredEntityNames))
    return thresholdsChanged || entityListsChanged
  }

  const hasUnsavedInconsistencyChanges = () => {
    const savedWorldRules = getProjectWorldRules(
      projects.find((project) => project.id === selectedProjectId),
    )
    const reviewBaseline = knowledgeReviewBaseline
    const reviewSettingsChanged =
      reviewBaseline.projectId === selectedProjectId &&
      (knowledgeReviewSettings.stateReviewMode !== reviewBaseline.stateReviewMode ||
        knowledgeReviewSettings.stateTrackingEnabled !== reviewBaseline.stateTrackingEnabled ||
        knowledgeReviewSettings.stateConfidenceThreshold !==
          reviewBaseline.stateConfidenceThreshold ||
        knowledgeReviewSettings.relationshipReviewMode !==
          reviewBaseline.relationshipReviewMode ||
        knowledgeReviewSettings.relationshipConfidenceThreshold !==
          reviewBaseline.relationshipConfidenceThreshold ||
        knowledgeReviewSettings.crossChunkAuditMode !==
          reviewBaseline.crossChunkAuditMode)
    return (
      (selectedProjectId !== null &&
        !areStringArraysEqual(worldRules, savedWorldRules)) ||
      reviewSettingsChanged
    )
  }

  const hasUnsavedProfileChanges = () =>
    hasUnsavedAccountChanges() ||
    hasUnsubmittedProviderKey ||
    hasUnsavedAiProviderSettings ||
    hasUnsavedEntityRecognitionChanges() ||
    hasUnsavedInconsistencyChanges() ||
    newImportantEntityName.trim().length > 0 ||
    newIgnoredEntityName.trim().length > 0 ||
    newWorldRule.trim().length > 0

  const hasUnsavedCurrentSectionChanges = () => {
    if (profileSection === "account") return hasUnsavedAccountChanges()
    if (profileSection === "ai") return hasUnsavedAiProviderSettings
    if (profileSection === "entityRecognition") {
      return hasUnsavedEntityRecognitionChanges()
    }
    return hasUnsavedInconsistencyChanges()
  }

  const currentSectionHasUnsavedChanges = hasUnsavedCurrentSectionChanges()

  const isCurrentSectionSettingsUnavailable =
    (profileSection === "ai" && aiLoading) ||
    (profileSection === "entityRecognition" &&
      (aiLoading || projectNamesLoading)) ||
    (profileSection === "inconsistencies" &&
      (projectsLoading || knowledgeReviewLoading))

  const profileSubmitDisabled =
    profileSection === "ai"
      ? !currentSectionHasUnsavedChanges ||
        isCurrentSectionSettingsUnavailable ||
        !aiModel.trim() ||
        (aiCredentialSource === "USER" &&
          !selectedAiProviderOption?.userKeyConfigured) ||
        (aiCredentialSource === "SERVER" &&
          !selectedAiProviderOption?.serverCredentialAvailable)
      : !currentSectionHasUnsavedChanges ||
        isCurrentSectionSettingsUnavailable ||
        (profileSection === "inconsistencies" && !selectedProjectId)

  const profileSubmitLabel = getProfileSubmitLabel(
    profileSection,
    currentSectionHasUnsavedChanges,
  )


  const profileSubmitButtonClassName = currentSectionHasUnsavedChanges
    ? undefined
    : "bg-muted text-muted-foreground shadow-none hover:bg-muted hover:text-muted-foreground"

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
        submitLabel={profileSubmitLabel}
        submitDisabled={profileSubmitDisabled}
        submitButtonClassName={profileSubmitButtonClassName}
        loading={getProfileLoadingState(profileSection, {
          account: saving,
          ai: aiSaving || autoAnalysisSaving,
          entityRecognition: entityRecognitionSaving,
          inconsistencies: worldRulesSaving || knowledgeReviewSaving,
        })}

        showLoadingIndicator={false}
        onSubmit={getProfileSubmitHandler(profileSection, {
          account: handleProfileSubmit,
          ai: handleAiSubmit,
          entityRecognition: handleEntityRecognitionSubmit,
          inconsistencies: handleWorldRulesSubmit,
        })}

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
                  void loadReviewSettings(projectId)
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
            <div className="space-y-4 rounded-lg border border-primary/15 bg-primary/[0.025] p-4">
              <div>
                <p className="font-medium">Revisión temporal de estados y relaciones</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  En modo manual, cada cambio requiere tu aprobación. El modo automático solo
                  acepta evidencia vigente que supere el umbral y no tenga conflictos.
                </p>
              </div>
              {knowledgeReviewLoading ? (
                <p className="text-xs text-muted-foreground">Cargando preferencias del proyecto...</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                    <input
                      id="state-tracking-enabled"
                      type="checkbox"
                      aria-labelledby="state-tracking-enabled-label"
                      aria-describedby="state-tracking-enabled-description"
                      checked={knowledgeReviewSettings.stateTrackingEnabled}
                      onChange={(event) =>
                        setKnowledgeReviewSettings((current) => ({
                          ...current,
                          stateTrackingEnabled: event.target.checked,
                        }))
                      }
                      className="mt-1 size-4 accent-primary"
                    />
                    <div>
                      <label
                        id="state-tracking-enabled-label"
                        htmlFor="state-tracking-enabled"
                        className="cursor-pointer text-sm font-medium"
                      >
                        Activar seguimiento de estados
                      </label>
                      <p
                        id="state-tracking-enabled-description"
                        className="mt-1 text-xs text-muted-foreground"
                      >
                        Permite registrar cambios de ubicación, estado vital y salud, ver su historial y revisar propuestas.
                        Al desactivarlo, los datos existentes se conservan, pero no se muestran ni se usan en el análisis.
                      </p>
                    </div>
                  </div>

                  <section className="space-y-3 rounded-lg border bg-card p-3">
                    <Field>
                      <FieldLabel htmlFor="cross-chunk-audit-mode">
                        Comparación entre fragmentos
                      </FieldLabel>
                      <select
                        id="cross-chunk-audit-mode"
                        value={knowledgeReviewSettings.crossChunkAuditMode}
                        onChange={(event) =>
                          setKnowledgeReviewSettings((current) => ({
                            ...current,
                            crossChunkAuditMode: event.target.value as KnowledgeReviewSettings["crossChunkAuditMode"],
                          }))
                        }
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="ADJACENT_CHUNKS">Comparar fragmentos consecutivos</option>
                        <option value="SCENE_GROUPED">Analizar toda la escena</option>
                        <option value="PROJECT_SUMMARY">Usar resumen de escenas anteriores</option>
                        <option value="DISABLED">Desactivar comparación entre fragmentos</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        La revisión de cada fragmento contra la ficha y las reglas del mundo permanece activa.
                      </p>
                    </Field>
                  </section>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {knowledgeReviewSettings.stateTrackingEnabled && (
                      <section className="space-y-3 rounded-lg border bg-card p-3">
                    <p className="text-sm font-medium">Estados y cambios narrativos</p>
                    <Field>
                      <FieldLabel htmlFor="state-review-mode">Modo de revisión</FieldLabel>
                      <select
                        id="state-review-mode"
                        value={knowledgeReviewSettings.stateReviewMode}
                        onChange={(event) =>
                          setKnowledgeReviewSettings((current) => ({
                            ...current,
                            stateReviewMode: event.target.value as KnowledgeReviewSettings["stateReviewMode"],
                          }))
                        }
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="MANUAL">Siempre pedir aprobación</option>
                        <option value="AUTO_THRESHOLD">Aprobar sobre el umbral</option>
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="state-review-threshold">
                        Confianza mínima ({knowledgeReviewSettings.stateConfidenceThreshold.toFixed(2)})
                      </FieldLabel>
                      <Input
                        id="state-review-threshold"
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={knowledgeReviewSettings.stateConfidenceThreshold}
                        onChange={(event) =>
                          setKnowledgeReviewSettings((current) => ({
                            ...current,
                            stateConfidenceThreshold: Math.min(1, Math.max(0, Number(event.target.value))),
                          }))
                        }
                      />
                    </Field>
                      </section>
                    )}

                    <section className="space-y-3 rounded-lg border bg-card p-3">
                    <p className="text-sm font-medium">Relaciones</p>
                    <Field>
                      <FieldLabel htmlFor="relationship-review-mode">Modo de revisión</FieldLabel>
                      <select
                        id="relationship-review-mode"
                        value={knowledgeReviewSettings.relationshipReviewMode}
                        onChange={(event) =>
                          setKnowledgeReviewSettings((current) => ({
                            ...current,
                            relationshipReviewMode: event.target.value as KnowledgeReviewSettings["relationshipReviewMode"],
                          }))
                        }
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="MANUAL">Siempre pedir aprobación</option>
                        <option value="AUTO_THRESHOLD">Aprobar sobre el umbral</option>
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="relationship-review-threshold">
                        Confianza mínima ({knowledgeReviewSettings.relationshipConfidenceThreshold.toFixed(2)})
                      </FieldLabel>
                      <Input
                        id="relationship-review-threshold"
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={knowledgeReviewSettings.relationshipConfidenceThreshold}
                        onChange={(event) =>
                          setKnowledgeReviewSettings((current) => ({
                            ...current,
                            relationshipConfidenceThreshold: Math.min(1, Math.max(0, Number(event.target.value))),
                          }))
                        }
                      />
                    </Field>
                    </section>
                  </div>
                </div>
              )}
              {knowledgeReviewError && <FieldError>{knowledgeReviewError}</FieldError>}
              {knowledgeReviewNotice && (
                <Alert><AlertDescription>{knowledgeReviewNotice}</AlertDescription></Alert>
              )}
            </div>
          )}

          {selectedProjectId && (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Reglas del mundo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Agrega reglas narrativas concretas para que el analisis pueda advertir cuando una
                  escena contradice la logica de tu obra.
                </p>
              </div>

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
              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div>
                  <p className="font-semibold">Modelo para extracción y auditoría</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Esta selección se aplica a todos tus proyectos para extraer entidades y relaciones, y revisar inconsistencias. No modifica el proveedor del chat.
                  </p>
                </div>

                <Field>
                  <FieldLabel htmlFor="ai-provider">Proveedor</FieldLabel>
                  <select
                    id="ai-provider"
                    value={aiProvider}
                    onChange={(event) => {
                      const nextProvider = event.target.value as AiProvider
                      const nextOption = aiSettings?.providers.find(
                        (option) => option.provider === nextProvider,
                      )
                      setAiProvider(nextProvider)
                      setAiModel(nextOption?.suggestedModels[0]?.id ?? "")
                      setAiCredentialSource(
                        nextOption?.userKeyConfigured
                          ? "USER"
                          : nextOption?.serverCredentialAvailable
                            ? "SERVER"
                            : "USER",
                      )
                      setAiProviderError(null)
                      setAiProviderNotice(null)
                    }}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {aiSettings?.providers.map((provider) => (
                      <option key={provider.provider} value={provider.provider}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="ai-model">Modelo</FieldLabel>
                  <select
                    id="ai-model"
                    value={isSuggestedAiModel ? aiModel : "__custom__"}
                    onChange={(event) => {
                      setAiModel(event.target.value === "__custom__" ? "" : event.target.value)
                      setAiProviderError(null)
                    }}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {selectedProviderModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                    <option value="__custom__">Otro modelo…</option>
                  </select>
                  {!isSuggestedAiModel && (
                    <Input
                      id="ai-custom-model"
                      value={aiModel}
                      maxLength={120}
                      onChange={(event) => {
                        setAiModel(event.target.value)
                        setAiProviderError(null)
                      }}
                      placeholder="ID del modelo del proveedor"
                      autoComplete="off"
                    />
                  )}
                  <FieldDescription>
                    Podés elegir un modelo sugerido o ingresar su ID. El proveedor lo validará cuando se ejecute un análisis.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="ai-credential-source">Credencial a utilizar</FieldLabel>
                  <select
                    id="ai-credential-source"
                    value={aiCredentialSource}
                    onChange={(event) => {
                      setAiCredentialSource(event.target.value as AiCredentialSource)
                      setAiProviderError(null)
                    }}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option
                      value="USER"
                      disabled={!selectedAiProviderOption?.userKeyConfigured}
                    >
                      Mi API Key
                    </option>
                    <option
                      value="SERVER"
                      disabled={!selectedAiProviderOption?.serverCredentialAvailable}
                    >
                      Clave administrada por PlumIA
                    </option>
                  </select>
                  <FieldDescription>
                    {aiCredentialSource === "USER"
                      ? selectedAiProviderOption?.userKeyConfigured
                        ? `Se usará tu clave cifrada${selectedAiProviderOption.keyPrefix ? ` (${selectedAiProviderOption.keyPrefix})` : ""}.`
                        : "Guardá una clave personal para este proveedor en la sección siguiente."
                      : selectedAiProviderOption?.serverCredentialAvailable
                        ? "Se usará la credencial configurada por PlumIA para este proveedor."
                        : "PlumIA no tiene una credencial disponible para este proveedor."}
                  </FieldDescription>
                </Field>

                {aiProviderError && <FieldError>{aiProviderError}</FieldError>}
                {aiProviderNotice && (
                  <Alert>
                    <AlertDescription>{aiProviderNotice}</AlertDescription>
                  </Alert>
                )}
              </section>

              <section className="space-y-3 rounded-xl border p-4">
                <div>
                  <p className="font-semibold">Claves personales</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cada proveedor conserva su propia clave cifrada. Nunca se muestra completa y se puede cambiar sin afectar la del otro proveedor.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiSettings?.providers.map((provider) => {
                    const isSelectedPersonalKey =
                      aiProvider === provider.provider && aiCredentialSource === "USER"
                    return (
                      <div
                        key={provider.provider}
                        className="min-w-0 space-y-3 rounded-lg border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{provider.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {provider.userKeyConfigured
                                ? `Clave guardada${provider.keyPrefix ? ` · ${provider.keyPrefix}` : ""}${formatProviderKeyUpdatedAt(provider.updatedAt) ? ` · Actualizada ${formatProviderKeyUpdatedAt(provider.updatedAt)}` : ""}`
                                : "Sin clave personal"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {provider.serverCredentialAvailable
                                ? "Clave de PlumIA disponible"
                                : "Clave de PlumIA no configurada"}
                            </p>
                          </div>
                          <KeyRound className="size-4 shrink-0 text-primary" />
                        </div>
                        <Field>
                          <FieldLabel htmlFor={`provider-key-${provider.provider}`}>
                            API Key
                          </FieldLabel>
                          <Input
                            id={`provider-key-${provider.provider}`}
                            type="password"
                            maxLength={500}
                            value={providerApiKeys[provider.provider]}
                            onChange={(event) => {
                              setProviderApiKeys((current) => ({
                                ...current,
                                [provider.provider]: event.target.value,
                              }))
                              setAiError(null)
                              setAiNotice(null)
                            }}
                            placeholder={
                              provider.userKeyConfigured
                                ? "Ingresá una clave nueva para reemplazarla"
                                : "Pegá tu API Key"
                            }
                            autoComplete="new-password"
                            disabled={providerKeySaving !== null || removingAiKey}
                          />
                        </Field>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleSaveProviderKey(provider.provider)}
                            disabled={
                              providerKeySaving !== null ||
                              removingAiKey ||
                              !providerApiKeys[provider.provider].trim()
                            }
                          >
                            {providerKeySaving === provider.provider ? <Spinner /> : null}
                            Guardar clave
                          </Button>
                          {provider.userKeyConfigured && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setProviderToRemove(provider.provider)
                                setRemoveAiKeyOpen(true)
                              }}
                              disabled={removingAiKey || providerKeySaving !== null || isSelectedPersonalKey}
                              aria-label={`Eliminar API Key de ${provider.label}`}
                            >
                              <Trash2 />
                              Eliminar
                            </Button>
                          )}
                        </div>
                        {isSelectedPersonalKey && (
                          <p className="text-xs text-muted-foreground">
                            Cambiá la fuente de credencial y guardá la configuración antes de eliminar esta clave.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                {aiError && <FieldError>{aiError}</FieldError>}
                {aiNotice && (
                  <Alert>
                    <AlertDescription>{aiNotice}</AlertDescription>
                  </Alert>
                )}
              </section>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium">Analizar automáticamente al guardar</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si lo desactivás, los cambios se guardan sin utilizar IA. Podés usar Analizar cambios desde el editor cuando quieras.
                  </p>
                </div>
                <Switch
                  checked={aiSettings?.autoAnalyzeOnAutosave ?? true}
                  onCheckedChange={handleAutoAnalysisChange}
                  disabled={autoAnalysisSaving || aiLoading}
                  aria-label="Analizar automáticamente al guardar"
                />
              </div>

              {autoAnalysisError && <FieldError>{autoAnalysisError}</FieldError>}
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
            <AlertDialogTitle>
              ¿Eliminar tu API Key de {providerToRemove === "gemini" ? "Gemini" : "Anthropic"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La clave personal se eliminará. Si ese proveedor está activo, primero cambiá la fuente de credencial y guardá la configuración.
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
              Eliminar clave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}



