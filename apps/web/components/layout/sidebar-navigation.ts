export function getSelectedPathname(
  pathname: string,
  pendingHref: string | null
) {
  return pendingHref ?? pathname;
}

export function isSidebarItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
