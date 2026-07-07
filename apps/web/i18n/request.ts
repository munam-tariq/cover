import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

// Namespace files merged into one messages object. Extend NAMESPACES when
// adding a namespace file under messages/{locale}/.
const NAMESPACES = ["common", "marketing", "auth", "onboarding", "legal", "dashboard"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        return [ns, (await import(`../messages/${locale}/${ns}.json`)).default] as const;
      } catch {
        return [ns, {}] as const; // namespace not created yet
      }
    })
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
    // Missing key → render the dotted key path, never a crash. The parity
    // test makes missing ar keys impossible at CI time; this is a dev net.
    getMessageFallback: ({ key, namespace }) =>
      [namespace, key].filter(Boolean).join("."),
  };
});
