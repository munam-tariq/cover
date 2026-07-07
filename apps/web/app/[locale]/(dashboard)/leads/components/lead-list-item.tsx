"use client";

import { Badge } from "@chatbot/ui";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Lead, STATUS_VARIANTS, getLeadDisplayName } from "../constants";

interface LeadListItemProps {
  lead: Lead;
  selected: boolean;
  onClick: () => void;
}

export function LeadListItem({ lead, selected, onClick }: LeadListItemProps) {
  const t = useTranslations("dashboard.pages.leads");
  const displayName = getLeadDisplayName(lead);
  const statusVariant = STATUS_VARIANTS[lead.qualificationStatus] || "outline";

  return (
    <button
      onClick={onClick}
      className={`w-full text-start px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50 ${
        selected ? "bg-muted border-s-2 border-s-primary" : "border-s-2 border-s-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
          {lead.phone && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </p>
          )}
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
          {t(`statuses.${lead.qualificationStatus}`)}
        </Badge>
      </div>
    </button>
  );
}
