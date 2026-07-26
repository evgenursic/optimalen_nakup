import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Optimalen Nakup",
    short_name: "Optimalen Nakup",
    description: "Evidence-first purchasing research",
    start_url: "/sl",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    lang: "sl",
    categories: ["shopping", "productivity", "business"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
