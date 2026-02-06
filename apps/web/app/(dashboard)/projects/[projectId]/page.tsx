"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Settings, Database, Code, MessageSquare, Puzzle, Users } from "lucide-react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from "@chatbot/ui";
import { useProject } from "@/contexts/project-context";
import { AgentHeader } from "./components/agent-header";
import { OverviewTab } from "./components/overview-tab";
import { KnowledgeTab } from "./components/knowledge-tab";
import { EndpointsTab } from "./components/endpoints-tab";
import { LeadCaptureTab } from "./components/lead-capture-tab";
import { WidgetTab } from "./components/widget-tab";
import { HandoffTab } from "./components/handoff-tab";

/**
 * Agent Studio Page
 *
 * Dedicated configuration page for a specific agent/project.
 * Contains all agent-specific settings organized in tabs.
 */
export default function AgentStudioPage() {
  const params = useParams();
  const router = useRouter();
  const { projects, currentProject, switchProject, isLoading } = useProject();
  const [activeTab, setActiveTab] = useState("overview");

  const projectId = params.projectId as string;

  // Find the project by ID
  const project = projects.find((p) => p.id === projectId);

  // Switch to this project if it's not the current one
  useEffect(() => {
    if (project && currentProject?.id !== projectId) {
      switchProject(projectId);
    }
  }, [project, currentProject?.id, projectId, switchProject]);

  // Handle back navigation
  const handleBack = () => {
    router.push("/projects");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Project not found
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Agent not found</p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        All Agents
      </Button>

      {/* Agent header */}
      <AgentHeader project={project} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto">
          <TabsTrigger value="overview" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Endpoints</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Lead Capture</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-2">
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Widget</span>
          </TabsTrigger>
          <TabsTrigger value="handoff" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Handoff</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab project={project} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeTab project={project} />
        </TabsContent>

        <TabsContent value="endpoints" className="mt-6">
          <EndpointsTab project={project} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <LeadCaptureTab project={project} />
        </TabsContent>

        <TabsContent value="widget" className="mt-6">
          <WidgetTab project={project} />
        </TabsContent>

        <TabsContent value="handoff" className="mt-6">
          <HandoffTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
