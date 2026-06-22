"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { CONSENT_KEY, initAnalytics } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const hasAnyAnalytics = Boolean(
  clarityProjectId || googleAnalyticsId || posthogToken
);

export function AnalyticsConsent() {
  const [choice, setChoice] = useState<"granted" | "denied" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (stored === "granted" || stored === "denied") {
      setChoice(stored);
    }
    setReady(true);
  }, []);

  // Bridge the consent decision into PostHog. PostHog only loads once consent is
  // granted (see lib/analytics); denial leaves it uninitialized and untouched.
  useEffect(() => {
    if (choice === "granted") void initAnalytics();
  }, [choice]);

  if (!ready || !hasAnyAnalytics) return null;

  const saveChoice = (nextChoice: "granted" | "denied") => {
    window.localStorage.setItem(CONSENT_KEY, nextChoice);
    setChoice(nextChoice);
  };

  return (
    <>
      {choice === "granted" && (
        <>
          {googleAnalyticsId && (
            <>
              <Script
                id="google-analytics-src"
                src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${googleAnalyticsId}');
                `}
              </Script>
            </>
          )}
          {clarityProjectId && (
            <Script id="microsoft-clarity" strategy="afterInteractive">
              {`(function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script","${clarityProjectId}");`}
            </Script>
          )}
        </>
      )}

      {hasAnyAnalytics && choice === null && (
        <div
          role="dialog"
          aria-label="Analytics consent"
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 70,
            width: "min(420px, calc(100vw - 36px))",
            border: "1px solid #e0e3e8",
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 24px 70px -36px rgba(16,24,40,.45)",
            padding: 16,
            color: "#11151b",
          }}
        >
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>
            Help us improve FrontFace
          </div>
          <p
            style={{
              margin: 0,
              color: "#5a6573",
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            We use privacy-conscious analytics to see where visitors get stuck.
            These tools only load if you allow analytics.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={() => saveChoice("denied")}
              style={{
                height: 36,
                borderRadius: 9,
                border: "1px solid #e0e3e8",
                background: "#fff",
                color: "#5a6573",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              No thanks
            </button>
            <button
              type="button"
              onClick={() => saveChoice("granted")}
              style={{
                height: 36,
                borderRadius: 9,
                border: "1px solid #11151b",
                background: "#11151b",
                color: "#fff",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Allow analytics
            </button>
          </div>
        </div>
      )}
    </>
  );
}
