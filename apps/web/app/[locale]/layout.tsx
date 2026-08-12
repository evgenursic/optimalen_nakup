import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";

const serviceWorkerRegistration =
  'if("serviceWorker"in navigator){addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).catch(()=>{})},{once:true})};';
const webVitalsRegistration =
  '(()=>{const n=document.currentScript?.nonce;const r=()=>{setTimeout(()=>{const s=document.createElement("script");s.src="/web-vitals.js";s.async=true;if(n)s.nonce=n;document.head.append(s)},30000)};r()})()';

function readGeneratedStyles() {
  const candidates = [
    path.join(process.cwd(), "public", "styles.generated.css"),
    path.join(process.cwd(), "apps", "web", "public", "styles.generated.css"),
  ];
  const sourcePath = candidates.find((candidate) => existsSync(candidate));
  if (!sourcePath) {
    throw new Error("Generated styles are missing; run the web prebuild step first.");
  }
  return readFileSync(sourcePath, "utf8");
}

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
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
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
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const telemetryConfigured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.WEB_VITALS_INGEST_SECRET &&
    process.env.WEB_VITALS_INGEST_SECRET.length >= 32,
  );
  const runtimeRegistration = telemetryConfigured
    ? `${serviceWorkerRegistration}${webVitalsRegistration}`
    : serviceWorkerRegistration;
  const generatedStyles = readGeneratedStyles();
  return (
    <html lang={locale}>
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: generatedStyles }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          {locale === "sl" ? "Preskoči na vsebino" : "Skip to content"}
        </a>
        <SiteHeader locale={locale} />
        {children}
        <SiteFooter locale={locale} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: runtimeRegistration }} />
      </body>
    </html>
  );
}
