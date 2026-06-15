/**
 * Widget appearance config — pure, self-contained (no relative imports) so it is unit-testable
 * under Node's test runner. Parses/normalizes the display + appearance config the widget receives
 * from the embed `/config` endpoint (Part B — widget customization).
 */

// Local, dependency-free type guards (kept here to avoid a relative import).
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isString);

export interface WidgetNotice {
  enabled: boolean;
  text: string;
}

export interface WidgetFooter {
  text: string;
  url?: string;
}

export interface WidgetDisplayConfig {
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
  greeting?: string;
  greetingIntro?: string;
  title?: string;
  // Appearance (Part B — widget customization)
  theme?: "light" | "dark" | "auto";
  avatarUrl?: string;
  launcherIconUrl?: string;
  bubbleColor?: string;
  usePrimaryForHeader?: boolean;
  hideBranding?: boolean;
  placeholder?: string;
  starters?: string[];
  notice?: WidgetNotice;
  footer?: WidgetFooter;
  feedbackEnabled?: boolean;
  copyEnabled?: boolean;
  localeDefault?: string;
}

/** Fully-resolved appearance the widget runtime can rely on (no optionals). */
export interface ResolvedWidgetAppearance {
  theme: "light" | "dark" | "auto";
  position: "bottom-right" | "bottom-left";
  placeholder: string;
  avatarUrl: string | null;
  launcherIconUrl: string | null;
  bubbleColor: string | null;
  usePrimaryForHeader: boolean;
  hideBranding: boolean;
  feedbackEnabled: boolean;
  copyEnabled: boolean;
  starters: string[];
  notice: WidgetNotice;
  footer: WidgetFooter | null;
  localeDefault: string;
}

export interface WidgetStrings {
  locale: string;
  defaultPlaceholder: string;
  sendMessage: string;
  copyMessage: string;
  copied: string;
  dismissNotice: string;
  poweredBy: string;
}

const WIDGET_STRINGS: Record<string, Omit<WidgetStrings, "locale">> = {
  en: {
    defaultPlaceholder: "Type a message...",
    sendMessage: "Send message",
    copyMessage: "Copy message",
    copied: "Copied",
    dismissNotice: "Dismiss notice",
    poweredBy: "Powered by FrontFace",
  },
  es: {
    defaultPlaceholder: "Escribe un mensaje...",
    sendMessage: "Enviar mensaje",
    copyMessage: "Copiar mensaje",
    copied: "Copiado",
    dismissNotice: "Cerrar aviso",
    poweredBy: "Con tecnología de FrontFace",
  },
  fr: {
    defaultPlaceholder: "Écrivez un message...",
    sendMessage: "Envoyer le message",
    copyMessage: "Copier le message",
    copied: "Copié",
    dismissNotice: "Fermer l’avis",
    poweredBy: "Propulsé par FrontFace",
  },
  de: {
    defaultPlaceholder: "Nachricht eingeben...",
    sendMessage: "Nachricht senden",
    copyMessage: "Nachricht kopieren",
    copied: "Kopiert",
    dismissNotice: "Hinweis schließen",
    poweredBy: "Bereitgestellt von FrontFace",
  },
};

/** Parse the `config` object from the embed endpoint, keeping only well-typed fields. */
export function parseDisplayConfig(
  value: unknown
): WidgetDisplayConfig | undefined {
  if (!isRecord(value)) return undefined;

  const config: WidgetDisplayConfig = {};
  if (isString(value.primaryColor)) config.primaryColor = value.primaryColor;
  if (value.position === "bottom-right" || value.position === "bottom-left") {
    config.position = value.position;
  }
  if (isString(value.greeting)) config.greeting = value.greeting;
  if (isString(value.greetingIntro)) config.greetingIntro = value.greetingIntro;
  if (isString(value.title)) config.title = value.title;

  // Appearance fields (Part B)
  if (value.theme === "light" || value.theme === "dark" || value.theme === "auto") {
    config.theme = value.theme;
  }
  if (isString(value.avatarUrl)) config.avatarUrl = value.avatarUrl;
  if (isString(value.launcherIconUrl)) config.launcherIconUrl = value.launcherIconUrl;
  if (isString(value.bubbleColor)) config.bubbleColor = value.bubbleColor;
  if (isBoolean(value.usePrimaryForHeader)) {
    config.usePrimaryForHeader = value.usePrimaryForHeader;
  }
  if (isBoolean(value.hideBranding)) config.hideBranding = value.hideBranding;
  if (isString(value.placeholder)) config.placeholder = value.placeholder;
  if (isStringArray(value.starters)) config.starters = value.starters;
  if (
    isRecord(value.notice) &&
    isBoolean(value.notice.enabled) &&
    isString(value.notice.text)
  ) {
    config.notice = { enabled: value.notice.enabled, text: value.notice.text };
  }
  if (isRecord(value.footer) && isString(value.footer.text)) {
    config.footer = {
      text: value.footer.text,
      ...(isString(value.footer.url) ? { url: value.footer.url } : {}),
    };
  }
  if (isBoolean(value.feedbackEnabled)) config.feedbackEnabled = value.feedbackEnabled;
  if (isBoolean(value.copyEnabled)) config.copyEnabled = value.copyEnabled;
  if (isString(value.localeDefault)) config.localeDefault = value.localeDefault;

  return config;
}

/** Default appearance values. Kept in sync (by value) with the API's embed config fail-open. */
export function resolveWidgetAppearanceDefaults(
  config?: WidgetDisplayConfig
): ResolvedWidgetAppearance {
  return {
    theme: config?.theme ?? "light",
    position: config?.position ?? "bottom-right",
    placeholder: config?.placeholder ?? "Type a message...",
    avatarUrl: config?.avatarUrl ?? null,
    launcherIconUrl: config?.launcherIconUrl ?? null,
    bubbleColor: config?.bubbleColor ?? null,
    usePrimaryForHeader: config?.usePrimaryForHeader ?? true,
    hideBranding: config?.hideBranding ?? false,
    feedbackEnabled: config?.feedbackEnabled ?? false,
    copyEnabled: config?.copyEnabled ?? true,
    starters: config?.starters ?? [],
    notice: config?.notice ?? { enabled: false, text: "" },
    footer: config?.footer ?? null,
    localeDefault: config?.localeDefault ?? "en",
  };
}

/**
 * Pick the best available locale for the visitor: the first navigator language (in order)
 * whose primary subtag is in `available`, else `fallback`. Returns the matching `available`
 * entry (preserving its casing).
 */
export function pickLocale(
  navigatorLanguages: string[],
  available: string[],
  fallback: string
): string {
  const byPrimary = new Map<string, string>();
  for (const a of available) byPrimary.set(a.toLowerCase().split("-")[0], a);

  for (const lang of navigatorLanguages) {
    const primary = lang.toLowerCase().split("-")[0];
    const match = byPrimary.get(primary);
    if (match) return match;
  }
  return fallback;
}

export function getWidgetStrings(
  navigatorLanguages: string[],
  localeDefault: string
): WidgetStrings {
  const available = Object.keys(WIDGET_STRINGS);
  const normalizedFallback = available.includes(localeDefault.toLowerCase())
    ? localeDefault.toLowerCase()
    : "en";
  const locale = pickLocale(navigatorLanguages, available, normalizedFallback);

  return {
    locale,
    ...WIDGET_STRINGS[locale],
  };
}

/**
 * Merge endpoint config (the persisted source of truth) with embed-code `data-*` overrides.
 * Defined data attributes win; `undefined` ones are ignored so they don't clobber config.
 */
export function mergeConfigWithDataAttributes(
  config: WidgetDisplayConfig,
  dataAttrs: Partial<WidgetDisplayConfig>
): WidgetDisplayConfig {
  const merged: WidgetDisplayConfig = { ...config };
  for (const [key, val] of Object.entries(dataAttrs)) {
    if (val !== undefined) {
      (merged as Record<string, unknown>)[key] = val;
    }
  }
  return merged;
}
