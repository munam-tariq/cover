"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Skeleton } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { MessageSquare } from "lucide-react";
import { Lead } from "./constants";
import { LeadListPanel } from "./components/lead-list-panel";
import { LeadDetailPanel } from "./components/lead-detail-panel";

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export default function LeadsPage() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const limit = 20;

  const fetchLeads = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      let url = `/api/projects/${currentProject.id}/leads?limit=${limit}&offset=${page * limit}`;
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      const data = await apiClient<LeadsResponse>(url);
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      setError("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    setPage(0);
    setSelectedId(null);
  }, [statusFilter]);

  const filteredLeads = searchQuery
    ? leads.filter(
        (lead) =>
          lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.firstMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leads;

  const selectedLead = leads.find((l) => l.id === selectedId) || null;

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          View and manage captured leads from conversations
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-12rem)]">
          {/* Left Panel - Lead List */}
          <div className="w-[380px] border-r flex-shrink-0">
            <LeadListPanel
              leads={filteredLeads}
              total={total}
              loading={loading}
              selectedId={selectedId}
              onSelect={setSelectedId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              page={page}
              onPageChange={setPage}
              limit={limit}
            />
          </div>

          {/* Right Panel - Lead Detail */}
          <div className="flex-1 overflow-y-auto">
            {selectedLead ? (
              <LeadDetailPanel lead={selectedLead} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  Select a lead
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Choose a lead from the list to view their details
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
