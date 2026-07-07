"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({
  className,
  variant = "text",
}: {
  className?: string;
  // "text" is the shared marketing/header look (.ff-locale-btn, reset-only).
  // "chips" is for contexts styled as a row of segmented buttons, e.g. the
  // mobile nav drawer's control cards — same switching logic, different look.
  variant?: "text" | "chips";
}) {
  const locale = useLocale();
  const t = useTranslations("common.localeSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // replace() keeps history clean; next-intl updates the NEXT_LOCALE cookie.
    router.replace(
      // @ts-expect-error -- pathname+params matches the current route shape
      { pathname, params },
      { locale: next }
    );
  }

  return (
    <div className={className} role="group" aria-label={t("label")}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-current={l === locale ? "true" : undefined}
          className={
            variant === "chips"
              ? cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  l === locale
                    ? "bg-background font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )
              : "ff-locale-btn"
          }
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
