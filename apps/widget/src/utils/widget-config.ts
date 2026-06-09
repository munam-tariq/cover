import type { LeadCaptureFormConfig } from "../components/lead-capture-form";

import type {
  ProactiveEngagementConfig,
  TriggerActionType,
} from "./engagement-triggers";
import {
  isBoolean,
  isNumber,
  isRecord,
  isString,
  isStringArray,
} from "./type-guards";

export interface WidgetRealtimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface VoiceConfig {
  enabled: boolean;
}

export interface LeadCaptureConfig {
  enabled: true;
  formFields: LeadCaptureFormConfig["formFields"];
  hasQualifyingQuestions: boolean;
  capture_mode: "email_after" | "email_first" | "email_required";
  conversational_reask: {
    enabled: boolean;
    max_reasks_per_session?: number;
    messages_between_reasks?: number;
  };
}

export interface LeadRecoveryConfig {
  enabled: true;
  exit_intent_overlay?: {
    enabled: boolean;
    headline: string;
    subtext: string;
  };
  deferred_skip?: {
    enabled: boolean;
    reask_after_messages: number;
    max_deferred_asks: number;
  };
  return_visit?: {
    enabled: boolean;
    max_visits_before_stop: number;
    welcome_back_message: string;
  };
  high_intent_override?: {
    enabled: boolean;
    keywords: string[];
    override_cooldowns: boolean;
  };
  conversation_summary_hook?: {
    enabled: boolean;
    min_messages: number;
    prompt: string;
  };
}

interface WidgetDisplayConfig {
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
  greeting?: string;
  greetingIntro?: string;
  title?: string;
}

export interface WidgetEmbedConfig {
  enabled: boolean;
  config?: WidgetDisplayConfig;
  realtime?: WidgetRealtimeConfig;
  leadCapture?: LeadCaptureConfig;
  proactiveEngagement?: ProactiveEngagementConfig;
  leadRecovery?: LeadRecoveryConfig;
  voice?: VoiceConfig;
}

declare global {
  interface Window {
    __WIDGET_CONFIG__?: WidgetRealtimeConfig;
  }
}

function isTriggerActionType(value: unknown): value is TriggerActionType {
  return (
    value === "teaser" ||
    value === "badge" ||
    value === "auto_open" ||
    value === "overlay"
  );
}

function parseDisplayConfig(value: unknown): WidgetDisplayConfig | undefined {
  if (!isRecord(value)) return undefined;

  const config: WidgetDisplayConfig = {};
  if (isString(value.primaryColor)) config.primaryColor = value.primaryColor;
  if (value.position === "bottom-right" || value.position === "bottom-left") {
    config.position = value.position;
  }
  if (isString(value.greeting)) config.greeting = value.greeting;
  if (isString(value.greetingIntro)) config.greetingIntro = value.greetingIntro;
  if (isString(value.title)) config.title = value.title;

  return config;
}

function parseRealtimeConfig(value: unknown): WidgetRealtimeConfig | undefined {
  if (
    !isRecord(value) ||
    !isString(value.supabaseUrl) ||
    !value.supabaseUrl ||
    !isString(value.supabaseAnonKey) ||
    !value.supabaseAnonKey
  ) {
    return undefined;
  }

  return {
    supabaseUrl: value.supabaseUrl,
    supabaseAnonKey: value.supabaseAnonKey,
  };
}

function parseFormField(
  value: unknown
): LeadCaptureFormConfig["formFields"]["field_2"] | undefined {
  if (
    !isRecord(value) ||
    !isBoolean(value.enabled) ||
    !isString(value.label) ||
    !isBoolean(value.required)
  ) {
    return undefined;
  }

  return {
    enabled: value.enabled,
    label: value.label,
    required: value.required,
  };
}

function parseLeadCaptureConfig(value: unknown): LeadCaptureConfig | undefined {
  if (!isRecord(value) || value.enabled !== true || !isRecord(value.formFields)) {
    return undefined;
  }

  const email = value.formFields.email;
  if (!isRecord(email) || email.required !== true) return undefined;

  const formFields: LeadCaptureFormConfig["formFields"] = {
    email: { required: true },
  };
  const field2 = parseFormField(value.formFields.field_2);
  const field3 = parseFormField(value.formFields.field_3);
  if (field2) formFields.field_2 = field2;
  if (field3) formFields.field_3 = field3;

  const captureMode =
    value.capture_mode === "email_first" ||
    value.capture_mode === "email_required"
      ? value.capture_mode
      : "email_after";

  const conversationalReask = isRecord(value.conversational_reask)
    ? value.conversational_reask
    : {};

  return {
    enabled: true,
    formFields,
    hasQualifyingQuestions: value.hasQualifyingQuestions === true,
    capture_mode: captureMode,
    conversational_reask: {
      enabled: conversationalReask.enabled === true,
      ...(isNumber(conversationalReask.max_reasks_per_session)
        ? { max_reasks_per_session: conversationalReask.max_reasks_per_session }
        : {}),
      ...(isNumber(conversationalReask.messages_between_reasks)
        ? { messages_between_reasks: conversationalReask.messages_between_reasks }
        : {}),
    },
  };
}

function parseProactiveEngagementConfig(
  value: unknown
): ProactiveEngagementConfig | undefined {
  if (!isRecord(value) || value.enabled !== true) return undefined;

  const teaser = value.teaser;
  const badge = value.badge;
  const triggers = value.triggers;
  if (!isRecord(teaser) || !isRecord(badge) || !isRecord(triggers)) {
    return undefined;
  }

  const timeOnPage = triggers.time_on_page;
  const scrollDepth = triggers.scroll_depth;
  const exitIntent = triggers.exit_intent;
  const highIntentUrls = triggers.high_intent_urls;

  if (
    !isBoolean(teaser.enabled) ||
    !isString(teaser.message) ||
    !isNumber(teaser.delay_seconds) ||
    !isBoolean(teaser.show_once_per_session) ||
    !isBoolean(badge.enabled) ||
    !isBoolean(badge.show_until_opened) ||
    !isRecord(timeOnPage) ||
    !isBoolean(timeOnPage.enabled) ||
    !isNumber(timeOnPage.delay_seconds) ||
    !isTriggerActionType(timeOnPage.action) ||
    !isRecord(scrollDepth) ||
    !isBoolean(scrollDepth.enabled) ||
    !isNumber(scrollDepth.threshold_percent) ||
    !isTriggerActionType(scrollDepth.action) ||
    !isRecord(exitIntent) ||
    !isBoolean(exitIntent.enabled) ||
    !isTriggerActionType(exitIntent.action) ||
    !isString(exitIntent.message) ||
    !isRecord(highIntentUrls) ||
    !isBoolean(highIntentUrls.enabled) ||
    !isStringArray(highIntentUrls.patterns) ||
    !isTriggerActionType(highIntentUrls.action)
  ) {
    return undefined;
  }

  return {
    enabled: true,
    teaser: {
      enabled: teaser.enabled,
      message: teaser.message,
      delay_seconds: teaser.delay_seconds,
      show_once_per_session: teaser.show_once_per_session,
    },
    badge: {
      enabled: badge.enabled,
      show_until_opened: badge.show_until_opened,
    },
    triggers: {
      time_on_page: {
        enabled: timeOnPage.enabled,
        delay_seconds: timeOnPage.delay_seconds,
        action: timeOnPage.action,
      },
      scroll_depth: {
        enabled: scrollDepth.enabled,
        threshold_percent: scrollDepth.threshold_percent,
        action: scrollDepth.action,
      },
      exit_intent: {
        enabled: exitIntent.enabled,
        action: exitIntent.action,
        message: exitIntent.message,
      },
      high_intent_urls: {
        enabled: highIntentUrls.enabled,
        patterns: highIntentUrls.patterns,
        action: highIntentUrls.action,
      },
    },
  };
}

function parseLeadRecoveryConfig(value: unknown): LeadRecoveryConfig | undefined {
  if (!isRecord(value) || value.enabled !== true) return undefined;

  const config: LeadRecoveryConfig = { enabled: true };
  const exitOverlay = value.exit_intent_overlay;
  if (
    isRecord(exitOverlay) &&
    isBoolean(exitOverlay.enabled) &&
    isString(exitOverlay.headline) &&
    isString(exitOverlay.subtext)
  ) {
    config.exit_intent_overlay = {
      enabled: exitOverlay.enabled,
      headline: exitOverlay.headline,
      subtext: exitOverlay.subtext,
    };
  }

  const deferredSkip = value.deferred_skip;
  if (
    isRecord(deferredSkip) &&
    isBoolean(deferredSkip.enabled) &&
    isNumber(deferredSkip.reask_after_messages) &&
    isNumber(deferredSkip.max_deferred_asks)
  ) {
    config.deferred_skip = {
      enabled: deferredSkip.enabled,
      reask_after_messages: deferredSkip.reask_after_messages,
      max_deferred_asks: deferredSkip.max_deferred_asks,
    };
  }

  const returnVisit = value.return_visit;
  if (
    isRecord(returnVisit) &&
    isBoolean(returnVisit.enabled) &&
    isNumber(returnVisit.max_visits_before_stop) &&
    isString(returnVisit.welcome_back_message)
  ) {
    config.return_visit = {
      enabled: returnVisit.enabled,
      max_visits_before_stop: returnVisit.max_visits_before_stop,
      welcome_back_message: returnVisit.welcome_back_message,
    };
  }

  const highIntentOverride = value.high_intent_override;
  if (
    isRecord(highIntentOverride) &&
    isBoolean(highIntentOverride.enabled) &&
    isStringArray(highIntentOverride.keywords) &&
    isBoolean(highIntentOverride.override_cooldowns)
  ) {
    config.high_intent_override = {
      enabled: highIntentOverride.enabled,
      keywords: highIntentOverride.keywords,
      override_cooldowns: highIntentOverride.override_cooldowns,
    };
  }

  const summaryHook = value.conversation_summary_hook;
  if (
    isRecord(summaryHook) &&
    isBoolean(summaryHook.enabled) &&
    isNumber(summaryHook.min_messages) &&
    isString(summaryHook.prompt)
  ) {
    config.conversation_summary_hook = {
      enabled: summaryHook.enabled,
      min_messages: summaryHook.min_messages,
      prompt: summaryHook.prompt,
    };
  }

  return config;
}

export function parseWidgetEmbedConfig(value: unknown): WidgetEmbedConfig | null {
  if (!isRecord(value)) return null;

  const config: WidgetEmbedConfig = {
    enabled: value.enabled !== false,
  };

  const displayConfig = parseDisplayConfig(value.config);
  const realtime = parseRealtimeConfig(value.realtime);
  const leadCapture = parseLeadCaptureConfig(value.leadCapture);
  const proactiveEngagement = parseProactiveEngagementConfig(
    value.proactiveEngagement
  );
  const leadRecovery = parseLeadRecoveryConfig(value.leadRecovery);

  if (displayConfig) config.config = displayConfig;
  if (realtime) config.realtime = realtime;
  if (leadCapture) config.leadCapture = leadCapture;
  if (proactiveEngagement) config.proactiveEngagement = proactiveEngagement;
  if (leadRecovery) config.leadRecovery = leadRecovery;
  if (isRecord(value.voice) && isBoolean(value.voice.enabled)) {
    config.voice = { enabled: value.voice.enabled };
  }

  return config;
}
