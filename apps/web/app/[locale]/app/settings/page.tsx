import { SettingsPage } from "@/components/application/settings-page";

export default async function SettingsRoute({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  return <SettingsPage locale={locale} />;
}
