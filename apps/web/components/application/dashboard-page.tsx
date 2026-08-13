"use client";

import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { ArrowRight, CirclePlus, Clock3, FileSearch, Gauge } from "lucide-react";

import { Link } from "@/i18n/navigation";

import { useWorkspace } from "./workspace-context";

function toneForState(state: string): "success" | "warning" | "danger" | undefined {
  if (state === "completed") return "success";
  if (["failed", "dead_letter", "cancelled"].includes(state)) return "danger";
  if (state === "completed_partial") return "warning";
  return undefined;
}

export function DashboardPage({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const { workspace } = useWorkspace();
  const jobs = usePaginatedQuery(
    api.research.listJobs,
    { organizationId: workspace.id },
    { initialNumItems: 12 },
  );
  const running = jobs.results.filter((job) =>
    ["queued", "running", "cancel_requested"].includes(job.state),
  ).length;
  const completed = jobs.results.filter((job) =>
    ["completed", "completed_partial"].includes(job.state),
  ).length;

  return (
    <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{locale === "sl" ? "Aplikacija" : "Application"}</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1f33]">
            {locale === "sl" ? "Raziskovalni pregled" : "Research overview"}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            {locale === "sl"
              ? "V živo spremljajte preverjanje, pokritost in rezultate svojega delovnega prostora."
              : "Track verification, coverage, and workspace results in real time."}
          </p>
        </div>
        <Link href="/app/research/new" className="button button-primary">
          <CirclePlus aria-hidden="true" size={19} />
          {locale === "sl" ? "Nova raziskava" : "New research"}
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Summary">
        <article className="metric-card">
          <Gauge aria-hidden="true" className="text-teal-700" size={22} />
          <p className="mt-4 text-3xl font-extrabold text-[#0b1f33]">{running}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {locale === "sl" ? "Aktivne raziskave" : "Active research"}
          </p>
        </article>
        <article className="metric-card">
          <FileSearch aria-hidden="true" className="text-teal-700" size={22} />
          <p className="mt-4 text-3xl font-extrabold text-[#0b1f33]">{completed}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {locale === "sl" ? "Končane raziskave" : "Completed research"}
          </p>
        </article>
        <article className="metric-card">
          <Clock3 aria-hidden="true" className="text-teal-700" size={22} />
          <p className="mt-4 text-xl font-extrabold text-[#0b1f33]">
            {workspace.plan.replace("_", " ")}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {locale === "sl" ? "Trenutni načrt" : "Current plan"}
          </p>
        </article>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-[#0b1f33]">
            {locale === "sl" ? "Nedavne raziskave" : "Recent research"}
          </h2>
          <span className="text-sm text-slate-500">
            {jobs.results.length} {locale === "sl" ? "prikazanih" : "shown"}
          </span>
        </div>
        {jobs.status === "LoadingFirstPage" ? (
          <div className="card mt-5 p-6" aria-busy="true">
            {locale === "sl" ? "Nalagam raziskave …" : "Loading research …"}
          </div>
        ) : jobs.results.length === 0 ? (
          <div className="card mt-5 p-8 text-center">
            <p className="font-semibold text-slate-700">
              {locale === "sl"
                ? "Ta delovni prostor še nima raziskave."
                : "This workspace has no research yet."}
            </p>
            <Link href="/app/research/new" className="button button-primary mt-5">
              {locale === "sl" ? "Opišite prvi nakup" : "Describe your first purchase"}
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {jobs.results.map((job) => (
              <Link
                key={job.id}
                href={`/app/research/${job.id}`}
                className="card grid gap-4 p-5 transition hover:border-teal-600 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-extrabold text-[#0b1f33]">{job.title}</h3>
                    <span className="status-badge" data-tone={toneForState(job.state)}>
                      {job.state.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{job.category}</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-700"
                      style={{ width: `${Math.max(2, Math.min(100, job.progress))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {job.stage.replaceAll("_", " ")} · {job.pagesVisited}/{job.maxPages}{" "}
                    {locale === "sl" ? "strani" : "pages"} ·{" "}
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(job.updatedAt)}
                  </p>
                </div>
                <ArrowRight aria-hidden="true" className="text-teal-700" />
              </Link>
            ))}
            {jobs.status === "CanLoadMore" ? (
              <button
                className="button button-secondary justify-self-center"
                onClick={() => jobs.loadMore(12)}
                type="button"
              >
                {locale === "sl" ? "Prikaži več" : "Load more"}
              </button>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
