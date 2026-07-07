"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@chatbot/ui";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface MobileTabSelectOption {
  value: string;
  label: string;
  icon: ReactNode;
}

// Mobile substitute for a horizontal Tabs row — a full-width trigger showing
// the current tab, opening a dropdown list of the rest. Reusable anywhere a
// page has too many tabs to fit a phone screen (Settings, etc.); pair with
// `hidden md:flex` on the desktop TabsList and `md:hidden` on this component.
export function MobileTabSelect({
  value,
  onValueChange,
  options,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: MobileTabSelectOption[];
  className?: string;
}) {
  const current = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between gap-2", className)}
        >
          <span className="flex items-center gap-2 truncate">
            {current?.icon}
            <span className="truncate">{current?.label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className="flex cursor-pointer items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2 truncate">
              {option.icon}
              <span className="truncate">{option.label}</span>
            </span>
            {option.value === value && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
