import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const routes = ["", "/pricing", "/how-it-works"];
  return ["sl", "en"].flatMap((locale) =>
    routes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date("2026-07-26T00:00:00.000Z"),
      changeFrequency: route ? ("monthly" as const) : ("weekly" as const),
      priority: route ? 0.8 : 1,
    })),
  );
}
