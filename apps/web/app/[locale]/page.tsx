import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleAlertIcon,
  CircleDashedIcon,
  GaugeIcon,
  SearchIcon,
} from "@/components/public-icons";
import { localizedHref } from "@/lib/locale-path";
import { localizedAlternates } from "@/lib/metadata";

const categoryIcons = [SearchIcon, GaugeIcon, CheckCircleIcon];

async function BelowFoldContent({
  categories,
  process,
}: Readonly<{
  categories: Awaited<ReturnType<typeof getTranslations>>;
  process: Awaited<ReturnType<typeof getTranslations>>;
}>) {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  const categoryItems = [
    [categories("vehicles"), categories("vehiclesText")],
    [categories("computers"), categories("computersText")],
    [categories("whiteGoods"), categories("whiteGoodsText")],
  ] as const;

  const processItems = [
    [process("one"), process("oneText")],
    [process("two"), process("twoText")],
    [process("three"), process("threeText")],
    [process("four"), process("fourText")],
  ] as const;

  return (
    <>
      <section className="container py-18 lg:py-24">
        <h2 className="section-heading">{categories("title")}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {categoryItems.map(([title, text], index) => {
            const Icon = categoryIcons[index] ?? SearchIcon;
            return (
              <article key={title} className="card p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-[#f0fdfa] text-[#0f766e]">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <h3 className="mt-6 text-xl font-extrabold text-[#0b1f33]">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#0b1f33] text-white">
        <div className="container py-18 lg:py-24">
          <h2 className="max-w-3xl text-[clamp(2rem,4vw,3.35rem)] leading-tight font-extrabold tracking-[-0.045em]">
            {process("title")}
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {processItems.map(([title, text], index) => (
              <li key={title} className="border-t border-white/30 pt-5">
                <span className="text-sm font-extrabold text-[#5eead4]">0{index + 1}</span>
                <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localizedAlternates(locale, "") };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [hero, proof, categories, process] = await Promise.all([
    getTranslations("hero"),
    getTranslations("proof"),
    getTranslations("categories"),
    getTranslations("process"),
  ]);

  return (
    <main id="main-content">
      <section className="overflow-hidden border-b border-slate-200 bg-white">
        <div className="container grid gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
          <div>
            <p className="eyebrow">{hero("eyebrow")}</p>
            <h1 className="mt-5 max-w-3xl text-[clamp(3rem,7vw,5.7rem)] leading-[0.94] font-extrabold tracking-[-0.06em] text-[#0b1f33]">
              {hero("title")}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">{hero("description")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={localizedHref(locale, "/sign-in")} className="button button-primary">
                {hero("primary")}
                <ArrowRightIcon size={18} />
              </a>
              <a href={localizedHref(locale, "/how-it-works")} className="button button-secondary">
                {hero("secondary")}
              </a>
            </div>
            <ul className="mt-9 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-3">
              {[hero("coverage"), hero("neutral"), hero("evidence")].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircleIcon className="mt-0.5 shrink-0 text-[#0f766e]" size={18} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-10 -z-10 rounded-full bg-[#ccfbf1] opacity-60 blur-3xl"
            />
            <article className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    BMW X3 xDrive20d
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[#0b1f33]">58.990 €</p>
                </div>
                <div className="rounded-xl bg-[#f0fdfa] px-4 py-3 text-center">
                  <p className="text-2xl font-extrabold text-[#0f766e]">89</p>
                  <p className="text-[0.68rem] font-bold text-slate-600 uppercase">
                    {proof("score")}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircleIcon className="text-emerald-700" size={19} />
                  <p className="mt-4 text-xs font-bold text-emerald-900">{proof("verified")}</p>
                  <p className="mt-1 text-sm text-emerald-900">M Sport, 22.461 km</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <CircleDashedIcon className="text-amber-700" size={19} />
                  <p className="mt-4 text-xs font-bold text-amber-900">{proof("inferred")}</p>
                  <p className="mt-1 text-sm text-amber-900">Cena je primerljiva</p>
                </div>
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <CircleAlertIcon className="text-slate-700" size={19} />
                  <p className="mt-4 text-xs font-bold text-slate-900">{proof("missing")}</p>
                  <p className="mt-1 text-sm text-slate-700">Zgodovina škod</p>
                </div>
              </div>
              <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-extrabold text-[#0f766e] uppercase">
                    {proof("reason")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{proof("reasonText")}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#b91c1c] uppercase">{proof("risk")}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{proof("riskText")}</p>
                </div>
              </div>
            </article>
            <p className="mt-5 text-center text-sm text-slate-600">{proof("subtitle")}</p>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <BelowFoldContent categories={categories} process={process} />
      </Suspense>
    </main>
  );
}
