import type { Metadata } from "next";

export function localizedAlternates(
  requestedLocale: string,
  pathname: "" | `/${string}`,
): NonNullable<Metadata["alternates"]> {
  const locale = requestedLocale === "en" ? "en" : "sl";
  return {
    canonical: `/${locale}${pathname}`,
    languages: {
      sl: `/sl${pathname}`,
      en: `/en${pathname}`,
    },
  };
}
