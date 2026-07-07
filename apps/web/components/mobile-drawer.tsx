"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Shared slide-in drawer for mobile (md:hidden), sliding from either the
// inline-start edge (primary navigation) or inline-end edge (contextual
// detail/info panels — the conventional split, e.g. Gmail/Slack side panels).
// Resting position uses logical start/end (auto-flips for RTL); the slide
// animation itself needs an explicit rtl: override since Tailwind's
// slide-in-from-left/right utilities are physical, not logical.
export function MobileDrawer({
  open,
  onOpenChange,
  side,
  title,
  description,
  closeLabel,
  children,
  widthClassName = "w-72 max-w-[80%]",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: "start" | "end";
  title: string;
  description: string;
  closeLabel: string;
  children: ReactNode;
  widthClassName?: string;
}) {
  const isStart = side === "start";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/40 md:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            // pt-12 (not p-4) reserves room for the absolutely-positioned Close
            // button below, so content that starts at the same corner (e.g. an
            // "end"-side panel whose content also starts at the top-start
            // corner) doesn't render underneath it.
            "fixed inset-y-0 z-50 overflow-y-auto bg-background px-4 pb-4 pt-12 shadow-xl focus:outline-none md:hidden",
            widthClassName,
            isStart ? "start-0 border-e" : "end-0 border-s",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
            isStart
              ? cn(
                  "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
                  "rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right"
                )
              : cn(
                  "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
                  "rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left"
                )
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className={cn(
              "absolute top-4 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
              isStart ? "end-4" : "start-4"
            )}
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
