"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { BellRing, ExternalLink, Library, PauseCircle, PlayCircle } from "lucide-react";

import { Link } from "@/i18n/navigation";

import { useWorkspace } from "./workspace-context";

export function SavedPage({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const { workspace } = useWorkspace();
  const searches = useQuery(api.research.listSavedSearches, {
    organizationId: workspace.id,
  });
  const alerts = useQuery(api.research.listAlerts, {
    organizationId: workspace.id,
  });
  const configureSearch = useMutation(api.research.configureSavedSearch);

  return (
    <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
      <p className="eyebrow">{locale === "sl" ? "Spremljanje" : "Monitoring"}</p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1f33]">
        {locale === "sl" ? "Shranjena iskanja in opozorila" : "Saved searches and alerts"}
      </h1>
      <p className="mt-4 max-w-3xl leading-7 text-slate-600">
        {locale === "sl"
          ? "Upravljajte spremljanje potrjenih meril. Stanje dostave jasno loči in-app dogodke od dejansko poslane e-pošte."
          : "Manage monitoring for confirmed criteria. Delivery state clearly distinguishes in-app events from email that was actually sent."}
      </p>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0b1f33]">
          <Library aria-hidden="true" size={22} />
          {locale === "sl" ? "Shranjena iskanja" : "Saved searches"}
        </h2>
        {searches === undefined ? (
          <div className="card mt-4 p-6" aria-busy="true">
            {locale === "sl" ? "Nalagam …" : "Loading …"}
          </div>
        ) : searches.length === 0 ? (
          <div className="card mt-4 p-8 text-center">
            <p className="font-semibold text-slate-700">
              {locale === "sl"
                ? "Ko shranite raziskavo, se bo prikazala tukaj."
                : "A research item will appear here after you save it."}
            </p>
            <Link href="/app" className="button button-primary mt-5">
              {locale === "sl" ? "Odpri raziskave" : "Open research"}
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {searches.map((search) => (
              <article
                key={search.id}
                className="card flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-extrabold text-[#0b1f33]">{search.name}</h3>
                    <span
                      className="status-badge"
                      data-tone={search.active ? "success" : "warning"}
                    >
                      {search.active
                        ? locale === "sl"
                          ? "aktivno"
                          : "active"
                        : locale === "sl"
                          ? "zaustavljeno"
                          : "paused"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {locale === "sl" ? "Posodobljeno" : "Updated"}{" "}
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(search.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {search.latestJobId ? (
                    <Link
                      href={`/app/research/${search.latestJobId}`}
                      className="button button-secondary"
                    >
                      <ExternalLink aria-hidden="true" size={16} />
                      {locale === "sl" ? "Rezultati" : "Results"}
                    </Link>
                  ) : null}
                  <button
                    className="button button-secondary"
                    onClick={() =>
                      void configureSearch({
                        organizationId: workspace.id,
                        savedSearchId: search.id,
                        active: !search.active,
                        emailEnabled: search.emailEnabled,
                        monitoringIntervalHours: search.monitoringIntervalHours,
                      })
                    }
                    type="button"
                  >
                    {search.active ? (
                      <PauseCircle aria-hidden="true" size={17} />
                    ) : (
                      <PlayCircle aria-hidden="true" size={17} />
                    )}
                    {search.active
                      ? locale === "sl"
                        ? "Ustavi"
                        : "Pause"
                      : locale === "sl"
                        ? "Vključi"
                        : "Enable"}
                  </button>
                  <label className="button button-secondary">
                    <input
                      type="checkbox"
                      checked={search.emailEnabled}
                      onChange={(event) =>
                        void configureSearch({
                          organizationId: workspace.id,
                          savedSearchId: search.id,
                          active: search.active,
                          emailEnabled: event.target.checked,
                          monitoringIntervalHours: search.monitoringIntervalHours,
                        })
                      }
                    />
                    {locale === "sl" ? "E-pošta" : "Email"}
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    {locale === "sl" ? "Vsakih" : "Every"}
                    <select
                      className="app-select min-h-10 w-auto"
                      value={search.monitoringIntervalHours}
                      onChange={(event) =>
                        void configureSearch({
                          organizationId: workspace.id,
                          savedSearchId: search.id,
                          active: search.active,
                          emailEnabled: search.emailEnabled,
                          monitoringIntervalHours: Number(event.target.value),
                        })
                      }
                    >
                      <option value={24}>24 h</option>
                      <option value={72}>72 h</option>
                      <option value={168}>168 h</option>
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0b1f33]">
          <BellRing aria-hidden="true" size={22} />
          {locale === "sl" ? "Nedavna opozorila" : "Recent alerts"}
        </h2>
        {alerts === undefined ? (
          <div className="card mt-4 p-6" aria-busy="true">
            {locale === "sl" ? "Nalagam …" : "Loading …"}
          </div>
        ) : alerts.length === 0 ? (
          <div className="card mt-4 p-6 text-slate-600">
            {locale === "sl"
              ? "Za vaša shranjena iskanja še ni opozoril."
              : "There are no alerts for your saved searches yet."}
          </div>
        ) : (
          <ol className="card mt-4">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-0"
              >
                <div>
                  <p className="font-bold text-[#0b1f33]">{alert.eventType.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {alert.channel === "email"
                      ? locale === "sl"
                        ? "E-pošta"
                        : "Email"
                      : locale === "sl"
                        ? "V aplikaciji"
                        : "In app"}{" "}
                    ·{" "}
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(alert.createdAt)}
                  </p>
                </div>
                <span
                  className="status-badge"
                  data-tone={
                    alert.state === "sent"
                      ? "success"
                      : alert.state === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {alert.state}
                </span>
                {alert.lastError ? (
                  <p className="w-full text-xs text-red-700">{alert.lastError}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
