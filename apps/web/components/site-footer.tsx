import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <p className="font-extrabold text-[#0b1f33]">Optimalen Nakup</p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{t("tagline")}</p>
          <p className="mt-4 max-w-xl text-xs leading-5 text-slate-600">{t("legal")}</p>
        </div>
        <nav aria-label="Legal" className="grid gap-3 text-sm font-semibold text-slate-700">
          <Link href="/legal/privacy">{t("privacy")}</Link>
          <Link href="/legal/terms">{t("terms")}</Link>
          <Link href="/legal/sources">{t("sources")}</Link>
        </nav>
      </div>
    </footer>
  );
}
