import { getTranslations } from "next-intl/server";

import { localizedHref } from "@/lib/locale-path";

import { LanguagesIcon, ShieldCheckIcon } from "./public-icons";

export async function SiteHeader({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const t = await getTranslations("nav");
  const alternateLocale = locale === "sl" ? "en" : "sl";

  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="container flex min-h-18 flex-wrap items-center justify-between gap-4 py-3">
        <a
          href={localizedHref(locale, "/")}
          className="flex items-center gap-2 font-extrabold text-[#0b1f33]"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-[#0f766e] text-white">
            <ShieldCheckIcon size={21} strokeWidth={2.2} />
          </span>
          <span>Optimalen Nakup</span>
        </a>
        <nav
          aria-label="Primary"
          className="order-3 flex w-full items-center gap-6 border-t border-slate-100 pt-3 text-sm font-semibold md:order-none md:w-auto md:border-0 md:pt-0"
        >
          <a
            href={localizedHref(locale, "/how-it-works")}
            className="text-slate-700 hover:text-[#0f766e]"
          >
            {t("howItWorks")}
          </a>
          <a
            href={localizedHref(locale, "/pricing")}
            className="text-slate-700 hover:text-[#0f766e]"
          >
            {t("pricing")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={localizedHref(alternateLocale, "/")}
            aria-label={alternateLocale === "sl" ? "Slovenščina" : "English"}
            className="button button-secondary px-3"
          >
            <LanguagesIcon size={17} />
            {alternateLocale.toUpperCase()}
          </a>
          <a
            href={localizedHref(locale, "/sign-in")}
            className="button button-primary hidden sm:inline-flex"
          >
            {t("signIn")}
          </a>
        </div>
      </div>
    </header>
  );
}
