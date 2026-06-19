"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (
      command: "consentv2",
      consent: { ad_Storage: "granted" | "denied"; analytics_Storage: "granted" | "denied" },
    ) => void;
  }
}

const CONSENT_KEY = "frontface-analytics-consent";
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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

  if (!ready || (!clarityProjectId && !googleAnalyticsId)) return null;

  const saveChoice = (nextChoice: "granted" | "denied") => {
    window.localStorage.setItem(CONSENT_KEY, nextChoice);
    setChoice(nextChoice);
    window.clarity?.("consentv2", {
      ad_Storage: nextChoice,
      analytics_Storage: nextChoice,
    });
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
            <Script
              id="microsoft-clarity"
              src={`https://www.clarity.ms/tag/${clarityProjectId}`}
              strategy="afterInteractive"
              onLoad={() =>
                window.clarity?.("consentv2", {
                  ad_Storage: "granted",
                  analytics_Storage: "granted",
                })
              }
            />
          )}
        </>
      )}

      {clarityProjectId && choice === null && (
        <div
          role="dialog"
          aria-label="Analytics consent"
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 70,
            width: "min(420px, calc(100vw - 36px))",
            border: "1px solid var(--ff-line-2)",
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 24px 70px -36px rgba(16,24,40,.45)",
            padding: 16,
            color: "var(--ff-ink)",
          }}
        >
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>
            Help us improve FrontFace
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--ff-soft)",
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
                border: "1px solid var(--ff-line-2)",
                background: "#fff",
                color: "var(--ff-soft)",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
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
                border: "1px solid var(--ff-ink)",
                background: "var(--ff-ink)",
                color: "#fff",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 750,
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
