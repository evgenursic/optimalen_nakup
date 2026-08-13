"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Activity, Coins, DatabaseZap, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkspace } from "./workspace-context";

function healthTone(
  status: "healthy" | "degraded" | "blocked" | "disabled" | "legal_review_required",
): "success" | "warning" | "danger" {
  if (status === "healthy") return "success";
  if (status === "degraded" || status === "legal_review_required") return "warning";
  return "danger";
}

export function AdminPage({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const { workspace } = useWorkspace();
  const canAdminister = workspace.role === "owner" || workspace.role === "admin";
  const overview = useQuery(
    api.admin.organizationOverview,
    canAdminister ? { organizationId: workspace.id } : "skip",
  );
  const sources = useQuery(
    api.admin.sourceHealth,
    canAdminister ? { organizationId: workspace.id } : "skip",
  );
  const platformAdmin = useQuery(api.admin.isPlatformAdmin);
  const settings = useQuery(
    api.admin.listApplicationSettings,
    platformAdmin === true ? {} : "skip",
  );
  const setSetting = useMutation(api.admin.setApplicationSetting);
  const [key, setKey] = useState("");
  const [valueJson, setValueJson] = useState("true");
  const [message, setMessage] = useState("");
  const killSwitch = useMemo(
    () => settings?.find((setting) => setting.key === "worker.killSwitch"),
    [settings],
  );

  async function saveSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await setSetting({ key, valueJson });
      setMessage(locale === "sl" ? "Nastavitev je shranjena." : "Setting saved.");
      setKey("");
    } catch {
      setMessage(
        locale === "sl"
          ? "Nastavitve ni bilo mogoče shraniti. Preverite JSON in skrbniške pravice."
          : "Setting could not be saved. Check JSON and operator permissions.",
      );
    }
  }

  if (!canAdminister) {
    return (
      <main id="main-content" className="px-5 py-10 lg:px-10">
        <h1 className="text-3xl font-extrabold text-[#0b1f33]">
          {locale === "sl"
            ? "Administratorski dostop je potreben"
            : "Administrator access required"}
        </h1>
        <p className="mt-4 text-slate-600">
          {locale === "sl"
            ? "Diagnostika, revizijski dogodki in poraba so omejeni na lastnike in administratorje."
            : "Diagnostics, audit events, and usage are limited to owners and administrators."}
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
      <p className="eyebrow">{locale === "sl" ? "Nadzor" : "Operations"}</p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1f33]">
        {locale === "sl" ? "Administracija in diagnostika" : "Administration and diagnostics"}
      </h1>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="metric-card">
          <DatabaseZap aria-hidden="true" className="text-teal-700" size={22} />
          <p className="mt-4 text-3xl font-extrabold text-[#0b1f33]">
            {overview?.usage.jobsThisMonth ?? "—"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {locale === "sl" ? "Opravila ta mesec" : "Jobs this month"}
          </p>
        </article>
        <article className="metric-card">
          <Activity aria-hidden="true" className="text-teal-700" size={22} />
          <p className="mt-4 text-3xl font-extrabold text-[#0b1f33]">
            {overview?.usage.pagesThisMonth ?? "—"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {locale === "sl" ? "Strani ta mesec" : "Pages this month"}
          </p>
        </article>
        <article className="metric-card">
          <Coins aria-hidden="true" className="text-teal-700" size={22} />
          <p className="mt-4 text-3xl font-extrabold text-[#0b1f33]">
            €{overview?.modelCostEur.toFixed(4) ?? "—"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {locale === "sl" ? "AI strošek ta mesec" : "AI cost this month"}
          </p>
        </article>
        <article className="metric-card">
          <ShieldCheck aria-hidden="true" className="text-teal-700" size={22} />
          <p className="mt-4 text-3xl font-extrabold text-[#0b1f33]">
            {overview?.entitlements.length ?? "—"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {locale === "sl" ? "Pravice" : "Entitlements"}
          </p>
        </article>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0b1f33]">
            {locale === "sl" ? "Zdravje virov" : "Source health"}
          </h2>
          <div className="card mt-4">
            {(sources ?? []).length === 0 ? (
              <p className="p-5 text-slate-600">
                {locale === "sl"
                  ? "Ni zabeleženih health-checkov. To ni trditev, da je vir zdrav."
                  : "No health checks are recorded. This does not mean a source is healthy."}
              </p>
            ) : (
              (sources ?? []).map((source) => (
                <article
                  key={source.id}
                  className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 last:border-0"
                >
                  <div>
                    <h3 className="font-extrabold text-[#0b1f33]">{source.sourceId}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      {source.detail}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {locale === "sl" ? "Pregledano" : "Checked"}{" "}
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(source.lastCheckedAt)}{" "}
                      · {source.consecutiveFailures}{" "}
                      {locale === "sl" ? "zaporednih napak" : "consecutive failures"}
                    </p>
                  </div>
                  <span className="status-badge" data-tone={healthTone(source.status)}>
                    {source.status.replaceAll("_", " ")}
                  </span>
                </article>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-[#0b1f33]">
            {locale === "sl" ? "Pravice in limiti" : "Entitlements and limits"}
          </h2>
          <div className="card mt-4">
            {(overview?.entitlements ?? []).map((entitlement) => (
              <div
                key={entitlement.key}
                className="flex items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-0"
              >
                <div>
                  <p className="font-bold text-[#0b1f33]">{entitlement.key}</p>
                  <p className="mt-1 text-xs text-slate-500">{entitlement.source}</p>
                </div>
                <span className="font-extrabold text-teal-800">
                  {entitlement.enabled ? (entitlement.limit ?? "on") : "off"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-[#0b1f33]">
          {locale === "sl" ? "Revizijski dogodki" : "Audit events"}
        </h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="results-table">
            <thead>
              <tr>
                <th>{locale === "sl" ? "Čas" : "Time"}</th>
                <th>{locale === "sl" ? "Dejanje" : "Action"}</th>
                <th>{locale === "sl" ? "Akter" : "Actor"}</th>
                <th>{locale === "sl" ? "Cilj" : "Target"}</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.recentAuditEvents ?? []).map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "short",
                      timeStyle: "medium",
                    }).format(event.occurredAt)}
                  </td>
                  <td className="font-bold">{event.action}</td>
                  <td>{event.actorType}</td>
                  <td>
                    {event.targetType} · {event.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {platformAdmin ? (
        <section className="mt-10 border-t border-slate-200 pt-10">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0b1f33]">
            <SlidersHorizontal aria-hidden="true" size={22} />
            {locale === "sl" ? "Platformna konfiguracija" : "Platform configuration"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {locale === "sl"
              ? "Prikazane so samo neskrivne nastavitve. Skrivnosti ostanejo izključno v secret shrambi."
              : "Only non-sensitive settings appear here. Secrets remain exclusively in secret storage."}
          </p>
          {message ? (
            <p className="mt-4 rounded-lg bg-teal-50 p-3 font-semibold text-teal-900" role="status">
              {message}
            </p>
          ) : null}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-[#0b1f33]">worker.killSwitch</h3>
                  <p className="mt-1 text-sm text-slate-600">{killSwitch?.valueJson ?? "false"}</p>
                </div>
                <button
                  className="button button-secondary text-red-700"
                  onClick={() =>
                    void setSetting({
                      key: "worker.killSwitch",
                      valueJson: killSwitch?.valueJson === "true" ? "false" : "true",
                    })
                  }
                  type="button"
                >
                  {killSwitch?.valueJson === "true"
                    ? locale === "sl"
                      ? "Ponovno omogoči worker"
                      : "Re-enable worker"
                    : locale === "sl"
                      ? "Ustavi nova opravila"
                      : "Stop new claims"}
                </button>
              </div>
            </div>
            <form className="card grid gap-4 p-5" onSubmit={saveSetting}>
              <label className="grid gap-2 font-semibold">
                {locale === "sl" ? "Ključ" : "Key"}
                <input
                  className="app-input"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="billing.publicPricing"
                  required
                />
              </label>
              <label className="grid gap-2 font-semibold">
                {locale === "sl" ? "Veljaven JSON" : "Valid JSON"}
                <textarea
                  className="app-textarea min-h-28 font-mono text-sm"
                  value={valueJson}
                  onChange={(event) => setValueJson(event.target.value)}
                  required
                />
              </label>
              <button className="button button-primary" type="submit">
                {locale === "sl" ? "Shrani nastavitev" : "Save setting"}
              </button>
            </form>
          </div>
          <div className="card mt-5 overflow-x-auto">
            <table className="results-table">
              <thead>
                <tr>
                  <th>{locale === "sl" ? "Ključ" : "Key"}</th>
                  <th>JSON</th>
                  <th>{locale === "sl" ? "Posodobljeno" : "Updated"}</th>
                </tr>
              </thead>
              <tbody>
                {(settings ?? []).map((setting) => (
                  <tr key={setting.id}>
                    <td className="font-bold">{setting.key}</td>
                    <td>
                      <code className="text-xs">{setting.valueJson}</code>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(setting.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
