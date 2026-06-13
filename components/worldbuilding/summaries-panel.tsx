"use client"

import { useState } from "react"
import {
  FileText,
  Sparkles,
  RefreshCw,
  Copy,
  Save,
} from "lucide-react"

import { getChapters } from "@/services/project.service";
import { getSummary } from "@/services/worldbuilding.service";

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const chapters = await getChapters();

export function SummariesPanel() {
const [selectedChapters, setSelectedChapters] = useState<string[]>([])
const [generatedSummary, setGeneratedSummary] = useState("")
const [loading, setLoading] = useState(false);

const handleGenerateSummary = async () => {
  try {
    setLoading(true);

    const summary = await getSummary();

    setGeneratedSummary(summary);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  const toggleChapter = (chapterId: string, checked: boolean) => {
    if (checked) {
      setSelectedChapters((prev) => [...prev, chapterId])
    } else {
      setSelectedChapters((prev) =>
        prev.filter((id) => id !== chapterId)
      )
    }
  }

  return (
    <div className="flex flex-1 h-full bg-background text-foreground">
      <Card className="w-90 rounded border-y-0 border-l-0 bg-card">
        <CardHeader>
          <CardTitle className="text-sm">
            Seleccionar capítulos
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y max-h-[600px] overflow-y-auto">
            {chapters.map((chapter) => (
              <Card key={chapter.id}>
                <CardContent className="">
                  <label className="flex items-start gap-3 cursor-pointer hover:bg-muted rounded p-2">
                    <Checkbox 
                      checked={selectedChapters.includes(chapter.id)}
                      onCheckedChange={(checked) =>
                        toggleChapter(
                          chapter.id,
                          checked === true
                        )
                      }
                    />

                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {chapter.title}
                      </p>

                      <p className="text-xs text-muted-foreground">
                       {chapter.wordCount} palabras
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <Button
            className="w-full"
            disabled={selectedChapters.length === 0}
            onClick={handleGenerateSummary}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? "Generando..." : "Generar resumen"}
          </Button>
        </CardContent>
      </Card>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {generatedSummary ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Resumen generado
                </h2>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSummary}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {loading ? "Regenerando..." : "Generar resumen"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        generatedSummary
                      )
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>

                  <Button size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {generatedSummary}
                  </p>
                </CardContent>
              </Card>

            </div>
          ) : (
            <div className="flex h-[600px] items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />

                <h3 className="mb-2 text-lg font-medium">
                  No hay resumen generado
                </h3>

                <p className="text-sm text-muted-foreground">
                  Selecciona uno o más capítulos y genera un resumen.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}