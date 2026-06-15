const DEFAULT_WIDGET_BASE_URL =
  "https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets";

interface ResolveWidgetAppUrlOptions {
  loaderSrc: string;
  version: string;
  cacheBuster?: number;
  productionBaseUrl?: string;
}

export function resolveWidgetAppUrl({
  loaderSrc,
  version,
  cacheBuster = Date.now(),
  productionBaseUrl = DEFAULT_WIDGET_BASE_URL,
}: ResolveWidgetAppUrlOptions): string {
  const loaderUrl = new URL(loaderSrc);
  const isLocal =
    loaderUrl.hostname === "localhost" ||
    loaderUrl.hostname === "127.0.0.1" ||
    loaderUrl.protocol === "file:";

  if (isLocal) {
    const widgetAppUrl = new URL("widget-app.js", loaderUrl);
    widgetAppUrl.searchParams.set("v", String(cacheBuster));
    return widgetAppUrl.toString();
  }

  return `${productionBaseUrl}/widget-app.js?v=${version}`;
}
