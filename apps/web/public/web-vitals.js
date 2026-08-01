(function () {
  "use strict";

  var sent = Object.create(null);
  var values = { cls: 0, inp: null, lcp: null, ttfb: 0 };

  function route() {
    return location.pathname
      .replace(/\/app\/research\/[^/]+$/, "/app/research/job")
      .replace(/\/invite\/[^/]+$/, "/invite/token")
      .slice(0, 300);
  }

  function rating(name, value) {
    var thresholds = {
      cls: [0.1, 0.25],
      inp: [200, 500],
      lcp: [2500, 4000],
      ttfb: [800, 1800],
    }[name];
    return value <= thresholds[0] ? "good" : value <= thresholds[1] ? "needs-improvement" : "poor";
  }

  function report(name, value) {
    if (sent[name] || !Number.isFinite(value)) return;
    sent[name] = true;
    var body = JSON.stringify({
      route: route(),
      metric: name.toUpperCase(),
      value: value,
      rating: rating(name, value),
      navigationType: (performance.getEntriesByType("navigation")[0] || {}).type || "navigate",
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/web-vitals", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/web-vitals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    }
  }

  var navigation = performance.getEntriesByType("navigation")[0];
  if (navigation) values.ttfb = navigation.responseStart;

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (!entry.hadRecentInput) values.cls += entry.value;
      });
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        values.lcp = entry.startTime;
      });
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        values.inp = values.inp === null ? entry.duration : Math.max(values.inp, entry.duration);
      });
    }).observe({ type: "event", buffered: true, durationThreshold: 40 });
  } catch {}

  function flush() {
    report("ttfb", values.ttfb);
    report("lcp", values.lcp);
    report("cls", values.cls);
    report("inp", values.inp);
  }

  addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush();
  });
  setTimeout(flush, 5000);
})();
