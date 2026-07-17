"use client";

import { Button } from "@chatbot/ui";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  clearSecondaryInboxFilters,
  getActiveInboxFilters,
  INBOX_ACTIVITY_PERIOD_OPTIONS,
  INBOX_HANDOFF_OPTIONS,
  removeInboxFilter,
  type InboxAssignableMember,
  type InboxQueryState,
  type InboxSecondaryFilter,
} from "@/lib/inbox-query";

interface InboxFilterChipsProps {
  value: InboxQueryState;
  isOwner: boolean;
  members: InboxAssignableMember[];
  onChange: (next: InboxQueryState) => void;
}

export function InboxFilterChips({
  value,
  isOwner,
  members,
  onChange,
}: InboxFilterChipsProps) {
  const t = useTranslations("dashboard.pages.inbox");
  const activeFilters = getActiveInboxFilters(value);

  if (activeFilters.length === 0) return null;

  const labelFor = (filter: InboxSecondaryFilter): string => {
    if (filter === "needsReply") {
      return t(isOwner ? "filters.needsAgentReply" : "filters.needsMyReply");
    }
    if (filter === "voiceUsed") return t("filters.voiceUsed");
    if (filter === "flagged") return t("filters.flaggedOnly");
    if (filter === "handoffReason") {
      const option = INBOX_HANDOFF_OPTIONS.find(
        ({ value: reason }) => reason === value.handoffReason
      );
      return option ? t(option.labelKey) : t("filters.handoffReason");
    }
    if (filter === "activityPeriod") {
      const option = INBOX_ACTIVITY_PERIOD_OPTIONS.find(
        ({ value: period }) => period === value.activityPeriod
      );
      return option ? t(option.labelKey) : t("filters.activityPeriod");
    }

    const assignee = value.assignedAgent;
    const assigneeName =
      assignee === "me"
        ? t("filters.me")
        : assignee === "unassigned"
          ? t("filters.unassigned")
          : members.find(({ userId }) => userId === assignee)?.name;
    return t("filters.assignedValue", {
      name: assigneeName ?? t("filters.assignedAgent"),
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label={t("filters.appliedLabel", { count: activeFilters.length })}
    >
      {activeFilters.map((filter) => {
        const label = labelFor(filter);
        return (
          <Button
            key={filter}
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 gap-1 rounded-full px-2 text-xs"
            onClick={() => onChange(removeInboxFilter(value, filter))}
            aria-label={t("filters.remove", { label })}
          >
            {label}
            <X aria-hidden="true" className="h-3 w-3" />
          </Button>
        );
      })}

      {activeFilters.length > 1 && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-7 px-1 text-xs"
          onClick={() => onChange(clearSecondaryInboxFilters(value))}
        >
          {t("filters.clearAll")}
        </Button>
      )}
    </div>
  );
}
