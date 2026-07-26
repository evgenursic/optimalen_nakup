import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInContent } from "@/components/sign-in-content";

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main id="main-content" className="container grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
      <div>
        <p className="eyebrow">Secure workspace</p>
        <h1 className="section-heading mt-5">{t("title")}</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{t("description")}</p>
      </div>
      <div className="lg:justify-self-end">
        <SignInContent notConfigured={t("notConfigured")} />
      </div>
    </main>
  );
}
