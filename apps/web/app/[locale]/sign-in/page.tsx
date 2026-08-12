import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInLauncher } from "@/components/sign-in-launcher";
import { localizedAlternates } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: localizedAlternates(locale, "/sign-in"),
  };
}

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main id="main-content" className="container grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
      <div>
        <p className="eyebrow">Secure workspace</p>
        <h1 className="section-heading mt-5">{t("title")}</h1>
        <p className="lcp-candidate mt-6 max-w-xl text-lg leading-8 text-slate-600">
          {t("description")}
        </p>
      </div>
      <div className="lg:justify-self-end">
        {configured ? (
          <SignInLauncher
            label={locale === "sl" ? "Odpri varno prijavo" : "Open secure sign-in"}
            loadingLabel={locale === "sl" ? "Odpiram varno prijavo …" : "Opening secure sign-in …"}
          />
        ) : (
          <div className="card max-w-xl p-7" role="status">
            <p className="leading-7 text-slate-700">{t("notConfigured")}</p>
          </div>
        )}
      </div>
    </main>
  );
}
