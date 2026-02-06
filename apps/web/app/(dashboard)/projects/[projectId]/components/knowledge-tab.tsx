"use client";

import { type Project } from "@/contexts/project-context";
import { KnowledgeList } from "@/components/knowledge/knowledge-list";

interface KnowledgeTabProps {
  project: Project;
}

/**
 * Knowledge Tab
 *
 * Reuses the existing KnowledgeList component to display and manage
 * knowledge sources for the agent.
 */
export function KnowledgeTab({ project }: KnowledgeTabProps) {
  // The KnowledgeList component uses the project context,
  // which is already set to the current project
  return <KnowledgeList />;
}
