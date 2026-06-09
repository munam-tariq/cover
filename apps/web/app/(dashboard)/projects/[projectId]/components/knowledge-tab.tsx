"use client";

import { KnowledgeList } from "@/components/knowledge/knowledge-list";
/**
 * Knowledge Tab
 *
 * Reuses the existing KnowledgeList component to display and manage
 * knowledge sources for the agent.
 */
export function KnowledgeTab() {
  // The KnowledgeList component uses the project context,
  // which is already set to the current project
  return <KnowledgeList />;
}
