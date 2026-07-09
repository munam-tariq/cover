/**
 * Language & dialect resolution for AI responses and channel greetings.
 *
 * A project sets one knob — `settings.language.default` (BCP-47, e.g. "ar-SA").
 * From it we derive:
 *  - the greeting language (project default wins, even from an English browser),
 *  - the dialect guidance injected into the system prompt,
 *  - and, once a conversation starts, a language pinned from what the visitor writes.
 *
 * All functions here are pure — no I/O — so they're cheap to unit-test and safe to
 * call on the hot path.
 */

export interface ResolvedLanguage {
  /** BCP-47 tag actually used, e.g. "ar-SA" or "en". */
  bcp47: string;
  /** Primary subtag, e.g. "ar" or "en". */
  base: string;
  /** Human dialect label for the prompt, e.g. "Saudi (Najdi / Gulf)". Undefined when there's no special dialect guidance. */
  dialectLabel?: string;
  /** True when the base language is written right-to-left. */
  rtl: boolean;
}

const DEFAULT_LANGUAGE = "en";

/** Region subtag → Arabic dialect label used in the system-prompt directive. */
const ARABIC_DIALECTS: Record<string, string> = {
  SA: "Saudi (Najdi / Gulf)",
  AE: "Emirati (Gulf)",
  KW: "Kuwaiti (Gulf)",
  QA: "Qatari (Gulf)",
  BH: "Bahraini (Gulf)",
  OM: "Omani",
  EG: "Egyptian",
  JO: "Jordanian (Levantine)",
  LB: "Lebanese (Levantine)",
  SY: "Syrian (Levantine)",
  MA: "Moroccan (Darija)",
};

/** Human-readable language name for the directive. */
const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
};

/** Base languages written right-to-left. */
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export function isRtl(base: string): boolean {
  return RTL_LANGUAGES.has(base);
}

/** Split a BCP-47 tag into its lowercase base and uppercase region subtags. */
export function parseLanguageTag(tag: string): { base: string; region?: string } {
  const cleaned = (tag || "").trim().replace("_", "-");
  if (!cleaned) return { base: DEFAULT_LANGUAGE };
  const [basePart, regionPart] = cleaned.split("-");
  return {
    base: (basePart || DEFAULT_LANGUAGE).toLowerCase(),
    region: regionPart ? regionPart.toUpperCase() : undefined,
  };
}

/** Turn a BCP-47 tag into a fully-resolved language (base, dialect label, direction). */
export function toResolvedLanguage(tag: string): ResolvedLanguage {
  const { base, region } = parseLanguageTag(tag || DEFAULT_LANGUAGE);
  const bcp47 = region ? `${base}-${region}` : base;
  const dialectLabel =
    base === "ar" && region ? ARABIC_DIALECTS[region] : undefined;
  return { bcp47, base, dialectLabel, rtl: isRtl(base) };
}

/**
 * Detect the base language of a piece of user text.
 *
 * A script-based heuristic — reliable and free for the Arabic/English split we
 * support. Returns null when undecidable (e.g. only digits/emoji/punctuation),
 * so callers fall back to the project default.
 */
const ARABIC_SCRIPT = /\p{Script=Arabic}/u;
const LATIN_LETTER = /[A-Za-z]/;

export function detectBaseLanguage(text: string | null | undefined): string | null {
  if (!text) return null;
  if (ARABIC_SCRIPT.test(text)) return "ar";
  if (LATIN_LETTER.test(text)) return "en";
  return null;
}

const ARABIC_SCRIPT_GLOBAL = /\p{Script=Arabic}/gu;
const LATIN_LETTER_GLOBAL = /[A-Za-z]/g;

/**
 * Detect the dominant base language of a larger body of text (e.g. a knowledge
 * base sample) by comparing Arabic-script vs Latin letter counts. Returns null
 * when there aren't enough letters to decide.
 */
export function detectDominantLanguage(
  text: string | null | undefined
): string | null {
  if (!text) return null;
  const arabic = (text.match(ARABIC_SCRIPT_GLOBAL) || []).length;
  const latin = (text.match(LATIN_LETTER_GLOBAL) || []).length;
  if (arabic + latin < 10) return null;
  return arabic > latin ? "ar" : "en";
}

/**
 * Read a project's default language tag from its `settings` JSONB, with
 * back-compat for the widget-only `widget_appearance.locale_default`.
 */
export function projectLanguageDefault(
  settings: Record<string, unknown> | null | undefined
): string | null {
  const s = settings || {};
  const fromLanguage = (s.language as { default?: string } | undefined)?.default;
  const fromWidget = (
    s.widget_appearance as { locale_default?: string } | undefined
  )?.locale_default;
  return fromLanguage || fromWidget || null;
}

/**
 * Greeting language: the project default wins (a Saudi client greets in Arabic
 * even when the visitor's browser is English). Falls back to English when unset.
 */
export function resolveGreetingLanguage(
  projectDefault?: string | null
): ResolvedLanguage {
  return toResolvedLanguage(projectDefault?.trim() || DEFAULT_LANGUAGE);
}

/**
 * Conversation language, resolved once and then reused every turn:
 *  1. a stored conversation language wins (keeps the whole thread consistent),
 *  2. else the language the visitor actually wrote (detected from the message),
 *  3. else the project default,
 *  4. else English.
 *
 * When detection matches the project default's base language, we attach the
 * default's region so an Arabic message on an `ar-SA` project still gets the
 * Saudi dialect.
 */
export function resolveConversationLanguage(opts: {
  storedLang?: string | null;
  messageText?: string | null;
  projectDefault?: string | null;
}): ResolvedLanguage {
  const { storedLang, messageText, projectDefault } = opts;

  if (storedLang?.trim()) return toResolvedLanguage(storedLang.trim());

  const detected = detectBaseLanguage(messageText);
  if (detected) {
    const def = parseLanguageTag(projectDefault?.trim() || DEFAULT_LANGUAGE);
    const region = detected === def.base ? def.region : undefined;
    return toResolvedLanguage(region ? `${detected}-${region}` : detected);
  }

  return toResolvedLanguage(projectDefault?.trim() || DEFAULT_LANGUAGE);
}

/**
 * The directive injected into the system prompt (`{language_directive}`) telling
 * the model which language + dialect to answer in, and how sticky to be.
 */
export function buildLanguageDirective(resolved: ResolvedLanguage): string {
  const langName = LANGUAGE_NAMES[resolved.base] || resolved.bcp47;
  const dialectClause =
    resolved.base === "ar" && resolved.dialectLabel
      ? ` Use the ${resolved.dialectLabel} dialect — natural, warm, and respectful; reserve Modern Standard Arabic for formal or technical terms that have no natural dialect equivalent.`
      : "";
  return (
    `Reply in ${langName} on every turn.${dialectClause} ` +
    `Keep the entire conversation in ${langName}. Only switch languages if the user writes a full, clear message in a different language — then continue in that new language.`
  );
}
