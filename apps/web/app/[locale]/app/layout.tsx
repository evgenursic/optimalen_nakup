import { NextIntlClientProvider } from "next-intl";

import { AuthProvider } from "@/components/auth-provider";
import { ApplicationRoot } from "@/components/application/application-root";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CONVEX_URL,
  );

  if (!configured) {
    return (
      <main id="main-content" className="container py-20">
        <section className="card mx-auto max-w-2xl p-8">
          <p className="eyebrow">{locale === "sl" ? "Varna nastavitev" : "Secure setup"}</p>
          <h1 className="mt-5 text-3xl font-extrabold text-[#0b1f33]">
            {locale === "sl"
              ? "Aplikacijsko okolje še ni povezano"
              : "The application environment is not connected yet"}
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            {locale === "sl"
              ? "Za zasebni del sta potrebna javna Clerk identifikacija in Convex URL. Vnesite ju v varno okoljsko shrambo; aplikacija ne uporablja lažnih sej ali podatkov."
              : "The private application requires a public Clerk identifier and Convex URL. Add them through secure environment storage; the app does not simulate sessions or user data."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={null}>
      <AuthProvider>
        <ApplicationRoot locale={locale}>{children}</ApplicationRoot>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
