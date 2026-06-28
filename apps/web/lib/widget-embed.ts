const DEFAULT_API_URL = "https://api.frontface.app";
const DEFAULT_WIDGET_SCRIPT_URL =
  "https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js";
const DEFAULT_DEV_PREVIEW_SCRIPT_URL = "http://localhost:7001/dist/widget.js";

export interface WidgetEmbedCodeOptions {
  projectId: string;
  apiUrl: string;
  scriptUrl: string;
  /** Optional publishable client key (pk_…). Lets embeds authenticate via X-FrontFace-Key. */
  clientKey?: string | null;
}

interface WidgetPreviewScriptOptions {
  nodeEnv: string | undefined;
  deployedScriptUrl: string;
  configuredPreviewUrl?: string;
}

export function resolveWidgetScriptUrl(configuredUrl: string | undefined): string {
  const value = configuredUrl?.trim().replace(/\/+$/, "");
  if (!value) return DEFAULT_WIDGET_SCRIPT_URL;
  return value.endsWith(".js") ? value : `${value}/widget.js`;
}

export function resolveWidgetPreviewScriptUrl({
  nodeEnv,
  deployedScriptUrl,
  configuredPreviewUrl,
}: WidgetPreviewScriptOptions): string {
  const previewUrl = configuredPreviewUrl?.trim();
  if (previewUrl) return previewUrl;
  return nodeEnv === "development"
    ? DEFAULT_DEV_PREVIEW_SCRIPT_URL
    : deployedScriptUrl;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function buildWidgetEmbedCode({
  projectId,
  apiUrl,
  scriptUrl,
  clientKey,
}: WidgetEmbedCodeOptions): string {
  const clientKeyLine = clientKey
    ? `\n  data-client-key="${escapeAttribute(clientKey)}"`
    : "";
  return `<script
  src="${escapeAttribute(scriptUrl)}"
  data-project-id="${escapeAttribute(projectId)}"
  data-api-url="${escapeAttribute(apiUrl)}"${clientKeyLine}
  async>
</script>`;
}

export const WIDGET_API_URL =
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
export const WIDGET_SCRIPT_URL = resolveWidgetScriptUrl(
  process.env.NEXT_PUBLIC_WIDGET_URL
);
export const WIDGET_PREVIEW_SCRIPT_URL = resolveWidgetPreviewScriptUrl({
  nodeEnv: process.env.NODE_ENV,
  deployedScriptUrl: WIDGET_SCRIPT_URL,
  configuredPreviewUrl: process.env.NEXT_PUBLIC_WIDGET_PREVIEW_URL,
});
