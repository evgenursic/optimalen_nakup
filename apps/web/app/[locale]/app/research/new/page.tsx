import { NewResearchPage } from "@/components/application/new-research-page";

export default async function NewResearch({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  return <NewResearchPage locale={locale} />;
}
