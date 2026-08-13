import { NextIntlClientProvider } from "next-intl";

import { AuthProvider } from "@/components/auth-provider";
import { InvitationAcceptPage } from "@/components/invitation-accept-page";

export const dynamic = "force-dynamic";

export default async function InvitationRoute({
  params,
}: Readonly<{ params: Promise<{ locale: string; token: string }> }>) {
  const { locale: requestedLocale, token } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CONVEX_URL,
  );
  if (!configured) {
    return (
      <main id="main-content" className="container py-20">
        <section className="card mx-auto max-w-2xl p-8">
          <h1 className="text-3xl font-extrabold text-[#0b1f33]">
            {locale === "sl" ? "Vabila še ni mogoče sprejeti" : "Invitation cannot be accepted yet"}
          </h1>
          <p className="mt-4 text-slate-600">
            {locale === "sl"
              ? "Identiteta in podatkovno okolje nista konfigurirana."
              : "Identity and data services are not configured."}
          </p>
        </section>
      </main>
    );
  }
  return (
    <NextIntlClientProvider locale={locale} messages={null}>
      <AuthProvider>
        <InvitationAcceptPage locale={locale} token={token} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
