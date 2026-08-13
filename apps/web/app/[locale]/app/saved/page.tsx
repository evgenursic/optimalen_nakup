import { SavedPage } from "@/components/application/saved-page";

export default async function SavedRoute({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  return <SavedPage locale={locale} />;
}
