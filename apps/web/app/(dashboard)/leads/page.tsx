"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, Skeleton, Badge } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { Mail, ChevronDown, ChevronUp, Search } from "lucide-react";

interface LateQualifyingAnswer {
  question_index: number;
  question_text: string;
  answer: string;
  raw_message: string;
  confidence: number;
  capture_type: string;
  captured_at: string;
  promoted: boolean;
}

interface Lead {
  id: string;
  email: string;
  formData: Record<string, { label: string; value: string }>;
  qualifyingAnswers: Array<{ question: string; answer: string; actual_question?: string; answer_reasoning?: string }>;
  lateQualifyingAnswers: LateQualifyingAnswer[];
  qualificationStatus: string;
  qualificationReasoning: string | null;
  captureSource: string | null;
  firstMessage: string | null;
  createdAt: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  qualifying: "In Progress",
  form_completed: "Form Only",
  skipped: "Skipped",
  deferred: "Deferred",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  qualified: "default",
  not_qualified: "destructive",
  qualifying: "secondary",
  form_completed: "outline",
  skipped: "destructive",
  deferred: "secondary",
};

const CAPTURE_SOURCE_LABELS: Record<string, string> = {
  form: "Form",
  inline_email: "Inline Email",
  conversational: "Conversational",
  exit_overlay: "Exit Overlay",
  summary_hook: "Summary Hook",
};

export default function LeadsPage() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const filteredLeads = searchQuery
    ? leads.filter(
        (lead) =>
          lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.firstMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leads;

  const totalPages = Math.ceil(total / limit);

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-64 w-full" />
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          Captured leads from your chat widget
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or message..."
            className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1">
          {["all", "qualified", "not_qualified", "qualifying", "form_completed", "deferred"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {status === "all" ? "All" : STATUS_LABELS[status] || status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No leads yet</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== "all"
                  ? "No leads match this filter. Try a different status."
                  : "Leads will appear here once visitors submit the lead capture form in your chat widget."}
              </p>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_1fr_120px_100px_1fr_100px] gap-4 px-6 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>Email</span>
                <span>Custom Fields</span>
                <span>Status</span>
                <span>Source</span>
                <span>First Message</span>
                <span>Date</span>
              </div>

              {/* Table Rows */}
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="border-b last:border-b-0">
                  <button
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    className="w-full grid grid-cols-[1fr_1fr_120px_100px_1fr_100px] gap-4 px-6 py-4 text-left hover:bg-muted/20 transition-colors items-center"
                  >
                    <span className="text-sm font-medium truncate">{lead.email}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {Object.values(lead.formData || {})
                        .filter((f) => f.value)
                        .map((f) => f.value)
                        .join(", ") || "—"}
                    </span>
                    <Badge variant={STATUS_VARIANTS[lead.qualificationStatus] || "outline"}>
                      {STATUS_LABELS[lead.qualificationStatus] || lead.qualificationStatus}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {lead.captureSource ? (CAPTURE_SOURCE_LABELS[lead.captureSource] || lead.captureSource) : "—"}
                    </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {lead.firstMessage || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </button>

                  {/* Expanded Details */}
                  {expandedId === lead.id && (
                    <div className="px-6 pb-4 bg-muted/10 border-t border-dashed">
                      <div className="grid grid-cols-2 gap-6 pt-4">
                        {/* Form Data */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Form Data</h4>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Email</span>
                              <span className="font-medium">{lead.email}</span>
                            </div>
                            {Object.entries(lead.formData || {}).map(([key, field]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{field.label}</span>
                                <span className="font-medium">{field.value || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Qualifying Answers */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Qualifying Answers</h4>
                          {lead.qualifyingAnswers && lead.qualifyingAnswers.length > 0 ? (
                            <div className="space-y-2">
                              {lead.qualifyingAnswers.map((qa, i) => {
                                // Check if this answer was skipped and has a late answer
                                const isSkipped = qa.answer === "[skipped]" || qa.answer === "N/A";
                                const lateAnswer = lead.lateQualifyingAnswers?.find(
                                  (la) => la.question_text === qa.question || la.question_index === i
                                );
                                const displayAnswer = isSkipped && lateAnswer ? lateAnswer.answer : qa.answer;
                                const isLateCapture = isSkipped && lateAnswer;

                                return (
                                  <div key={i} className="text-sm">
                                    <p className="text-muted-foreground">{qa.question}</p>
                                    {qa.actual_question && (
                                      <p className="text-xs text-muted-foreground/70 italic mt-0.5">
                                        Asked as: &quot;{qa.actual_question}&quot;
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <p className={`font-medium ${isSkipped && !lateAnswer ? "text-muted-foreground italic" : ""}`}>
                                        {displayAnswer}
                                      </p>
                                      {isLateCapture && (
                                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                                          Late capture
                                        </Badge>
                                      )}
                                    </div>
                                    {qa.answer_reasoning && !isSkipped && (
                                      <p className="text-xs text-muted-foreground/70 italic mt-0.5">
                                        {qa.answer_reasoning}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No qualifying questions answered</p>
                          )}
                        </div>
                      </div>

                      {/* First Message */}
                      {lead.firstMessage && (
                        <div className="mt-4 pt-3 border-t">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">First Message</h4>
                          <p className="text-sm">{lead.firstMessage}</p>
                        </div>
                      )}

                      {/* Qualification Notes */}
                      {lead.qualificationReasoning && (
                        <div className="mt-4 pt-3 border-t">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Qualification Notes</h4>
                          <p className="text-sm text-muted-foreground italic">{lead.qualificationReasoning}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total} leads
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
