"use client";

import { Card, Skeleton } from "@chatbot/ui";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";

import { useProject } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";


import { LeadDetailPanel } from "./components/lead-detail-panel";
import { LeadListPanel } from "./components/lead-list-panel";
import { Lead } from "./constants";

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export default function LeadsPage() {
  const t = useTranslations("dashboard.pages.leads");
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
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter, page, t]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    setPage(0);
    setSelectedId(null);
  }, [statusFilter]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredLeads = normalizedSearchQuery
    ? leads.filter(
        (lead) =>
          lead.email.toLowerCase().includes(normalizedSearchQuery) ||
          lead.phone?.toLowerCase().includes(normalizedSearchQuery) ||
          lead.firstMessage?.toLowerCase().includes(normalizedSearchQuery)
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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("noProjectSelected")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-12rem)]">
          {/* Left Panel - Lead List. Full width on mobile, hidden once a lead
              is selected (mobile shows detail full-screen instead); always
              a fixed-width column alongside the detail panel on desktop. */}
          <div
            className={cn(
              "w-full flex-shrink-0 md:w-[380px] md:border-e",
              selectedId && "hidden md:block"
            )}
          >
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

          {/* Right Panel - Lead Detail. Hidden on mobile until a lead is
              selected; always visible on desktop (with the placeholder). */}
          <div
            className={cn(
              "flex-1 overflow-y-auto",
              !selectedId && "hidden md:block"
            )}
          >
            {selectedLead ? (
              <>
                {/* Plain nav-style back link (no border) — matches the
                    back button on the project-detail page rather than
                    reading as a standalone divider/section header. */}
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex items-center gap-2 px-4 pt-4 text-sm text-muted-foreground hover:text-foreground md:hidden"
                >
                  <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
                  {t("backToList")}
                </button>
                <LeadDetailPanel lead={selectedLead} />
              </>
            ) : (
              <div className="h-full flex-col items-center justify-center text-center p-8 hidden md:flex">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  {t("selectTitle")}
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {t("selectDescription")}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
