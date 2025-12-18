"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Skeleton,
} from "@chatbot/ui";
import { useProject } from "@/contexts/project-context";

/**
 * ProjectSwitcher - Dropdown component for switching between projects
 *
 * Displays:
 * - Current project name
 * - List of all user's projects (with checkmark on current)
 * - "New Project" action
 * - "View all projects" link
 */
export function ProjectSwitcher() {
  const router = useRouter();
  const { currentProject, projects, isLoading, switchProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Truncate project name if too long
   */
  const truncateName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    return `${name.slice(0, maxLength)}...`;
  };

  /**
   * Handle project selection
   */
  const handleSelectProject = (projectId: string) => {
    switchProject(projectId);
    setIsOpen(false);
    // Refresh the current page to load new project's data
    router.refresh();
  };

  /**
   * Handle "New Project" click
   */
  const handleNewProject = () => {
    setIsOpen(false);
    router.push("/projects?create=true");
  };

  /**
   * Handle "View all projects" click
   */
  const handleViewAllProjects = () => {
    setIsOpen(false);
    router.push("/projects");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-36" />
      </div>
    );
  }

  // No projects state (shouldn't normally happen, context redirects)
  if (!currentProject) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/projects")}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Create Project
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 min-w-[120px] max-w-[200px] justify-between"
        >
          <span className="truncate font-medium">
            {truncateName(currentProject.name)}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch project
        </DropdownMenuLabel>

        {/* Projects list */}
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => handleSelectProject(project.id)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span className="truncate">{truncateName(project.name)}</span>
            {project.id === currentProject.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem
          onClick={handleNewProject}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleViewAllProjects}
          className="cursor-pointer"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          View all projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
