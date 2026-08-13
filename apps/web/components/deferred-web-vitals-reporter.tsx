"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const Reporter = lazy(() =>
  import("./web-vitals-reporter").then((module) => ({ default: module.WebVitalsReporter })),
);

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

export function DeferredWebVitalsReporter() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const activate = () => {
      if (!cancelled) {
        setEnabled(true);
      }
    };
    const idleWindow = window as IdleWindow;
    let idleId: number | undefined;
    let idleTimeoutId: number | undefined;
    // Keep the observer out of the initial navigation window; the API reports
    // buffered entries when it eventually mounts, while public pages stay lean.
    const timeoutId = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(activate, { timeout: 5_000 });
        idleTimeoutId = window.setTimeout(() => {
          if (idleId !== undefined) {
            idleWindow.cancelIdleCallback?.(idleId);
          }
        }, 5_000);
        return;
      }
      activate();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (idleTimeoutId !== undefined) {
        window.clearTimeout(idleTimeoutId);
      }
      if (idleId !== undefined) {
        idleWindow.cancelIdleCallback?.(idleId);
      }
    };
  }, []);

  return enabled ? (
    <Suspense fallback={null}>
      <Reporter />
    </Suspense>
  ) : null;
}
