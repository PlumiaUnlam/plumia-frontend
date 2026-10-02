
import { useEffect, useMemo, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { MessageSquare } from "lucide-react"

import type { ProseMirrorJSON } from "@/types/scene"
import type { AuthorAnnotation, CreateAuthorAnnotationInput } from "@/types/author-annotation"
import {
  createSceneAnnotation,
  deleteSceneAnnotation,
  getSceneAnnotations,
  updateSceneAnnotation,
} from "@/services/author-annotation.service"
import { Button } from "@/components/ui/button"
import { useEditorStore } from "@/stores/editor.store"
import {
  CitationFocus,
  citationFocusPluginKey,
  findCitationRange,
} from "./editor-citation-focus"
import {
  EditorSearchFocus,
  editorSearchFocusPluginKey,
  findEditorSearchRange,
  findEditorSearchRanges,
} from "./editor-search-focus"
import { EditorToolbar } from "./toolbar"
import { EditorImage } from "./image/editor-image-extension"
import { useEditorImage } from "./image/use-editor-image"
import { EntityLink } from "./entity-link/entity-link-extension"
import { useEntityLink } from "./entity-link/use-entity-link"
import { EntityLinkHoverTooltip } from "./entity-link/entity-link-hover-tooltip"
import { SelectionBubbleMenu } from "./selection-menu/selection-bubble-menu"
import { AuthorAnnotationPanel } from "./author-annotation-panel"
import {
  findAuthorAnnotationAnchor,
  AuthorAnnotationDecorations,
  authorAnnotationDecorationKey,
} from "./author-annotation-decorations"
import { SceneDivider } from "./scene-divider"
import { ParagraphFormatting } from "./paragraph-formatting"
import { ListFormatting } from "./list-formatting"
import { TextFormatting } from "./text-formatting"
import {
  TextHighlightFormatting,
  TextSubscriptFormatting,
  TextSuperscriptFormatting,
} from "./text-extra-formatting"
import { TextFontSizeFormatting } from "./text-font-size"
import { TextFontFamilyFormatting } from "./text-font-family"
import { EditorMenuBar } from "./editor-menu-bar"
import {
  EditorTextStyleAttributes,
  EditorTextStyleMark,
  buildEditorTextStylesCss,
} from "./editor-text-styles"
import { useEditorTextStyles } from "@/hooks/use-editor-text-styles"
import { ListNumberingMenu } from "./list-numbering-menu"
import { SpellcheckSuggestions } from "./spellcheck-suggestions"
import type {
  EditorToolbarActions,
} from "./editor-types"
import type { SceneDividerVariant } from "./scene-divider"

type RichTextEditorProps = {
  title: string
  subtitle?: string
  sceneId: string
  projectId: string
  content?: ProseMirrorJSON | null
  onChange?: (json: ProseMirrorJSON) => void
  onSave?: () => void
  onAnalyzeChanges?: () => void
  isAnalysisSaving?: boolean
  isZenMode?: boolean
  onToggleZenMode?: () => void
  onOpenSearch?: () => void
  onOpenSpellcheckSettings?: () => void
  onExportClick?: () => void
  saveNow?: () => Promise<unknown>
  showToolbar?: boolean
  onEditorFocus?: () => void
  onToolbarActionsChange?: (
    actions: EditorToolbarActions | null,
  ) => void
  onToggleSplit?: () => void
  isSplit?: boolean
  canSplit?: boolean
  allowAnnotations?: boolean
}

export function RichTextEditor({
  title,
  subtitle,
  sceneId,
  projectId,
  content,
  onChange,
  onSave,
  onAnalyzeChanges,
  isAnalysisSaving = false,
  isZenMode = false,
  onToggleZenMode,
  onOpenSearch,
  onOpenSpellcheckSettings,
  onExportClick,
  saveNow,
  showToolbar = true,
  onEditorFocus,
  onToolbarActionsChange,
  onToggleSplit,
  isSplit = false,
  canSplit = true,
  allowAnnotations = true,
}: Readonly<RichTextEditorProps>) {
  const [paragraphDialogOpen, setParagraphDialogOpen] = useState(false)
  const [annotations, setAnnotations] = useState<AuthorAnnotation[]>([])
  const [isAnnotationsOpen, setIsAnnotationsOpen] = useState(false)
  const [isAnnotationComposerOpen, setIsAnnotationComposerOpen] = useState(false)
  const [annotationDraftAnchor, setAnnotationDraftAnchor] = useState<Omit<CreateAuthorAnnotationInput, "body"> | null>(null)
  const {
    error,
    isUploading,
    registerFileInput,
    openImagePicker,
    handleFileSelected,
    handlePaste,
    bindEditor,
  } = useEditorImage({ sceneId })

  const { goToEntity } = useEntityLink({ projectId })
  const citationFocus = useEditorStore((state) => state.citationFocus)
  const clearCitationFocus = useEditorStore(
    (state) => state.clearCitationFocus,
  )
  const searchFocus = useEditorStore((state) => state.searchFocus)
  const searchQuery = useEditorStore((state) => state.searchQuery)
  const clearSearchFocus = useEditorStore((state) => state.clearSearchFocus)
  const spellcheckLanguage = useEditorStore(
    (state) => state.spellcheckLanguage,
  )
  const { styles: editorTextStyles } = useEditorTextStyles(projectId)
  const editorTextStylesCss = useMemo(
    () => buildEditorTextStylesCss(editorTextStyles),
    [editorTextStyles],
  )

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
        },
      }),
      ParagraphFormatting,
      ListFormatting,
      TextFormatting,
      TextSubscriptFormatting,
      TextSuperscriptFormatting,
      TextHighlightFormatting,
      TextFontSizeFormatting,
      TextFontFamilyFormatting,
      EditorTextStyleMark,
      EditorTextStyleAttributes,
      EditorImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "mx-auto my-6 max-w-full",
        },
      }),
      SceneDivider,
      EntityLink,
      EditorSearchFocus,
      CitationFocus,
      AuthorAnnotationDecorations,
    ],
    content: content ?? "",
    editorProps: {
      attributes: {
        spellcheck: "true",
        lang: spellcheckLanguage,
      },
      handlePaste,
    },
    onFocus: () => onEditorFocus?.(),
    onUpdate: ({ editor: nextEditor }) => {
      onChange?.(nextEditor.getJSON())
    },
  })

  useEffect(() => {
    bindEditor(editor ?? null)
  }, [editor, bindEditor])

  useEffect(() => {
    if (!allowAnnotations) {
      setAnnotations([])
      setIsAnnotationsOpen(false)
      return
    }

    const controller = new AbortController()
    void getSceneAnnotations(sceneId, { signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) setAnnotations(items)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Error loading scene annotations:", error)
        }
      })

    return () => controller.abort()
  }, [allowAnnotations, sceneId])

  useEffect(() => {
    if (!editor || !allowAnnotations) return
    editor.view.dispatch(
      editor.state.tr.setMeta(authorAnnotationDecorationKey, annotations),
    )
  }, [allowAnnotations, editor, annotations])

  const handleStartAnnotation = () => {
    if (!editor || !allowAnnotations) return
    const { from, to, empty } = editor.state.selection
    if (empty) return

    const quote = editor.state.doc.textBetween(from, to, "\n").trim()
    if (!quote) return

    setAnnotationDraftAnchor({
      quote,
      anchorFrom: from,
      anchorTo: to,
      contextBefore: editor.state.doc.textBetween(Math.max(0, from - 100), from, "\n").slice(-200),
      contextAfter: editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 100), "\n").slice(0, 200),
    })
    setIsAnnotationsOpen(true)
    setIsAnnotationComposerOpen(true)
  }

  const handleStartFreeAnnotation = () => {
    setAnnotationDraftAnchor(null)
    setIsAnnotationsOpen(true)
    setIsAnnotationComposerOpen(true)
  }

  const handleCreateAnnotation = async (body: string) => {
    const annotation = await createSceneAnnotation(sceneId, {
      ...(annotationDraftAnchor ?? {}),
      body,
    })
    setAnnotations((current) => [annotation, ...current])
    setAnnotationDraftAnchor(null)
    setIsAnnotationComposerOpen(false)
  }

  const handleEditAnnotation = async (annotationId: string, body: string) => {
    const updated = await updateSceneAnnotation(sceneId, annotationId, body)
    setAnnotations((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  const handleDeleteAnnotation = async (annotationId: string) => {
    await deleteSceneAnnotation(sceneId, annotationId)
    setAnnotations((current) => current.filter((item) => item.id !== annotationId))
  }

  const handleNavigateToAnnotation = (annotation: AuthorAnnotation) => {
    if (!editor) return
    const anchor = findAuthorAnnotationAnchor(editor.state.doc, annotation)
    if (!anchor) return
    editor.chain().focus().setTextSelection(anchor).run()
    const node = editor.view.domAtPos(anchor.from).node
    const target = node instanceof HTMLElement ? node : node.parentElement
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const handleCloseAnnotations = () => {
    setIsAnnotationsOpen(false)
    setIsAnnotationComposerOpen(false)
    setAnnotationDraftAnchor(null)
  }

  useEffect(() => {
    if (!onToolbarActionsChange) return

    if (!editor) {
      onToolbarActionsChange(null)
      return
    }

    onToolbarActionsChange({
      editor,
      onInsertImage: openImagePicker,
      isUploadingImage: isUploading,
      onAnalyzeChanges,
      isAnalysisSaving,
      saveNow: saveNow ?? (() => Promise.resolve()),
    })

    return () => onToolbarActionsChange(null)
  }, [
    editor,
    isAnalysisSaving,
    isUploading,
    onAnalyzeChanges,
    onToolbarActionsChange,
    openImagePicker,
    saveNow,
  ])

  useEffect(() => {
    if (!editor) return

    editor.view.dom.setAttribute("spellcheck", "true")
    editor.view.dom.setAttribute("lang", spellcheckLanguage)
  }, [editor, spellcheckLanguage])

  useEffect(() => {
    if (!editor) return

    const clearCitationDecoration = () => {
      if (editor.isDestroyed) return
      editor.view.dispatch(
        editor.state.tr.setMeta(citationFocusPluginKey, { clear: true }),
      )
    }

    if (citationFocus?.sceneId !== sceneId) {
      clearCitationDecoration()
      return
    }

    const range = findCitationRange(editor.state.doc, citationFocus.textQuote)
    if (!range) {
      clearCitationDecoration()
      clearCitationFocus()
      return
    }

    editor.view.dispatch(
      editor.state.tr.setMeta(citationFocusPluginKey, {
        from: range.from,
        to: range.to,
      }),
    )
    const domNode = editor.view.domAtPos(range.from).node
    const scrollTarget =
      domNode instanceof HTMLElement ? domNode : domNode.parentElement
    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "center" })
    const timeoutId = window.setTimeout(() => {
      if (editor.isDestroyed) return
      editor.view.dispatch(
        editor.state.tr.setMeta(citationFocusPluginKey, { clear: true }),
      )
      clearCitationFocus()
    }, 2600)

    return () => window.clearTimeout(timeoutId)
  }, [citationFocus, clearCitationFocus, editor, sceneId])

  useEffect(() => {
    if (!editor) return

    const ranges = findEditorSearchRanges(editor.state.doc, searchQuery)
    const activeRange =
      searchFocus?.sceneId === sceneId
        ? findEditorSearchRange(
            editor.state.doc,
            searchQuery,
            searchFocus.occurrence,
          )
        : null

    if (ranges.length === 0) {
      editor.view.dispatch(
        editor.state.tr.setMeta(editorSearchFocusPluginKey, { clear: true }),
      )
      return
    }

    editor.view.dispatch(
      editor.state.tr.setMeta(editorSearchFocusPluginKey, {
        ranges,
        activeRange,
      }),
    )

    if (!activeRange) return

    const domNode = editor.view.domAtPos(activeRange.from).node
    const scrollTarget =
      domNode instanceof HTMLElement ? domNode : domNode.parentElement
    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "center" })
    const timeoutId = window.setTimeout(() => {
      if (editor.isDestroyed) return
      clearSearchFocus()
    }, 2600)

    return () => window.clearTimeout(timeoutId)
  }, [clearSearchFocus, editor, sceneId, searchFocus, searchQuery])

  if (!editor) return null

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onFocusCapture={() => onEditorFocus?.()}
    >
      <SpellcheckSuggestions key={sceneId} editor={editor} language={spellcheckLanguage} />
      <input
        ref={registerFileInput}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileSelected}
      />

      {editorTextStylesCss && <style>{editorTextStylesCss}</style>}

      {showToolbar && !isZenMode && (
        <EditorMenuBar
          editor={editor}
          projectId={projectId}
          onSave={onSave}
          onExportClick={onExportClick}
          onOpenSearch={onOpenSearch}
          onOpenSpellcheckSettings={onOpenSpellcheckSettings}
          onOpenParagraphFormat={() => setParagraphDialogOpen(true)}
          onInsertImage={openImagePicker}
          onAnalyzeChanges={onAnalyzeChanges}
          isAnalysisSaving={isAnalysisSaving}
          isZenMode={isZenMode}
          onToggleZenMode={onToggleZenMode}
          onToggleSplit={onToggleSplit}
          isSplit={isSplit}
          canSplit={canSplit}
          onInsertDivider={(variant) =>
            editor.chain().focus().setSceneDivider(variant).run()
          }
        />
      )}
      {showToolbar && (
        <EditorToolbar
          editor={editor}
          onInsertImage={openImagePicker}
          isUploadingImage={isUploading}
          onAnalyzeChanges={onAnalyzeChanges}
          isAnalysisSaving={isAnalysisSaving}
          isZenMode={isZenMode}
          onToggleSplit={onToggleSplit}
          isSplit={isSplit}
          canSplit={canSplit}
          paragraphDialogOpen={paragraphDialogOpen}
          onParagraphDialogOpenChange={setParagraphDialogOpen}
          onInsertDivider={(variant: SceneDividerVariant) =>
            editor.chain().focus().setSceneDivider(variant).run()
          }
        />
      )}

      {error && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-10">
            {allowAnnotations && (
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant={isAnnotationsOpen ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsAnnotationsOpen((open) => !open)}
                  className="gap-2 border-[#dfc8ec] text-[#70408a]"
                >
                  <MessageSquare className="size-4" />
                  Mis anotaciones
                  <span className="rounded-full bg-[#eadcf1] px-1.5 py-0.5 text-xs">
                    {annotations.length}
                  </span>
                </Button>
              </div>
            )}
          <div
            className="
              flex
              min-h-[297mm]
              cursor-text
              flex-col
              rounded-lg
              border
              bg-card
              px-10
              py-8
            "
          >
            {title && (
              <>
                <h2 className="mb-6 shrink-0 text-center text-3xl font-bold text-foreground">
                  {title}
                </h2>
                <h1 className="mb-6 shrink-0 text-center text-2xl font-bold text-foreground">
                  {subtitle}
                </h1>
              </>
            )}

            <SelectionBubbleMenu
              editor={editor}
              projectId={projectId}
              onAddAnnotation={allowAnnotations ? handleStartAnnotation : undefined}
            />
            <ListNumberingMenu editor={editor} />
            <EntityLinkHoverTooltip
              editor={editor}
              onGoToEntity={goToEntity}
            />

            <EditorContent
              editor={editor}
              className="
                prose
                prose-neutral
                dark:prose-invert

                prose-p:leading-8
                prose-p:my-0
                prose-img:my-6
                prose-img:mx-auto
                prose-img:rounded-lg
                prose-img:border
                prose-img:border-border
                prose-img:shadow-sm

                [&_.editor-search-focus]:rounded-sm
                [&_.editor-search-focus]:bg-yellow-200/80
                [&_.editor-search-focus]:text-inherit
                [&_.editor-search-match]:rounded-sm
                [&_.editor-search-match]:bg-yellow-100/70
                [&_.editor-search-match]:text-inherit
                [&_.author-annotation-anchor]:rounded-sm
                [&_.author-annotation-anchor]:bg-[#ecd9f5]
                [&_.author-annotation-anchor]:decoration-2
                [&_.author-annotation-anchor]:decoration-[#9c61b6]
                [&_.author-annotation-anchor]:underline

                text-[16px]

                flex
                flex-1
                flex-col

                [&_.ProseMirror]:flex-1
                [&_.ProseMirror]:outline-none
              "
            />
          </div>
        </div>
        </div>
        {allowAnnotations && isAnnotationsOpen && (
          <AuthorAnnotationPanel
            annotations={annotations}
            draftAnchor={annotationDraftAnchor}
            isComposerOpen={isAnnotationComposerOpen}
            onClose={handleCloseAnnotations}
            onStartCreate={handleStartFreeAnnotation}
            onCreate={handleCreateAnnotation}
            onEdit={handleEditAnnotation}
            onDelete={handleDeleteAnnotation}
            onNavigate={handleNavigateToAnnotation}
          />
        )}
      </div>
    </div>
  )
}
