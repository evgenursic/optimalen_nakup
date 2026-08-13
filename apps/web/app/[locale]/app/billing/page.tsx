import { BillingPage } from "@/components/application/billing-page";

export default async function BillingRoute({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  return <BillingPage locale={locale} />;
}
