"use client";

import { Skeleton } from "@chatbot/ui";
import { Search, UserPlus } from "lucide-react";
import { Lead } from "../constants";
import { LeadListItem } from "./lead-list-item";

interface LeadListPanelProps {
  leads: Lead[];
  total: number;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  limit: number;
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "qualified", label: "Qualified" },
  { key: "not_qualified", label: "Disqualified" },
  { key: "qualifying", label: "Pending" },
];

export function LeadListPanel({
  leads,
  total,
  loading,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  page,
  onPageChange,
  limit,
}: LeadListPanelProps) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full">
      {/* Filter Tabs */}
      <div className="px-4 pt-4 pb-2 space-y-3 border-b">
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onStatusFilterChange(tab.key)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3 py-1.5 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* List Header */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">
          Leads ({total})
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No leads found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {statusFilter !== "all"
                ? "Try a different filter"
                : "Leads appear when visitors submit forms"}
            </p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadListItem
              key={lead.id}
              lead={lead}
              selected={selectedId === lead.id}
              onClick={() => onSelect(lead.id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
