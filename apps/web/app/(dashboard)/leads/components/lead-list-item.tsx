"use client";

import { Badge } from "@chatbot/ui";
import { Lead, STATUS_LABELS, STATUS_VARIANTS, getLeadDisplayName } from "../constants";

interface LeadListItemProps {
  lead: Lead;
  selected: boolean;
  onClick: () => void;
}

export function LeadListItem({ lead, selected, onClick }: LeadListItemProps) {
  const displayName = getLeadDisplayName(lead);
  const statusLabel = STATUS_LABELS[lead.qualificationStatus] || lead.qualificationStatus;
  const statusVariant = STATUS_VARIANTS[lead.qualificationStatus] || "outline";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50 ${
        selected ? "bg-muted border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(lead.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge variant={statusVariant} className="shrink-0 text-xs">
          {statusLabel}
        </Badge>
      </div>
    </button>
  );
}
