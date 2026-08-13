import { ResearchJobPage } from "@/components/application/research-job-page";

export default async function ResearchJob({
  params,
}: Readonly<{ params: Promise<{ locale: string; jobId: string }> }>) {
  const { locale: requestedLocale, jobId } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  return <ResearchJobPage locale={locale} jobId={jobId} />;
}
