"use client";

import { type UIStrings } from "@chatbot/shared/i18n";
import { type CSSProperties } from "react";

/** DB CHECK is satisfaction_rating BETWEEN 1 AND 5, so this is a 5-point scale, not thumbs. */
const CSAT_SCALE = [1, 2, 3, 4, 5] as const;

interface CsatControlProps {
  accentColor: string;
  strings: Pick<UIStrings, "csatPrompt" | "csatThanks" | "csatRatingLabel">;
  /** Set once rated — optimistically, so a failed write never nags the customer. */
  submitted?: number | null;
  onSubmit: (rating: number) => void;
}

export function CsatControl({
  accentColor,
  strings,
  submitted,
  onSubmit,
}: CsatControlProps) {
  if (submitted) {
    return (
      <div className="text-muted-foreground pt-1 text-xs">
        {strings.csatThanks}
      </div>
    );
  }

  return (
    <div
      className="space-y-1.5 pt-1"
      style={{ "--csat-accent": accentColor } as CSSProperties}
    >
      <div className="text-muted-foreground text-xs">{strings.csatPrompt}</div>
      {/*
        The scale reads 1→5 in every locale. Left as a logical row it mirrors to 5→1 under RTL,
        which silently inverts the meaning of every rating an Arabic customer gives us.
      */}
      <div dir="ltr" className="flex gap-1.5">
        {CSAT_SCALE.map((rating) => {
          const label = strings.csatRatingLabel.replace(
            "{rating}",
            String(rating)
          );
          return (
            <button
              key={rating}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => onSubmit(rating)}
              className="border-border text-muted-foreground hover:border-[var(--csat-accent)] hover:text-[var(--csat-accent)] focus-visible:ring-[var(--csat-accent)] flex h-7 w-7 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {rating}
            </button>
          );
        })}
      </div>
    </div>
  );
}
