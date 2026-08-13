import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    applicationName: "Optimalen Nakup",
    authors: [{ name: "Optimalen Nakup" }],
    creator: "Optimalen Nakup",
    formatDetection: {
      address: false,
      email: false,
      telephone: false,
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "sl" ? "sl_SI" : "en_GB",
      siteName: "Optimalen Nakup",
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const telemetryConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.WEB_VITALS_INGEST_SECRET &&
    process.env.WEB_VITALS_INGEST_SECRET.length >= 32,
  );
  return (
    <html lang={locale}>
      <head>
        <link rel="preload" href="/styles.generated.css" as="style" />
        {/* The generated stylesheet is intentionally external: inlining it duplicates the full
            CSS in the React Flight payload and adds measurable mobile main-thread work. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/styles.generated.css" />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          {locale === "sl" ? "Preskoči na vsebino" : "Skip to content"}
        </a>
        <SiteHeader locale={locale} />
        {children}
        <SiteFooter locale={locale} />
        <script
          nonce={nonce}
          src="/runtime-registration.js"
          data-telemetry={telemetryConfigured ? "enabled" : "disabled"}
          defer
        />
      </body>
    </html>
  );
}
