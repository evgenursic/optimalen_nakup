"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowDownUp,
  Ban,
  Download,
  ExternalLink,
  FileText,
  Pin,
  PinOff,
  Scale,
} from "lucide-react";
import { useMemo, useState } from "react";

import { downloadCsv } from "@/lib/csv";

import { EvidenceDialog } from "./evidence-dialog";
import { useWorkspace } from "./workspace-context";

type OfferRow = {
  id: Id<"offers">;
  sourceId: string;
  sourceOfferId: string;
  canonicalUrl: string;
  title: string;
  providerName: string | null;
  sellerName: string | null;
  basePrice: { amount: number; currency: string } | null;
  totalInitialCost: { amount: number; currency: string } | null;
  estimatedTotalCost: { amount: number; currency: string } | null;
  availability: "in_stock" | "limited" | "preorder" | "unavailable" | "unknown";
  attributesJson: string;
  collectedAt: number;
  staleAfter: number;
  score: number | null;
};

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseStrings(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

function costFor(offer: OfferRow): number | null {
  return (
    offer.estimatedTotalCost?.amount ??
    offer.totalInitialCost?.amount ??
    offer.basePrice?.amount ??
    null
  );
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function displayAttribute(value: unknown): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return new Intl.NumberFormat(undefined).format(value);
  if (typeof value === "string") return value;
  return "—";
}

export function ResearchJobPage({
  locale,
  jobId,
}: Readonly<{ locale: "sl" | "en"; jobId: string }>) {
  const { workspace } = useWorkspace();
  const typedJobId = jobId as Id<"researchJobs">;
  const job = useQuery(api.research.getJob, {
    organizationId: workspace.id,
    jobId: typedJobId,
  });
  const events = useQuery(api.research.listJobEvents, {
    organizationId: workspace.id,
    jobId: typedJobId,
  });
  const recommendations = useQuery(api.research.listRecommendations, {
    organizationId: workspace.id,
    jobId: typedJobId,
  });
  const pins = useQuery(api.research.listPinnedOffers, {
    organizationId: workspace.id,
    jobId: typedJobId,
  });
  const offers = usePaginatedQuery(
    api.research.listOffers,
    { organizationId: workspace.id, jobId: typedJobId },
    { initialNumItems: 50 },
  );
  const cancel = useMutation(api.research.cancel);
  const pinOffer = useMutation(api.research.setOfferPinned);
  const saveSearch = useMutation(api.research.saveSearch);
  const [sort, setSort] = useState<"score" | "price" | "title">("score");
  const [selectedEvidence, setSelectedEvidence] = useState<OfferRow | null>(null);
  const [comparison, setComparison] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const sortedOffers = useMemo(() => {
    return [...offers.results].sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title, locale);
      if (sort === "price")
        return (
          (costFor(left) ?? Number.POSITIVE_INFINITY) - (costFor(right) ?? Number.POSITIVE_INFINITY)
        );
      return (right.score ?? -1) - (left.score ?? -1);
    });
  }, [locale, offers.results, sort]);
  const dynamicColumns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const offer of offers.results) {
      for (const [key, value] of Object.entries(parseObject(offer.attributesJson))) {
        if (
          /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key) &&
          ["string", "number", "boolean"].includes(typeof value)
        ) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .sort(([leftKey, leftCount], [rightKey, rightCount]) => {
        if (leftCount !== rightCount) return rightCount - leftCount;
        return leftKey.localeCompare(rightKey, locale);
      })
      .slice(0, 3)
      .map(([key]) => key);
  }, [locale, offers.results]);

  if (job === undefined) {
    return (
      <main id="main-content" className="px-5 py-10 lg:px-10" aria-busy="true">
        {locale === "sl" ? "Nalagam raziskavo …" : "Loading research …"}
      </main>
    );
  }
  if (job === null) {
    return (
      <main id="main-content" className="px-5 py-10 lg:px-10">
        <h1 className="text-3xl font-extrabold text-[#0b1f33]">
          {locale === "sl" ? "Raziskava ni najdena" : "Research not found"}
        </h1>
      </main>
    );
  }

  const coverage = parseObject(job.coverageJson);
  const exportJobId = job.id;
  const terminal = [
    "completed",
    "completed_partial",
    "cancelled",
    "failed",
    "dead_letter",
  ].includes(job.state);
  const pinned = new Set(pins ?? []);

  function exportOffers() {
    downloadCsv(
      `optimalen-nakup-${exportJobId}.csv`,
      ["title", "score", "cost_eur", "availability", "seller", "source", "url", "collected_at"],
      sortedOffers.map((offer) => [
        offer.title,
        offer.score,
        costFor(offer),
        offer.availability,
        offer.sellerName,
        offer.sourceId,
        offer.canonicalUrl,
        new Date(offer.collectedAt).toISOString(),
      ]),
    );
  }

  return (
    <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="status-badge"
              data-tone={
                job.state === "completed"
                  ? "success"
                  : job.state === "completed_partial"
                    ? "warning"
                    : ["failed", "dead_letter", "cancelled"].includes(job.state)
                      ? "danger"
                      : undefined
              }
            >
              {job.state.replaceAll("_", " ")}
            </span>
            <span className="text-sm font-semibold text-slate-500">{job.category}</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-[#0b1f33]">
            {job.title}
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">{job.originalInput}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button className="button button-secondary" onClick={exportOffers} type="button">
            <Download aria-hidden="true" size={17} />
            CSV
          </button>
          <button className="button button-secondary" onClick={() => window.print()} type="button">
            <FileText aria-hidden="true" size={17} />
            {locale === "sl" ? "Natisni / PDF" : "Print / PDF"}
          </button>
          {!terminal && workspace.role !== "viewer" ? (
            <button
              className="button button-secondary text-red-700"
              onClick={() =>
                void cancel({ organizationId: workspace.id, jobId: typedJobId }).then(() =>
                  setMessage(locale === "sl" ? "Preklic je zahtevan." : "Cancellation requested."),
                )
              }
              type="button"
            >
              <Ban aria-hidden="true" size={17} />
              {locale === "sl" ? "Prekliči" : "Cancel"}
            </button>
          ) : null}
        </div>
      </div>

      {message ? (
        <p
          className="mt-5 rounded-lg bg-teal-50 p-3 text-sm font-semibold text-teal-900"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="card mt-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-[#0b1f33]">
              {locale === "sl" ? "Napredek in pokritost" : "Progress and coverage"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{job.stage.replaceAll("_", " ")}</p>
          </div>
          <span className="text-2xl font-extrabold text-teal-800">{job.progress.toFixed(0)} %</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div
            className="h-full rounded-full bg-teal-700"
            style={{ width: `${Math.max(1, Math.min(100, job.progress))}%` }}
          />
        </div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
          <p>
            <strong>{job.pagesVisited}</strong> / {job.maxPages}{" "}
            {locale === "sl" ? "strani" : "pages"}
          </p>
          <p>
            <strong>{job.runtimeSeconds}</strong> / {job.maxRuntimeSeconds} s
          </p>
          <p>
            <strong>€{job.aiCostEur.toFixed(4)}</strong> / €{job.maxAiCostEur.toFixed(2)}
          </p>
          <p>
            <strong>{String(coverage.sourcesSuccessful ?? 0)}</strong> /{" "}
            {String(coverage.sourcesPlanned ?? 0)} {locale === "sl" ? "virov" : "sources"}
          </p>
        </div>
        {job.failureMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {job.failureCode}: {job.failureMessage}
          </p>
        ) : null}
      </section>

      {recommendations && recommendations.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-extrabold text-[#0b1f33]">
            {locale === "sl" ? "Priporočila" : "Recommendations"}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {recommendations.map((recommendation) => (
              <article key={recommendation.id} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-extrabold text-teal-800">
                    #{recommendation.rank}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {Math.round(recommendation.evidenceCoverage * 100)} %{" "}
                    {locale === "sl" ? "dokazov" : "evidence"}
                  </span>
                </div>
                <h3 className="mt-4 font-extrabold text-[#0b1f33]">{recommendation.headline}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{recommendation.rationale}</p>
                {parseStrings(recommendation.caveatsJson).map((caveat) => (
                  <p key={caveat} className="mt-2 text-xs text-amber-800">
                    ! {caveat}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {comparison.size > 0 ? (
        <section className="mt-10 rounded-xl border-2 border-teal-700 bg-teal-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-extrabold text-[#0b1f33]">
              <Scale aria-hidden="true" size={20} />
              {locale === "sl" ? "Primerjava" : "Comparison"} ({comparison.size}/4)
            </h2>
            <button
              className="text-sm font-bold text-teal-900 underline"
              onClick={() => setComparison(new Set())}
              type="button"
            >
              {locale === "sl" ? "Počisti" : "Clear"}
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sortedOffers
              .filter((offer) => comparison.has(offer.id))
              .map((offer) => (
                <article key={offer.id} className="rounded-lg bg-white p-4">
                  <h3 className="font-bold text-[#0b1f33]">{offer.title}</h3>
                  <p className="mt-2 text-2xl font-extrabold text-teal-800">
                    {costFor(offer) === null
                      ? "—"
                      : new Intl.NumberFormat(locale, {
                          style: "currency",
                          currency: "EUR",
                        }).format(costFor(offer) ?? 0)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {locale === "sl" ? "Ocena" : "Score"}: {offer.score?.toFixed(1) ?? "—"}
                  </p>
                </article>
              ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#0b1f33]">
              {locale === "sl" ? "Preverjene ponudbe" : "Verified offers"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {offers.results.length} {locale === "sl" ? "naloženih" : "loaded"} ·{" "}
              {offers.status === "CanLoadMore"
                ? locale === "sl"
                  ? "na voljo je več"
                  : "more available"
                : locale === "sl"
                  ? "vse naloženo"
                  : "all loaded"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold print:hidden">
            <ArrowDownUp aria-hidden="true" size={17} />
            {locale === "sl" ? "Razvrsti" : "Sort"}
            <select
              className="app-select min-h-10 w-auto"
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="score">{locale === "sl" ? "Ocena" : "Score"}</option>
              <option value="price">{locale === "sl" ? "Cena" : "Price"}</option>
              <option value="title">{locale === "sl" ? "Naziv" : "Title"}</option>
            </select>
          </label>
        </div>

        <div className="print-results-table card mt-5 hidden overflow-x-auto md:block">
          <table className="results-table">
            <thead>
              <tr>
                <th>{locale === "sl" ? "Ponudba" : "Offer"}</th>
                <th>{locale === "sl" ? "Cena" : "Price"}</th>
                <th>{locale === "sl" ? "Ocena" : "Score"}</th>
                <th>{locale === "sl" ? "Razpoložljivost" : "Availability"}</th>
                {dynamicColumns.map((column) => (
                  <th key={column}>{column.replaceAll("_", " ")}</th>
                ))}
                <th>{locale === "sl" ? "Vir" : "Source"}</th>
                <th className="print:hidden">{locale === "sl" ? "Dejanja" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {sortedOffers.map((offer) => {
                const sourceUrl = safeUrl(offer.canonicalUrl);
                const isPinned = pinned.has(offer.id);
                const selected = comparison.has(offer.id);
                const attributes = parseObject(offer.attributesJson);
                return (
                  <tr key={offer.id}>
                    <td>
                      <p className="max-w-sm font-bold text-[#0b1f33]">{offer.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {offer.sellerName ?? offer.providerName ?? "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap font-bold">
                      {costFor(offer) === null
                        ? "—"
                        : new Intl.NumberFormat(locale, {
                            style: "currency",
                            currency: "EUR",
                          }).format(costFor(offer) ?? 0)}
                    </td>
                    <td>{offer.score?.toFixed(1) ?? "—"}</td>
                    <td>{offer.availability.replaceAll("_", " ")}</td>
                    {dynamicColumns.map((column) => (
                      <td key={column}>{displayAttribute(attributes[column])}</td>
                    ))}
                    <td>
                      {sourceUrl ? (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-teal-800"
                        >
                          {offer.sourceId}
                          <ExternalLink aria-hidden="true" size={13} />
                        </a>
                      ) : (
                        offer.sourceId
                      )}
                    </td>
                    <td className="print:hidden">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="button button-secondary min-h-9 px-2 py-1"
                          onClick={() => setSelectedEvidence(offer)}
                          type="button"
                        >
                          {locale === "sl" ? "Dokazi" : "Evidence"}
                        </button>
                        <button
                          className="button button-secondary min-h-9 px-2 py-1"
                          onClick={() =>
                            void pinOffer({
                              organizationId: workspace.id,
                              jobId: typedJobId,
                              offerId: offer.id,
                              pinned: !isPinned,
                            })
                          }
                          type="button"
                          aria-label={
                            isPinned
                              ? locale === "sl"
                                ? "Odpni ponudbo"
                                : "Unpin offer"
                              : locale === "sl"
                                ? "Pripni ponudbo"
                                : "Pin offer"
                          }
                        >
                          {isPinned ? (
                            <PinOff aria-hidden="true" size={16} />
                          ) : (
                            <Pin aria-hidden="true" size={16} />
                          )}
                        </button>
                        <label className="flex items-center gap-1 text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={!selected && comparison.size >= 4}
                            onChange={(event) => {
                              const next = new Set(comparison);
                              if (event.target.checked) next.add(offer.id);
                              else next.delete(offer.id);
                              setComparison(next);
                            }}
                          />
                          {locale === "sl" ? "Primerjaj" : "Compare"}
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 print:hidden md:hidden">
          {sortedOffers.map((offer) => {
            const isPinned = pinned.has(offer.id);
            const selected = comparison.has(offer.id);
            const attributes = parseObject(offer.attributesJson);
            return (
              <article key={offer.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-extrabold text-[#0b1f33]">{offer.title}</h3>
                  <span className="text-xl font-extrabold text-teal-800">
                    {offer.score?.toFixed(0) ?? "—"}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-extrabold">
                  {costFor(offer) === null
                    ? "—"
                    : new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "EUR",
                      }).format(costFor(offer) ?? 0)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {offer.availability.replaceAll("_", " ")} · {offer.sourceId}
                </p>
                {dynamicColumns.length > 0 ? (
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {dynamicColumns.map((column) => (
                      <div key={column}>
                        <dt className="text-xs font-bold text-slate-500">
                          {column.replaceAll("_", " ")}
                        </dt>
                        <dd className="mt-1 text-slate-800">
                          {displayAttribute(attributes[column])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="button button-secondary col-span-2"
                    onClick={() => setSelectedEvidence(offer)}
                    type="button"
                  >
                    {locale === "sl" ? "Odpri dokaze" : "Open evidence"}
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() =>
                      void pinOffer({
                        organizationId: workspace.id,
                        jobId: typedJobId,
                        offerId: offer.id,
                        pinned: !isPinned,
                      })
                    }
                    type="button"
                  >
                    {isPinned ? (
                      <PinOff aria-hidden="true" size={16} />
                    ) : (
                      <Pin aria-hidden="true" size={16} />
                    )}
                    {isPinned
                      ? locale === "sl"
                        ? "Odpni"
                        : "Unpin"
                      : locale === "sl"
                        ? "Pripni"
                        : "Pin"}
                  </button>
                  <label className="button button-secondary">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && comparison.size >= 4}
                      onChange={(event) => {
                        const next = new Set(comparison);
                        if (event.target.checked) next.add(offer.id);
                        else next.delete(offer.id);
                        setComparison(next);
                      }}
                    />
                    {locale === "sl" ? "Primerjaj" : "Compare"}
                  </label>
                </div>
              </article>
            );
          })}
        </div>
        {offers.results.length === 0 && offers.status !== "LoadingFirstPage" ? (
          <div className="card mt-5 p-8 text-center text-slate-600">
            {terminal
              ? locale === "sl"
                ? "V potrjenem obsegu ni bilo sprejete ponudbe. Preverite pokritost in dogodke."
                : "No offer was accepted in the confirmed scope. Review coverage and events."
              : locale === "sl"
                ? "Ponudbe se bodo prikazale sproti."
                : "Offers will appear as they are verified."}
          </div>
        ) : null}
        {offers.status === "CanLoadMore" ? (
          <button
            className="button button-secondary mt-5"
            onClick={() => offers.loadMore(50)}
            type="button"
          >
            {locale === "sl" ? "Naloži naslednjih 50" : "Load the next 50"}
          </button>
        ) : null}
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0b1f33]">
            {locale === "sl" ? "Dogodki raziskave" : "Research events"}
          </h2>
          <ol className="card mt-4 grid max-h-96 gap-0 overflow-y-auto">
            {(events ?? []).map((event) => (
              <li key={event.id} className="border-b border-slate-100 p-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-bold text-[#0b1f33]">
                    {event.type.replaceAll("_", " ")}
                  </span>
                  <time className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat(locale, {
                      timeStyle: "medium",
                    }).format(event.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-xs text-slate-500">{event.stage.replaceAll("_", " ")}</p>
              </li>
            ))}
          </ol>
        </div>
        <button
          className="button button-secondary self-start print:hidden"
          onClick={() =>
            void saveSearch({
              organizationId: workspace.id,
              researchRequestId: job.researchRequestId,
              name: job.title,
            }).then(() => setMessage(locale === "sl" ? "Iskanje je shranjeno." : "Search saved."))
          }
          type="button"
        >
          {locale === "sl" ? "Shrani iskanje" : "Save search"}
        </button>
      </section>

      <EvidenceDialog
        organizationId={workspace.id}
        offerId={selectedEvidence?.id ?? null}
        offerTitle={selectedEvidence?.title ?? ""}
        locale={locale}
        onClose={() => setSelectedEvidence(null)}
      />
    </main>
  );
}
