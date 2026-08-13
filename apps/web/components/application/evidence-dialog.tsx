"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";

function parseRecord(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, number] => {
          return typeof entry[1] === "number";
        }),
      );
    }
  } catch {
    // Invalid historical data is shown as unavailable, never executed.
  }
  return {};
}

function parseStrings(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function EvidenceDialog({
  organizationId,
  offerId,
  offerTitle,
  locale,
  onClose,
}: Readonly<{
  organizationId: Id<"organizations">;
  offerId: Id<"offers"> | null;
  offerTitle: string;
  locale: "sl" | "en";
  onClose(): void;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const evidence = useQuery(
    api.research.evidenceForOffer,
    offerId ? { organizationId, offerId } : "skip",
  );
  const score = useQuery(
    api.research.scoreForOffer,
    offerId ? { organizationId, offerId } : "skip",
  );

  useEffect(() => {
    if (offerId && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [offerId]);

  if (!offerId) {
    return null;
  }
  const components = score ? parseRecord(score.componentsJson) : {};
  const penalties = score ? parseRecord(score.penaltiesJson) : {};
  const reasons = score ? parseStrings(score.reasonsJson) : [];
  const risks = score ? parseStrings(score.risksJson) : [];

  return (
    <dialog
      ref={dialog}
      className="evidence-dialog"
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="evidence-title"
    >
      <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-bold tracking-widest text-teal-700 uppercase">
            {locale === "sl" ? "Dokazi in ocena" : "Evidence and score"}
          </p>
          <h2 id="evidence-title" className="mt-2 text-xl font-extrabold text-[#0b1f33]">
            {offerTitle}
          </h2>
        </div>
        <button
          className="button button-secondary min-h-10 px-3"
          onClick={() => dialog.current?.close()}
          type="button"
          aria-label={locale === "sl" ? "Zapri dokaze" : "Close evidence"}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="grid gap-8 p-5">
        <section>
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-extrabold text-[#0b1f33]">
              {locale === "sl" ? "Razčlenitev ocene" : "Score breakdown"}
            </h3>
            <span className="text-2xl font-extrabold text-teal-800">
              {score ? score.total.toFixed(1) : "—"}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {Object.entries(components).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[1fr_auto] gap-4 text-sm">
                <span className="text-slate-600">{key.replaceAll(/([A-Z])/g, " $1")}</span>
                <span className="font-bold">{value.toFixed(1)}</span>
              </div>
            ))}
          </div>
          {Object.keys(penalties).length > 0 ? (
            <div className="mt-5 rounded-lg bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                {locale === "sl" ? "Kazni" : "Penalties"}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-amber-900">
                {Object.entries(penalties).map(([key, value]) => (
                  <li key={key}>
                    {key}: −{value.toFixed(1)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {reasons.length > 0 ? (
            <ul className="mt-5 grid gap-2 text-sm text-slate-700">
              {reasons.map((reason) => (
                <li key={reason}>✓ {reason}</li>
              ))}
            </ul>
          ) : null}
          {risks.length > 0 ? (
            <ul className="mt-3 grid gap-2 text-sm text-red-800">
              {risks.map((risk) => (
                <li key={risk}>! {risk}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section>
          <h3 className="font-extrabold text-[#0b1f33]">
            {locale === "sl" ? "Dokazna polja" : "Evidence fields"}
          </h3>
          {evidence === undefined ? (
            <p className="mt-3 text-sm text-slate-500">
              {locale === "sl" ? "Nalagam dokaze …" : "Loading evidence …"}
            </p>
          ) : evidence.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {locale === "sl" ? "Ni shranjenih dokazov." : "No evidence is stored."}
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {evidence.map((record) => {
                const sourceUrl = safeSourceUrl(record.sourceUrl);
                return (
                  <article key={record.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-bold text-[#0b1f33]">{record.field}</p>
                      <span
                        className="status-badge"
                        data-tone={
                          record.status === "verified"
                            ? "success"
                            : record.status === "conflicting"
                              ? "danger"
                              : record.status === "missing"
                                ? "warning"
                                : undefined
                        }
                      >
                        {record.status} · {Math.round(record.confidence * 100)} %
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {record.excerpt ?? (locale === "sl" ? "Ni podatka" : "No value")}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        {record.sourceName} · {record.method} ·{" "}
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                          record.collectedAt,
                        )}
                      </span>
                      {sourceUrl ? (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-teal-800"
                        >
                          {locale === "sl" ? "Izvor" : "Source"}
                          <ExternalLink aria-hidden="true" size={14} />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </dialog>
  );
}
