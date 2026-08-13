import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localizedAlternates } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localizedAlternates(locale, "/how-it-works") };
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("process");
  const steps = [
    [t("one"), t("oneText")],
    [t("two"), t("twoText")],
    [t("three"), t("threeText")],
    [t("four"), t("fourText")],
  ] as const;

  return (
    <main id="main-content" className="container py-16 lg:py-24">
      <p className="eyebrow">Evidence-first workflow</p>
      <h1 className="section-heading mt-5">{t("title")}</h1>
      <ol className="mt-12 grid gap-5 lg:grid-cols-2">
        {steps.map(([title, text], index) => (
          <li key={title} className="card grid grid-cols-[auto_1fr] gap-5 p-7">
            <span className="grid size-11 place-items-center rounded-full bg-[#0b1f33] font-extrabold text-white">
              {index + 1}
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-[#0b1f33]">{title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
