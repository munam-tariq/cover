"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import { Skeleton } from "@chatbot/ui";

interface ProjectGuardProps {
  children: React.ReactNode;
}

/**
 * ProjectGuard - Ensures user has at least one project
 *
 * If user has no projects (e.g., didn't complete onboarding),
 * redirects them to the onboarding flow.
 *
 * Renders inside the layout shell (sidebar/header are always visible).
 */
export function ProjectGuard({ children }: ProjectGuardProps) {
  const router = useRouter();
  const { projects, isLoading } = useProject();

  useEffect(() => {
    // Wait for projects to load
    if (isLoading) return;

    // If user has no projects, redirect to onboarding
    if (projects.length === 0) {
      console.log("No projects found, redirecting to onboarding");
      router.push("/onboarding");
    }
  }, [projects, isLoading, router]);

  // Show loading skeleton (sidebar/header stay visible via layout)
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // If no projects and not loading, show message (will redirect)
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Redirecting to setup...</p>
      </div>
    );
  }

  // User has projects, render children
  return <>{children}</>;
}
