"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, FolderOpen, Calendar } from "lucide-react";
import { Card, CardContent, Button, Skeleton } from "@chatbot/ui";
import { useProject } from "@/contexts/project-context";
import { CreateProjectModal } from "@/components/projects/create-project-modal";

/**
 * ProjectsPage - Page showing all user's projects
 *
 * Features:
 * - List of all projects with name and created date
 * - Click project to switch and go to dashboard
 * - Create new project button
 * - Empty state for users with no projects
 * - Opens create modal if ?create=true in URL
 */
export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, currentProject, isLoading, switchProject } = useProject();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Open create modal if ?create=true in URL
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsCreateModalOpen(true);
      // Clean up URL
      router.replace("/projects");
    }
  }, [searchParams, router]);

  /**
   * Handle project click - switch to it and go to dashboard
   */
  const handleProjectClick = (projectId: string) => {
    switchProject(projectId);
    router.push("/");
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI agents
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Agent
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No agents yet</h3>
            <p className="text-muted-foreground text-sm mb-4 text-center max-w-sm">
              Create your first AI agent to get started. Each agent has its own
              knowledge base, API endpoints, and chat settings.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects list */}
      {!isLoading && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const isActive = currentProject?.id === project.id;

            return (
              <Card
                key={project.id}
                className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
                  isActive ? "border-primary ring-1 ring-primary" : ""
                }`}
                onClick={() => handleProjectClick(project.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(project.createdAt)}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0 ml-2">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Optional: Show quick stats if available */}
                  {(project.knowledgeCount !== undefined || project.endpointCount !== undefined) && (
                    <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                      {project.knowledgeCount !== undefined && (
                        <span>{project.knowledgeCount} sources</span>
                      )}
                      {project.endpointCount !== undefined && (
                        <span>{project.endpointCount} endpoints</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
