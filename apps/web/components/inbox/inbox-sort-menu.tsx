"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@chatbot/ui";
import { ChevronDown, Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { INBOX_SORT_OPTIONS, type InboxSort } from "@/lib/inbox-query";

interface InboxSortMenuProps {
  value: InboxSort;
  attentionDisabled: boolean;
  onChange: (sort: InboxSort) => void;
}

export function InboxSortMenu({
  value,
  attentionDisabled,
  onChange,
}: InboxSortMenuProps) {
  const t = useTranslations("dashboard.pages.inbox");
  const activeOption =
    INBOX_SORT_OPTIONS.find((option) => option.value === value) ??
    INBOX_SORT_OPTIONS[0];

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-full gap-1.5">
            <span className="truncate">
              {t("sort.trigger", { label: t(activeOption.labelKey) })}
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(nextValue) => onChange(nextValue as InboxSort)}
          >
            {INBOX_SORT_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                disabled={option.value === "attention" && attentionDisabled}
                className="items-start py-2"
              >
                <span className="grid gap-0.5 whitespace-normal">
                  <span className="font-medium">{t(option.labelKey)}</span>
                  <span className="text-muted-foreground text-xs leading-4">
                    {t(option.descriptionKey)}
                    {option.value === "attention" && attentionDisabled
                      ? ` ${t("sort.attention.terminalDisabled")}`
                      : null}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8 shrink-0"
              aria-label={t("sort.explanationLabel")}
            >
              <Info aria-hidden="true" className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {t(activeOption.descriptionKey)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
