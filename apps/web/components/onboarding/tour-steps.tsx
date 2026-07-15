"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Step } from "onborda";

import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// Tour interface (not exported from onborda but used internally)
interface Tour {
  tour: string;
  steps: Step[];
}

export function useOnboardingTours(projectId: string | null): Tour[] {
  const t = useTranslations("onboarding.tour");
  const locale = useLocale() as Locale;

  // Routes must carry the active locale: Onborda pushes them through the
  // plain router, which would otherwise drop /ar and bounce to English.
  const generalTabRoute = projectId
    ? getPathname({
        href: { pathname: `/projects/${projectId}`, query: { tab: "general" } },
        locale,
      })
    : getPathname({ href: "/projects", locale });
  const dashboardRoute = getPathname({ href: "/dashboard", locale });

  return [
    {
      tour: "mcp-setup",
      steps: [
        {
          icon: <>&#128075;</>,
          title: t("welcomeTitle"),
          content: <>{t("welcomeBody")}</>,
          selector: "#onboarding-welcome",
          side: "bottom",
          showControls: true,
          pointerPadding: 10,
          pointerRadius: 10,
          nextRoute: generalTabRoute, // Navigate to the General tab when clicking Next
        },
        {
          icon: <>&#128273;</>,
          title: t("apiKeyTitle"),
          content: <>{t("apiKeyBody")}</>,
          // Anchored to the card rather than the generate button: that button
          // only renders while no key exists, so it disappears the moment one
          // is created and leaves the step with nothing to point at.
          selector: "#onboarding-api-key",
          side: "bottom",
          showControls: true,
          pointerPadding: 15,
          pointerRadius: 10,
          prevRoute: dashboardRoute,
        },
        {
          icon: <>&#128203;</>,
          title: t("mcpConfigTitle"),
          content: <>{t("mcpConfigBody")}</>,
          selector: "#onboarding-mcp-config",
          side: "top",
          showControls: true,
          pointerPadding: 15,
          pointerRadius: 10,
        },
        {
          icon: <>&#127881;</>,
          title: t("doneTitle"),
          content: (
            <>
              {t("doneBody")} <em>{t("doneExample")}</em>
            </>
          ),
          selector: "#onboarding-mcp-config",
          side: "top",
          showControls: true,
          pointerPadding: 15,
          pointerRadius: 10,
        },
      ],
    },
  ];
}
