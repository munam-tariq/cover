"use client";

import { EndpointsList } from "@/components/endpoints/endpoints-list";
/**
 * Endpoints Tab
 *
 * Reuses the existing EndpointsList component to display and manage
 * API endpoints for the agent.
 */
export function EndpointsTab() {
  // The EndpointsList component uses the project context,
  // which is already set to the current project
  return <EndpointsList />;
}
