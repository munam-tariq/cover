"use client";

import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from "@chatbot/ui";
import { ArrowLeft, Settings, Database, Code, MessageSquare, Puzzle, Users, Globe, Radio, SlidersHorizontal } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { MobileTabSelect } from "@/components/mobile-tab-select";
import { useProject } from "@/contexts/project-context";
import { usePathname, useRouter } from "@/i18n/navigation";

import { AgentHeader } from "./components/agent-header";
import { ChannelsTab } from "./components/channels-tab";
import { EndpointsTab } from "./components/endpoints-tab";
import { GeneralTab } from "./components/general-tab";
import { HandoffTab } from "./components/handoff-tab";
import { KnowledgeTab } from "./components/knowledge-tab";
import { LeadCaptureTab } from "./components/lead-capture-tab";
import { OverviewTab } from "./components/overview-tab";
import { PublicPageTab } from "./components/public-page-tab";
import { WidgetTab } from "./components/widget-tab";

/**
 * Agent Studio Page
 *
 * Dedicated configuration page for a specific agent/project.
 * Contains all agent-specific settings organized in tabs.
 */
export default function AgentStudioPage() {
  const t = useTranslations("dashboard.pages.projectDetail");
  const params = useParams();
  const router = useRouter();
  const { projects, currentProject, switchProject, isLoading } = useProject();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tabParam = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "overview");

  // Keep active tab in sync when the URL ?tab= changes (e.g. tour deep-link)
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const nextParams = new URLSearchParams(searchParams?.toString());
    nextParams.set("tab", value);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const projectId = String(params?.projectId ?? "");

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

  const tabOptions = [
    { value: "overview", label: t("tabs.overview"), icon: <Settings className="h-4 w-4" /> },
    { value: "knowledge", label: t("tabs.knowledge"), icon: <Database className="h-4 w-4" /> },
    { value: "endpoints", label: t("tabs.endpoints"), icon: <Code className="h-4 w-4" /> },
    { value: "leads", label: t("tabs.leadCapture"), icon: <MessageSquare className="h-4 w-4" /> },
    { value: "widget", label: t("tabs.widget"), icon: <Puzzle className="h-4 w-4" /> },
    { value: "handoff", label: t("tabs.handoff"), icon: <Users className="h-4 w-4" /> },
    { value: "public", label: t("tabs.publicPage"), icon: <Globe className="h-4 w-4" /> },
    { value: "channels", label: t("tabs.channels"), icon: <Radio className="h-4 w-4" /> },
    { value: "general", label: t("tabs.general"), icon: <SlidersHorizontal className="h-4 w-4" /> },
  ];

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
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" />
          {t("backToAgents")}
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
        className="gap-2 -ms-2"
      >
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
        {t("allAgents")}
      </Button>

      {/* Agent header */}
      <AgentHeader project={project} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Mobile: dropdown select (Tabs primitive stays the source of truth for content) */}
        <MobileTabSelect
          value={activeTab}
          onValueChange={handleTabChange}
          options={tabOptions}
          className="md:hidden"
        />

        {/* Desktop: full tab row */}
        <TabsList className="hidden w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto md:flex">
          {tabOptions.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              {tab.icon}
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab project={project} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeTab />
        </TabsContent>

        <TabsContent value="endpoints" className="mt-6">
          <EndpointsTab />
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

        <TabsContent value="public" className="mt-6">
          <PublicPageTab project={project} />
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <ChannelsTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <GeneralTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
