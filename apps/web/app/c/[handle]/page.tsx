import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import type { LeadCaptureClientConfig } from "./lib/public-api";
import {
  PublicChat,
  type PublicConfig,
  type PublicVoiceConfig,
} from "./public-chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.frontface.app";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRAILING_UUID_RE =
  /^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Parse a /c/<slug>-<uuid> (or bare /c/<uuid>) handle into its parts. */
function parseHandle(handleRaw: string): { uuid: string | null; slug: string } {
  const handle = decodeURIComponent(handleRaw);
  if (UUID_RE.test(handle)) return { uuid: handle.toLowerCase(), slug: "" };
  const m = handle.match(TRAILING_UUID_RE);
  if (m) return { slug: m[1], uuid: m[2].toLowerCase() };
  return { uuid: null, slug: handle };
}

interface PublicPageResponse {
  projectId: string;
  slug: string;
  widgetEnabled: boolean;
  config: PublicConfig;
  leadCapture?: LeadCaptureClientConfig;
  voice?: PublicVoiceConfig;
}

interface FetchConfigResult {
  status: number; // HTTP status, or 0 for a network error
  data: PublicPageResponse | null;
}

async function fetchConfig(projectId: string): Promise<FetchConfigResult> {
  try {
    // Cache the config for 60s (stale-while-revalidate). This keeps the page available even if
    // someone hammers the per-project rate limit on /api/public/page: once a good response is
    // cached, legit renders are served from cache and a failed background revalidation keeps the
    // last good value rather than taking the page down. Request memoization also collapses the
    // generateMetadata + render calls into one fetch.
    const res = await fetch(`${API_URL}/api/public/page/${projectId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { status: res.status, data: null };
    return { status: 200, data: (await res.json()) as PublicPageResponse };
  } catch {
    return { status: 0, data: null };
  }
}

/** Transient error state (rate limited / upstream error) — distinct from a 404. */
function TemporarilyUnavailable() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        fontFamily: "system-ui, sans-serif",
        color: "#334155",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        This page is temporarily unavailable
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
        We&apos;re experiencing high traffic. Please refresh in a moment.
      </p>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const { uuid } = parseHandle(handle);
  if (!uuid) return { title: "Not found" };
  const { data } = await fetchConfig(uuid);
  if (!data) return { title: "Not found" };

  const title = data.config.pageTitle || `${data.config.businessName} — Help`;
  const canonicalPath = `/c/${data.slug ? `${data.slug}-` : ""}${uuid}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://frontface.app";

  return {
    title,
    description: data.config.subtext,
    metadataBase: new URL(appUrl),
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description: data.config.subtext,
      url: canonicalPath,
      siteName: data.config.businessName,
      type: "website",
      ...(data.config.logoUrl
        ? { images: [{ url: data.config.logoUrl }] }
        : {}),
    },
  };
}

export default async function PublicPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { handle } = await params;
  const { preview } = await searchParams;
  const { uuid, slug } = parseHandle(handle);

  // Preview mode (editor live preview): render chrome only; the draft config is delivered
  // via postMessage from the dashboard. No DB lookup, so a never-saved page never 404s.
  if (preview === "1") {
    return (
      <PublicChat
        projectId={uuid || ""}
        initialConfig={null}
        leadCapture={null}
        voice={null}
        previewMode
      />
    );
  }

  if (!uuid) notFound();

  const { status, data } = await fetchConfig(uuid);
  if (!data) {
    // Only a real 404 (missing/disabled page) is "not found". A 429 (rate limited) or 5xx/network
    // error is transient — render a retryable notice instead of a permanent 404 so a targeted
    // burst against one project can't make its page disappear from search/users.
    if (status === 404) notFound();
    return <TemporarilyUnavailable />;
  }

  // Canonical redirect when the cosmetic slug prefix is stale or wrong.
  if ((slug || "") !== (data.slug || "")) {
    permanentRedirect(`/c/${data.slug ? `${data.slug}-` : ""}${uuid}`);
  }

  return (
    <PublicChat
      projectId={uuid}
      initialConfig={data.config}
      leadCapture={data.leadCapture ?? null}
      voice={data.voice ?? null}
      previewMode={false}
    />
  );
}
