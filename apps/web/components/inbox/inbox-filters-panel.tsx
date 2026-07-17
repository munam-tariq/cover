"use client";

import { Switch } from "@chatbot/ui";
import { useTranslations } from "next-intl";
import { useId } from "react";

import {
  INBOX_ACTIVITY_PERIOD_OPTIONS,
  INBOX_HANDOFF_OPTIONS,
  type InboxActivityPeriod,
  type InboxAssignableMember,
  type InboxHandoffReason,
  type InboxQueryState,
} from "@/lib/inbox-query";

interface InboxFiltersPanelProps {
  value: InboxQueryState;
  isOwner: boolean;
  members: InboxAssignableMember[];
  onChange: (next: InboxQueryState) => void;
}

interface FilterSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const selectClassName =
  "bg-background h-9 w-full rounded-md border px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FilterSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: FilterSwitchProps) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function InboxFiltersPanel({
  value,
  isOwner,
  members,
  onChange,
}: InboxFiltersPanelProps) {
  const t = useTranslations("dashboard.pages.inbox");
  const id = useId();

  return (
    <div
      id="inbox-filters-panel"
      className="bg-muted/20 rounded-lg border p-4"
      aria-label={t("filters.panelLabel")}
    >
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterSwitch
          id={`${id}-needs-reply`}
          label={t(
            isOwner ? "filters.needsAgentReply" : "filters.needsMyReply"
          )}
          checked={value.needsReply}
          onCheckedChange={(checked) =>
            onChange({
              ...value,
              status: checked ? "agent_active" : value.status,
              needsReply: checked,
            })
          }
        />

        <FilterSwitch
          id={`${id}-voice-used`}
          label={t("filters.voiceUsed")}
          checked={value.voiceUsed}
          onCheckedChange={(checked) =>
            onChange({ ...value, voiceUsed: checked })
          }
        />

        <FilterSwitch
          id={`${id}-flagged`}
          label={t("filters.flaggedOnly")}
          checked={value.flagged}
          onCheckedChange={(checked) =>
            onChange({ ...value, flagged: checked })
          }
        />

        {isOwner && value.scope === "all" && value.status !== "waiting" && (
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-assignee`} className="text-sm font-medium">
              {t("filters.assignedAgent")}
            </label>
            <select
              id={`${id}-assignee`}
              value={value.assignedAgent ?? "anyone"}
              onChange={(event) =>
                onChange({
                  ...value,
                  assignedAgent:
                    event.target.value === "anyone" ? null : event.target.value,
                })
              }
              className={selectClassName}
            >
              <option value="anyone">{t("filters.anyone")}</option>
              <option value="unassigned">{t("filters.unassigned")}</option>
              <option value="me">{t("filters.me")}</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-1.5">
          <label htmlFor={`${id}-handoff`} className="text-sm font-medium">
            {t("filters.handoffReason")}
          </label>
          <select
            id={`${id}-handoff`}
            value={value.handoffReason ?? "any"}
            onChange={(event) =>
              onChange({
                ...value,
                handoffReason:
                  event.target.value === "any"
                    ? null
                    : (event.target.value as InboxHandoffReason),
              })
            }
            className={selectClassName}
          >
            <option value="any">{t("filters.anyHandoffReason")}</option>
            {INBOX_HANDOFF_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor={`${id}-activity`} className="text-sm font-medium">
            {t("filters.activityPeriod")}
          </label>
          <select
            id={`${id}-activity`}
            value={value.activityPeriod ?? "any"}
            onChange={(event) =>
              onChange({
                ...value,
                activityPeriod:
                  event.target.value === "any"
                    ? null
                    : (event.target.value as InboxActivityPeriod),
              })
            }
            className={selectClassName}
          >
            <option value="any">{t("filters.activity.anyTime")}</option>
            {INBOX_ACTIVITY_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
