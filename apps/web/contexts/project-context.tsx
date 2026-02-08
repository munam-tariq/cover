"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";

// localStorage key for persisting selected project
const STORAGE_KEY = "cover_selected_project_id";

export interface Project {
  id: string;
  name: string;
  plan?: string;
  systemPrompt: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  knowledgeCount?: number;
  endpointCount?: number;
  role?: "owner" | "admin" | "agent";
  isOwner?: boolean;
}

interface CreateProjectData {
  name: string;
  systemPrompt?: string;
}

interface ProjectContextValue {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  switchProject: (projectId: string) => void;
  createProject: (data: CreateProjectData) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * Hook to access the project context
 */
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

interface ProjectProviderProps {
  children: React.ReactNode;
}

/**
 * ProjectProvider - Manages project state across the dashboard
 *
 * Responsibilities:
 * - Fetches all user's projects on mount
 * - Persists selected project ID in localStorage
 * - Provides methods to switch, create, and delete projects
 * - Redirects to /projects if user has no projects
 */
export function ProjectProvider({ children }: ProjectProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs for values needed in initializeProjects to avoid re-running on navigation
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const routerRef = useRef(router);
  routerRef.current = router;

  /**
   * Fetch all projects from API (with stats for knowledge/endpoint counts)
   */
  const fetchProjects = useCallback(async () => {
    try {
      const response = await apiClient<{ projects: Project[] }>("/api/projects?include_stats=true");
      return response.projects || [];
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      throw err;
    }
  }, []);

  /**
   * Initialize projects and restore selected project from localStorage
   */
  const initializeProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedProjects = await fetchProjects();
      setProjects(fetchedProjects);

      if (fetchedProjects.length === 0) {
        // No projects - redirect to projects page (unless already there)
        setCurrentProject(null);
        if (pathnameRef.current !== "/projects") {
          routerRef.current.push("/projects");
        }
        return;
      }

      // Try to restore selected project from localStorage
      const storedProjectId = typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;

      let selectedProject: Project | undefined;

      if (storedProjectId) {
        // Find the stored project in the list
        selectedProject = fetchedProjects.find((p) => p.id === storedProjectId);
      }

      // If not found or no stored ID, use the first project
      if (!selectedProject) {
        selectedProject = fetchedProjects[0];
      }

      setCurrentProject(selectedProject);

      // Persist to localStorage
      if (typeof window !== "undefined" && selectedProject) {
        localStorage.setItem(STORAGE_KEY, selectedProject.id);
      }
    } catch (err) {
      console.error("Failed to initialize projects:", err);
      setError("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [fetchProjects]);

  /**
   * Switch to a different project
   * Refreshes the page to ensure clean state and give user feedback
   */
  const switchProject = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      console.error("Project not found:", projectId);
      return;
    }

    // Persist to localStorage BEFORE refreshing
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, projectId);
      // Refresh the page for clean state and user feedback
      window.location.reload();
    }
  }, [projects]);

  /**
   * Create a new project
   */
  const createProject = useCallback(async (data: CreateProjectData): Promise<Project> => {
    const response = await apiClient<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const newProject = response.project;

    // Add to projects list
    setProjects((prev) => [...prev, newProject]);

    // Switch to the new project
    setCurrentProject(newProject);

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newProject.id);
    }

    return newProject;
  }, []);

  /**
   * Delete a project (soft delete)
   */
  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    await apiClient(`/api/projects/${projectId}`, {
      method: "DELETE",
    });

    // Remove from projects list
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    setProjects(updatedProjects);

    // If we deleted the current project, switch to another one
    if (currentProject?.id === projectId) {
      if (updatedProjects.length > 0) {
        // Switch to first available project
        const newProject = updatedProjects[0];
        setCurrentProject(newProject);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, newProject.id);
        }
      } else {
        // No projects left - redirect to projects page
        setCurrentProject(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }
        router.push("/projects");
      }
    }
  }, [projects, currentProject, router]);

  /**
   * Refresh projects list
   */
  const refreshProjects = useCallback(async () => {
    try {
      const fetchedProjects = await fetchProjects();
      setProjects(fetchedProjects);

      // Update current project if it still exists
      if (currentProject) {
        const updated = fetchedProjects.find((p) => p.id === currentProject.id);
        if (updated) {
          setCurrentProject(updated);
        } else if (fetchedProjects.length > 0) {
          // Current project was deleted, switch to first one
          setCurrentProject(fetchedProjects[0]);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, fetchedProjects[0].id);
          }
        } else {
          setCurrentProject(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh projects:", err);
    }
  }, [fetchProjects, currentProject]);

  // Initialize on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  const value: ProjectContextValue = {
    currentProject,
    projects,
    isLoading,
    error,
    switchProject,
    createProject,
    deleteProject,
    refreshProjects,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
