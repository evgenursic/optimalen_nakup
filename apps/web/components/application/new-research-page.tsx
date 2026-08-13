"use client";

import { api } from "@convex/_generated/api";
import {
  defaultScoringWeights,
  filterSpecV1Schema,
  type Category,
  type FilterSpecV1,
  type Requirement,
  type ScoringWeights,
} from "@optimalen-nakup/domain";
import { useMutation } from "convex/react";
import { ArrowLeft, ArrowRight, CirclePlus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import { Link, useRouter } from "@/i18n/navigation";

import { useWorkspace } from "./workspace-context";

const categories: { value: Category; sl: string; en: string }[] = [
  { value: "vehicles", sl: "Avtomobili", en: "Vehicles" },
  { value: "computers", sl: "Računalniki", en: "Computers" },
  { value: "white_goods", sl: "Bela tehnika", en: "White goods" },
];

const modes = [
  "best_overall",
  "best_value",
  "lowest_verified_price",
  "premium",
  "lowest_risk",
  "long_term_value",
  "lowest_tco",
  "most_reliable",
  "environmental",
  "fastest_available",
  "closest_match",
] as const;

function manualFilter(category: Category, request: string): FilterSpecV1 {
  return {
    schemaVersion: 1,
    category,
    mode: "best_overall",
    query: request,
    hardRequirements: [],
    preferences: [],
    exclusions: [],
    budget: null,
    geography: { countries: ["SI"], maximumDistanceKm: null, origin: null },
    acceptableConditions: category === "vehicles" ? ["new", "used"] : ["new"],
    timing: { neededBy: null, maximumDeliveryDays: null },
    riskTolerance: "medium",
    weights: defaultScoringWeights,
    confirmedAt: null,
  };
}

function serializeFilterSpec(filter: FilterSpecV1) {
  return {
    schemaVersion: 1 as const,
    category: filter.category,
    mode: filter.mode,
    query: filter.query,
    hardRequirementsJson: JSON.stringify(filter.hardRequirements),
    preferencesJson: JSON.stringify(filter.preferences),
    exclusionsJson: JSON.stringify(filter.exclusions),
    budgetJson: JSON.stringify(filter.budget),
    geographyJson: JSON.stringify(filter.geography),
    acceptableConditionsJson: JSON.stringify(filter.acceptableConditions),
    timingJson: JSON.stringify(filter.timing),
    riskTolerance: filter.riskTolerance,
    weightsJson: JSON.stringify(filter.weights),
    confirmedAt: filter.confirmedAt === null ? null : new Date(filter.confirmedAt).getTime(),
  };
}

function normalizeWeights(weights: ScoringWeights): ScoringWeights {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return defaultScoringWeights;
  }
  const entries = Object.entries(weights) as [keyof ScoringWeights, number][];
  const normalized = Object.fromEntries(
    entries.map(([key, value]) => [key, value / total]),
  ) as unknown as ScoringWeights;
  const sumWithoutLast =
    normalized.hardFilterCompliance +
    normalized.priceCompetitiveness +
    normalized.qualityFit +
    normalized.sellerConfidence +
    normalized.evidenceConfidence +
    normalized.reliability +
    normalized.totalCostOfOwnership;
  return {
    ...normalized,
    preferenceFit: Math.max(0, 1 - sumWithoutLast),
  };
}

function RequirementEditor({
  title,
  items,
  onChange,
  locale,
}: Readonly<{
  title: string;
  items: Requirement[];
  onChange(items: Requirement[]): void;
  locale: "sl" | "en";
}>) {
  const [field, setField] = useState("");
  const [operator, setOperator] = useState<Requirement["operator"]>("equals");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!field.trim() || !value.trim() || !label.trim()) {
      return;
    }
    const numeric = ["gte", "lte"].includes(operator) ? Number(value) : null;
    onChange([
      ...items,
      {
        field: field.trim(),
        operator,
        value: numeric !== null && Number.isFinite(numeric) ? numeric : value.trim(),
        label: label.trim(),
      },
    ]);
    setField("");
    setValue("");
    setLabel("");
  }

  return (
    <section className="rounded-xl border border-slate-200 p-5">
      <h3 className="font-extrabold text-[#0b1f33]">{title}</h3>
      <div className="mt-4 grid gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            {locale === "sl" ? "Ni dodanih meril." : "No criteria added."}
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.field}-${index}`}
              className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.field} · {item.operator} ·{" "}
                  {typeof item.value === "string" ? item.value : JSON.stringify(item.value)}
                </p>
              </div>
              <button
                className="button button-secondary min-h-9 px-2 py-1"
                onClick={() =>
                  onChange(items.filter((_candidate, itemIndex) => itemIndex !== index))
                }
                type="button"
                aria-label={locale === "sl" ? "Odstrani merilo" : "Remove criterion"}
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </div>
          ))
        )}
      </div>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={add}>
        <label className="grid gap-1 text-sm font-semibold">
          {locale === "sl" ? "Polje" : "Field"}
          <input
            className="app-input"
            value={field}
            onChange={(event) => setField(event.target.value)}
            placeholder="attributes.ramGb"
            maxLength={120}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          {locale === "sl" ? "Primerjava" : "Operator"}
          <select
            className="app-select"
            value={operator}
            onChange={(event) => setOperator(event.target.value as Requirement["operator"])}
          >
            {["equals", "not_equals", "contains", "not_contains", "gte", "lte"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          {locale === "sl" ? "Vrednost" : "Value"}
          <input
            className="app-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={500}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          {locale === "sl" ? "Jasna oznaka" : "Reader label"}
          <input
            className="app-input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={200}
          />
        </label>
        <button className="button button-secondary md:col-span-2" type="submit">
          <CirclePlus aria-hidden="true" size={17} />
          {locale === "sl" ? "Dodaj merilo" : "Add criterion"}
        </button>
      </form>
    </section>
  );
}

export function NewResearchPage({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const createDraft = useMutation(api.research.createDraft);
  const queueResearch = useMutation(api.research.confirmAndQueue);
  const [category, setCategory] = useState<Category>("computers");
  const [request, setRequest] = useState("");
  const [filter, setFilter] = useState<FilterSpecV1 | null>(null);
  const [source, setSource] = useState<"openai" | "manual" | null>(null);
  const [status, setStatus] = useState<"idle" | "structuring" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function structure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.trim().length < 3) return;
    setStatus("structuring");
    setError("");
    try {
      const response = await fetch("/api/research/structure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId: workspace.id,
          request: request.trim(),
          locale,
          categoryHint: category,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { filter?: unknown };
        const parsed = filterSpecV1Schema.safeParse(payload.filter);
        if (!parsed.success) {
          throw new Error("invalid_filter");
        }
        setFilter(parsed.data);
        setCategory(parsed.data.category);
        setSource("openai");
      } else if (response.status === 503) {
        setFilter(manualFilter(category, request.trim()));
        setSource("manual");
      } else {
        throw new Error("structure_failed");
      }
      setStatus("idle");
    } catch {
      setFilter(manualFilter(category, request.trim()));
      setSource("manual");
      setStatus("idle");
      setError(
        locale === "sl"
          ? "AI strukturiranje trenutno ni dosegljivo. Pripravljen je jasno označen ročni osnutek."
          : "AI structuring is unavailable. A clearly labelled manual draft is ready.",
      );
    }
  }

  function patchFilter(patch: Partial<FilterSpecV1>) {
    setFilter((current) => (current ? { ...current, ...patch } : current));
  }

  async function confirmAndStart() {
    if (!filter) return;
    const totalWeight = Object.values(filter.weights).reduce((sum, value) => sum + value, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      setError(
        locale === "sl"
          ? "Uteži morajo skupaj znašati 100 %. Uporabite gumb za normalizacijo."
          : "Weights must total 100%. Use the normalize button.",
      );
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const confirmed = filterSpecV1Schema.parse({
        ...filter,
        category,
        query: filter.query.trim(),
        confirmedAt: new Date().toISOString(),
      });
      const draft = await createDraft({
        organizationId: workspace.id,
        title: request.trim().slice(0, 100),
        originalInput: request.trim(),
        locale,
        category,
        filterSpec: serializeFilterSpec(confirmed),
      });
      const jobId = await queueResearch({
        organizationId: workspace.id,
        researchRequestId: draft.researchRequestId,
        idempotencyKey: crypto.randomUUID(),
        maxPages: 100,
        maxRuntimeSeconds: 1_800,
        maxAiCostEur: 2,
      });
      router.push(`/app/research/${jobId}`);
    } catch {
      setStatus("error");
      setError(
        locale === "sl"
          ? "Raziskave ni bilo mogoče zagnati. Preverite merila, pravice in omejitve načrta."
          : "Research could not start. Check the criteria, permissions, and plan limits.",
      );
    }
  }

  if (!filter) {
    return (
      <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
        <Link href="/app" className="inline-flex items-center gap-2 font-bold text-teal-800">
          <ArrowLeft aria-hidden="true" size={18} />
          {locale === "sl" ? "Nazaj na pregled" : "Back to overview"}
        </Link>
        <div className="mt-8 max-w-3xl">
          <p className="eyebrow">{locale === "sl" ? "Nova raziskava" : "New research"}</p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#0b1f33]">
            {locale === "sl" ? "Kaj želite kupiti?" : "What do you want to buy?"}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            {locale === "sl"
              ? "Opišite dejanske potrebe, proračun, lokacijo, čas in česa ne želite. Pred raziskavo boste potrdili vsako merilo."
              : "Describe real needs, budget, location, timing, and exclusions. You will confirm every criterion before research."}
          </p>
        </div>
        <form className="card mt-8 grid max-w-3xl gap-6 p-6 lg:p-8" onSubmit={structure}>
          <label className="grid gap-2 font-bold">
            {locale === "sl" ? "Kategorija" : "Category"}
            <select
              className="app-select"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {locale === "sl" ? item.sl : item.en}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 font-bold">
            {locale === "sl" ? "Vaš nakupni cilj" : "Your buying goal"}
            <textarea
              className="app-textarea"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              minLength={3}
              maxLength={4_000}
              required
              placeholder={
                locale === "sl"
                  ? "Primer: Iščem tih razvojni prenosnik z vsaj 32 GB RAM, dostavljen v Sloveniji do 2.000 € …"
                  : "Example: I need a quiet development laptop with at least 32 GB RAM, delivered in Slovenia under €2,000 …"
              }
            />
          </label>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">{request.length}/4.000</span>
            <button
              className="button button-primary"
              disabled={status === "structuring"}
              type="submit"
            >
              <Sparkles aria-hidden="true" size={18} />
              {status === "structuring"
                ? locale === "sl"
                  ? "Strukturiram …"
                  : "Structuring …"
                : locale === "sl"
                  ? "Pripravi merila"
                  : "Prepare criteria"}
            </button>
          </div>
        </form>
      </main>
    );
  }

  const weightTotal = Object.values(filter.weights).reduce((sum, value) => sum + value, 0);
  return (
    <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
      <button
        className="inline-flex items-center gap-2 font-bold text-teal-800"
        onClick={() => setFilter(null)}
        type="button"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        {locale === "sl" ? "Spremeni opis" : "Change description"}
      </button>
      <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{locale === "sl" ? "Potrditev filtrov" : "Filter confirmation"}</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1f33]">
            {locale === "sl" ? "Preverite razumevanje" : "Review the interpretation"}
          </h1>
        </div>
        <span className="status-badge" data-tone={source === "openai" ? "success" : "warning"}>
          {source === "openai"
            ? locale === "sl"
              ? "Strukturiral Luna"
              : "Structured by Luna"
            : locale === "sl"
              ? "Ročni osnutek — AI ni konfiguriran"
              : "Manual draft — AI not configured"}
        </span>
      </div>
      {error ? (
        <p
          className="mt-5 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6">
        <section className="card grid gap-5 p-6 md:grid-cols-2">
          <label className="grid gap-2 font-semibold md:col-span-2">
            {locale === "sl" ? "Iskalni povzetek" : "Search summary"}
            <textarea
              className="app-textarea min-h-24"
              value={filter.query}
              onChange={(event) => patchFilter({ query: event.target.value })}
              maxLength={4_000}
            />
          </label>
          <label className="grid gap-2 font-semibold">
            {locale === "sl" ? "Kategorija" : "Category"}
            <select
              className="app-select"
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value as Category;
                setCategory(nextCategory);
                patchFilter({ category: nextCategory });
              }}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {locale === "sl" ? item.sl : item.en}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            {locale === "sl" ? "Način priporočila" : "Recommendation mode"}
            <select
              className="app-select"
              value={filter.mode}
              onChange={(event) =>
                patchFilter({ mode: event.target.value as FilterSpecV1["mode"] })
              }
            >
              {modes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            {locale === "sl" ? "Najvišji proračun (EUR)" : "Maximum budget (EUR)"}
            <input
              className="app-input"
              type="number"
              min="1"
              step="1"
              value={filter.budget?.maximum ?? ""}
              onChange={(event) =>
                patchFilter({
                  budget: event.target.value
                    ? {
                        currency: "EUR",
                        minimum: filter.budget?.minimum ?? null,
                        maximum: Number(event.target.value),
                        includeRecurringMonths: filter.budget?.includeRecurringMonths ?? 0,
                      }
                    : null,
                })
              }
            />
          </label>
          <label className="grid gap-2 font-semibold">
            {locale === "sl" ? "Toleranca tveganja" : "Risk tolerance"}
            <select
              className="app-select"
              value={filter.riskTolerance}
              onChange={(event) =>
                patchFilter({
                  riskTolerance: event.target.value as FilterSpecV1["riskTolerance"],
                })
              }
            >
              <option value="low">{locale === "sl" ? "Nizka" : "Low"}</option>
              <option value="medium">{locale === "sl" ? "Srednja" : "Medium"}</option>
              <option value="high">{locale === "sl" ? "Visoka" : "High"}</option>
            </select>
          </label>
          <label className="grid gap-2 font-semibold">
            {locale === "sl" ? "Izhodiščna lokacija" : "Origin location"}
            <input
              className="app-input"
              value={filter.geography.origin ?? ""}
              onChange={(event) =>
                patchFilter({
                  geography: {
                    ...filter.geography,
                    origin: event.target.value || null,
                  },
                })
              }
              maxLength={300}
            />
          </label>
          <label className="grid gap-2 font-semibold">
            {locale === "sl" ? "Največja razdalja (km)" : "Maximum distance (km)"}
            <input
              className="app-input"
              type="number"
              min="0"
              max="5000"
              value={filter.geography.maximumDistanceKm ?? ""}
              onChange={(event) =>
                patchFilter({
                  geography: {
                    ...filter.geography,
                    maximumDistanceKm: event.target.value ? Number(event.target.value) : null,
                  },
                })
              }
            />
          </label>
          <fieldset className="md:col-span-2">
            <legend className="font-semibold">
              {locale === "sl" ? "Sprejemljivo stanje" : "Acceptable condition"}
            </legend>
            <div className="mt-3 flex flex-wrap gap-4">
              {(["new", "used", "refurbished", "demo"] as const).map((condition) => (
                <label key={condition} className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={filter.acceptableConditions.includes(condition)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...filter.acceptableConditions, condition]
                        : filter.acceptableConditions.filter((item) => item !== condition);
                      if (next.length > 0) patchFilter({ acceptableConditions: next });
                    }}
                  />
                  {condition}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <RequirementEditor
          title={locale === "sl" ? "Trde zahteve" : "Hard requirements"}
          items={filter.hardRequirements}
          onChange={(hardRequirements) => patchFilter({ hardRequirements })}
          locale={locale}
        />
        <RequirementEditor
          title={locale === "sl" ? "Preference" : "Preferences"}
          items={filter.preferences}
          onChange={(preferences) => patchFilter({ preferences })}
          locale={locale}
        />
        <RequirementEditor
          title={locale === "sl" ? "Izključitve" : "Exclusions"}
          items={filter.exclusions}
          onChange={(exclusions) => patchFilter({ exclusions })}
          locale={locale}
        />

        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#0b1f33]">
                {locale === "sl" ? "Uteži ocenjevanja" : "Scoring weights"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {locale === "sl" ? "Skupaj" : "Total"}: {(weightTotal * 100).toFixed(1)} %
              </p>
            </div>
            <button
              className="button button-secondary"
              onClick={() => patchFilter({ weights: normalizeWeights(filter.weights) })}
              type="button"
            >
              {locale === "sl" ? "Normaliziraj na 100 %" : "Normalize to 100%"}
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(Object.entries(filter.weights) as [keyof ScoringWeights, number][]).map(
              ([key, value]) => (
                <label key={key} className="grid gap-2 text-sm font-semibold">
                  <span className="flex justify-between gap-3">
                    <span>{key.replaceAll(/([A-Z])/g, " $1").toLocaleLowerCase(locale)}</span>
                    <span>{(value * 100).toFixed(0)} %</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={(event) =>
                      patchFilter({
                        weights: { ...filter.weights, [key]: Number(event.target.value) },
                      })
                    }
                  />
                </label>
              ),
            )}
          </div>
        </section>
      </div>

      <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="max-w-2xl text-sm text-slate-600">
          {locale === "sl"
            ? "Zagon porabi eno mesečno raziskavo. Delni rezultati in dosežena pokritost ostanejo vidni tudi ob preklicu."
            : "Starting uses one monthly research allowance. Partial results and achieved coverage remain visible after cancellation."}
        </p>
        <button
          className="button button-primary"
          disabled={status === "saving"}
          onClick={() => void confirmAndStart()}
          type="button"
        >
          {status === "saving"
            ? locale === "sl"
              ? "Zaganjam …"
              : "Starting …"
            : locale === "sl"
              ? "Potrdi in začni"
              : "Confirm and start"}
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </main>
  );
}
