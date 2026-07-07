"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

const WIDGET_SCRIPT_URL = "https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js";
const WIDGET_SCRIPT_SELECTOR = 'script[data-frontface-marketing-widget="true"]';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Loads the hosted FrontFace widget on every marketing page. The widget renders
 * its own floating bubble, so this component renders nothing itself.
 *
 * The script is injected once the browser is idle (or after a short fallback
 * delay) so it never competes with the initial page render — but it loads on
 * its own, with no click required.
 */
export function MarketingWidgetLauncher() {
  const t = useTranslations("marketing.widgetLauncher");
  const greeting = t("greeting");
  useEffect(() => {
    if (document.querySelector(WIDGET_SCRIPT_SELECTOR)) return;

    let injected = false;
    const inject = () => {
      if (injected || document.querySelector(WIDGET_SCRIPT_SELECTOR)) return;
      injected = true;

      const script = document.createElement("script");
      script.src = WIDGET_SCRIPT_URL;
      script.async = true;
      script.dataset.frontfaceMarketingWidget = "true";
      script.dataset.projectId = "ad7d8196-e719-4522-9f08-a9a3beb4c3d8";
      script.dataset.apiUrl = "https://api.frontface.app";
      script.dataset.title = "Help";
      script.dataset.greeting = greeting;
      script.dataset.primaryColor = "#11151b";
      script.dataset.position = "bottom-right";
      document.body.append(script);
    };

    const w = window as IdleWindow;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(inject, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(inject, 1200);
    }

    return () => {
      if (idleId !== undefined && typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [greeting]);

  return null;
}
