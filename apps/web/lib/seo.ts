import type { Locale } from "@/i18n/routing";

const BASE_URL = "https://frontface.app";

/**
 * hreflang alternates for a translated route. `path` is the unprefixed
 * route ("/" or "/features"). EN lives unprefixed, AR under /ar,
 * x-default follows EN.
 */
export function localizedAlternates(path: string) {
  const suffix = path === "/" ? "" : path;
  const enUrl = `${BASE_URL}${suffix}`;
  const arUrl = `${BASE_URL}/ar${suffix}`;
  return {
    canonical: enUrl,
    languages: {
      en: enUrl,
      ar: arUrl,
      "x-default": enUrl,
    },
  };
}

export function ogLocale(locale: Locale): string {
  return locale === "ar" ? "ar_SA" : "en_US";
}
