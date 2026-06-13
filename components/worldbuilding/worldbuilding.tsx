"use client"

import { useState } from "react"
import {Plus, Users, Star, Calendar, FileText} from "lucide-react"

import { Header } from "../header"
import { WikiTab } from "./wiki-panel"
import { SummariesPanel } from "./summaries-panel"

import { NewEntityModal } from "@/components/modal/new-entity-modal"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type WorldbuildingTab = "wiki" | "relationships" | "timeline" | "summaries"

export function Worldbuilding() {

  const tabs = [
  { id: "wiki", label: "Wiki del Universo", icon: Star },
  { id: "relationships", label: "Relaciones", icon: Users },
  { id: "timeline", label: "Línea Temporal", icon: Calendar },
  { id: "summaries", label: "Resúmenes", icon: FileText },
  ];

  const [activeTab, setActiveTab] = useState<WorldbuildingTab>("wiki")
  const [showNewEntityModal, setShowNewEntityModal] =useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">

      <Header />

      <div className="shrink-0 border-b border-border bg-card px-6 py-4 ">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Worldbuilding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Explora y gestiona el universo narrativo de tu obra
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => setShowNewEntityModal(true)}
          >
            <Plus size={16} />
            Nueva Entidad
          </button>
        </div>

        <NewEntityModal
        show={showNewEntityModal}
        onClose={() => setShowNewEntityModal(false)}
        />

        {/* Tabs */}
        <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(
            value as "wiki" | "relationships" | "timeline" | "summaries"
          )
        }
        className="mt-4">
          
        <TabsList className="h-auto gap-1 bg-transparent p-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="
                flex items-center gap-2 px-4 py-2.5 rounded-lg
                data-[state=active]:bg-primary/10
                data-[state=active]:text-primary
                data-[state=active]:border
                data-[state=active]:border-primary/20
              "
            >
              <Icon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList >
              <TabsContent value="wiki" className=" flex flex-1 w-full h-full mt-4 bg-card rounded-lg border border-border p-4">
                <WikiTab />
              </TabsContent>

              <TabsContent value="relationships">
                
              </TabsContent>

              <TabsContent value="timeline">
                
              </TabsContent>

              <TabsContent value="summaries" className=" flex flex-1 w-full h-full mt-4 bg-card rounded-lg border border-border p-4">
                <SummariesPanel />
              </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
