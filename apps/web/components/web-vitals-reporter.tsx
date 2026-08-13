"use client";

import { useReportWebVitals } from "next/web-vitals";

const supportedMetrics = new Set(["LCP", "INP", "CLS", "TTFB"]);

function normalizedRoute(pathname: string): string {
  return pathname
    .replace(/\/app\/research\/[^/]+$/, "/app/research/job")
    .replace(/\/invite\/[^/]+$/, "/invite/token")
    .slice(0, 300);
}

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!supportedMetrics.has(metric.name)) {
      return;
    }
    const payload = JSON.stringify({
      route: normalizedRoute(window.location.pathname),
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/web-vitals", new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch("/api/web-vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    });
  });
  return null;
}
