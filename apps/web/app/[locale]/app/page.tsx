import { DashboardPage } from "@/components/application/dashboard-page";

export default async function AppDashboard({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  return <DashboardPage locale={locale} />;
}
