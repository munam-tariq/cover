export const EN_ONLY_PREFIXES = ["/blog", "/vs", "/use-cases"] as const;

export function isEnglishOnlyPath(pathname: string): boolean {
  return EN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function stripArabicPrefixForEnglishOnly(pathname: string): string | null {
  if (!(pathname === "/ar" || pathname.startsWith("/ar/"))) {
    return null;
  }

  const stripped = pathname.slice(3) || "/";
  return isEnglishOnlyPath(stripped) ? stripped : null;
}

export function defaultLocaleRewritePath(pathname: string): string {
  return `/en${pathname === "/" ? "" : pathname}`;
}
