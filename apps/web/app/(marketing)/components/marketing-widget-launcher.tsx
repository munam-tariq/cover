"use client";

import { useRef, useState } from "react";

import { Ic } from "./marketing-kit";

const WIDGET_SCRIPT_URL = "https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js";
const WIDGET_SCRIPT_SELECTOR = 'script[data-frontface-marketing-widget="true"]';

function openHostedWidget(localButton: HTMLButtonElement | null) {
  window.setTimeout(() => {
    const hostedButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-label="Open chat"]')).find(
      (button) => button !== localButton,
    );

    hostedButton?.click();
  }, 350);
}

export function MarketingWidgetLauncher() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  const loadWidget = () => {
    const existingScript = document.querySelector<HTMLScriptElement>(WIDGET_SCRIPT_SELECTOR);

    if (existingScript || status === "loaded") {
      openHostedWidget(buttonRef.current);
      return;
    }

    setStatus("loading");

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.dataset.frontfaceMarketingWidget = "true";
    script.dataset.projectId = "ad7d8196-e719-4522-9f08-a9a3beb4c3d8";
    script.dataset.apiUrl = "https://api.frontface.app";
    script.dataset.title = "Help";
    script.dataset.greeting = "Hi! Have questions about FrontFace? I'm here to help.";
    script.dataset.primaryColor = "#11151b";
    script.dataset.position = "bottom-right";
    script.onload = () => {
      setStatus("loaded");
      openHostedWidget(buttonRef.current);
    };
    script.onerror = () => {
      script.remove();
      setStatus("error");
    };

    document.body.append(script);
  };

  if (status === "loaded") return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={status === "loading" ? "Loading chat" : "Open FrontFace chat"}
      aria-busy={status === "loading"}
      onClick={loadWidget}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 64,
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: "0",
        background: "#11151b",
        color: "#fff",
        boxShadow: "0 0 0 10px rgba(17,21,27,.08), 0 24px 54px -24px rgba(17,21,27,.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: status === "loading" ? "wait" : "pointer",
        opacity: status === "loading" ? 0.82 : 1,
      }}
    >
      {status === "loading" ? (
        <span
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,.3)",
            borderTopColor: "#fff",
            animation: "ff-spin .8s linear infinite",
          }}
        />
      ) : (
        Ic("bot", { size: 22 })
      )}
    </button>
  );
}
