export function localizedHref(requestedLocale: string, pathname: `/${string}` | "/"): string {
  const locale = requestedLocale === "en" ? "en" : "sl";
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}
