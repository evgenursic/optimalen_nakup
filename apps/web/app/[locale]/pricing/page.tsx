import { CheckCircle2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { WaitlistForm } from "@/components/waitlist-form";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const plans = [
    [t("starter"), t("starterText"), ["1 research workspace", "Evidence-backed shortlist"]],
    [t("pro"), t("proText"), ["Saved searches", "Monitoring and exports"]],
    [t("business"), t("businessText"), ["Workspace roles", "Higher verified-page limits"]],
  ] as const;

  return (
    <main id="main-content" className="container py-16 lg:py-24">
      <p className="eyebrow">Closed beta</p>
      <h1 className="section-heading mt-5">{t("title")}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{t("description")}</p>
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {plans.map(([name, description, features], index) => (
          <article
            className={`card flex flex-col p-7 ${index === 1 ? "border-[#0f766e] ring-2 ring-[#0f766e]/15" : ""}`}
            key={name}
          >
            <h2 className="text-2xl font-extrabold text-[#0b1f33]">{name}</h2>
            <p className="mt-3 min-h-14 leading-7 text-slate-600">{description}</p>
            <p className="mt-7 border-y border-slate-200 py-5 font-semibold text-slate-700">
              {t("configuredLater")}
            </p>
            <ul className="my-6 grid gap-3 text-sm text-slate-700">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckCircle2 aria-hidden="true" className="text-[#0f766e]" size={18} />
                  {feature}
                </li>
              ))}
            </ul>
            <a href="#waitlist" className="button button-primary mt-auto">
              {t("cta")}
            </a>
          </article>
        ))}
      </div>
      <WaitlistForm
        locale={locale === "en" ? "en" : "sl"}
        labels={{
          title: t("waitlistTitle"),
          email: t("email"),
          submit: t("submit"),
          privacy: t("privacy"),
          success: t("success"),
          duplicate: t("duplicate"),
          error: t("error"),
        }}
      />
    </main>
  );
}
