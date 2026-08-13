import { AdminPage } from "@/components/application/admin-page";

export default async function AdminRoute({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "sl";
  return <AdminPage locale={locale} />;
}
