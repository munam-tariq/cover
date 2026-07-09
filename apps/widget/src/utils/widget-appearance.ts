/**
 * Widget appearance config — parses/normalizes the display + appearance config the widget receives
 * from the embed `/config` endpoint (Part B — widget customization). Its only import is the
 * dependency-free shared UI-strings module, so it stays unit-testable under Node's test runner.
 */

import { getUIStrings, isRtlLocale, type UIStrings } from "@chatbot/shared/i18n";

// Local, dependency-free type guards (kept here to avoid a relative import).
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isString);

export type ChannelButtonType =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "email"
  | "phone"
  | "custom";

const CHANNEL_BUTTON_TYPES: string[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "email",
  "phone",
  "custom",
];

export interface ChannelButton {
  type: ChannelButtonType;
  url: string;
  label?: string;
  iconUrl?: string;
}

const ALLOWED_CHANNEL_SCHEMES = ["https:", "http:", "mailto:", "tel:"];
const ALLOWED_ICON_SCHEMES = ["https:", "http:"];

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_CHANNEL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isAllowedIconUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_ICON_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function parseChannelButtons(value: unknown): ChannelButton[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const buttons: ChannelButton[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isString(item.type) ||
      !CHANNEL_BUTTON_TYPES.includes(item.type) ||
      !isString(item.url) ||
      !isAllowedUrl(item.url)
    ) continue;
    const btn: ChannelButton = { type: item.type as ChannelButtonType, url: item.url };
    if (isString(item.label)) btn.label = item.label;
    if (isString(item.iconUrl) && isAllowedIconUrl(item.iconUrl)) btn.iconUrl = item.iconUrl;
    buttons.push(btn);
  }
  return buttons.length > 0 ? buttons : undefined;
}

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
  channels?: ChannelButton[];
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
  channels: ChannelButton[];
}

export interface WidgetStrings extends UIStrings {
  locale: string;
  rtl: boolean;
}

/** Original six keys the widget localized before the shared en/ar table existed. */
type LegacyStringKey =
  | "defaultPlaceholder"
  | "sendMessage"
  | "copyMessage"
  | "copied"
  | "dismissNotice"
  | "poweredBy";

/**
 * Legacy micro-locale overlays. Full localization is en/ar (via @chatbot/shared);
 * es/fr/de retain their original handful of control labels layered over English.
 */
const LEGACY_WIDGET_STRINGS: Record<string, Pick<UIStrings, LegacyStringKey>> = {
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

/** Locales the widget can present (full: en/ar; legacy micro: es/fr/de). */
const WIDGET_LOCALES = ["en", "ar", "es", "fr", "de"];

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
  const channels = parseChannelButtons(value.channels);
  if (channels) config.channels = channels;

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
    channels: config?.channels ?? [],
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

/**
 * Choose the widget UI locale. An explicit non-English project default wins —
 * so a Saudi (ar-SA) project shows Arabic chrome to match the AI's language —
 * otherwise fall back to browser-language detection (preserving auto-detect for
 * es/fr/de and English projects).
 */
function resolveWidgetLocale(
  navigatorLanguages: string[],
  localeDefault: string
): string {
  const base = (localeDefault || "en").toLowerCase().split("-")[0];
  if (base !== "en" && WIDGET_LOCALES.includes(base)) return base;
  const fallback = WIDGET_LOCALES.includes(base) ? base : "en";
  return pickLocale(navigatorLanguages, WIDGET_LOCALES, fallback);
}

export function getWidgetStrings(
  navigatorLanguages: string[],
  localeDefault: string
): WidgetStrings {
  const locale = resolveWidgetLocale(navigatorLanguages, localeDefault);
  const base = getUIStrings(locale); // full en/ar; unknown locales → English
  const legacy = LEGACY_WIDGET_STRINGS[locale];

  return {
    ...base,
    ...(legacy ?? {}),
    locale,
    rtl: isRtlLocale(locale),
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
