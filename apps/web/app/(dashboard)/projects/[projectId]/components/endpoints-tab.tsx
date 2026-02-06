"use client";

import { type Project } from "@/contexts/project-context";
import { EndpointsList } from "@/components/endpoints/endpoints-list";

interface EndpointsTabProps {
  project: Project;
}

/**
 * Endpoints Tab
 *
 * Reuses the existing EndpointsList component to display and manage
 * API endpoints for the agent.
 */
export function EndpointsTab({ project }: EndpointsTabProps) {
  // The EndpointsList component uses the project context,
  // which is already set to the current project
  return <EndpointsList />;
}
