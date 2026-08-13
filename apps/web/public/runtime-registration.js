(function () {
  "use strict";

  var currentScript = document.currentScript;
  var telemetryEnabled = currentScript?.dataset.telemetry === "enabled";

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(function () {});
    }
  }

  function loadTelemetry() {
    if (!telemetryEnabled) return;
    var script = document.createElement("script");
    script.src = "/web-vitals.js";
    script.async = true;
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    addEventListener("load", registerServiceWorker, { once: true });
  } else {
    registerServiceWorker();
  }

  setTimeout(function () {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadTelemetry, { timeout: 5_000 });
    } else {
      loadTelemetry();
    }
  }, 30_000);
})();
