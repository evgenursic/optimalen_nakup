"use client";

import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useWorkspace } from "./workspace-context";

const plans = ["starter", "pro", "business"] as const;
const intervals = ["monthly", "annual"] as const;

export function BillingPage({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const { workspace } = useWorkspace();
  const [interval, setInterval] = useState<(typeof intervals)[number]>("monthly");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const canManage = workspace.role === "owner" || workspace.role === "admin";

  async function openCheckout(plan: (typeof plans)[number]) {
    setBusy(plan);
    setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId: workspace.id,
          plan,
          interval,
          locale,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setMessage(
          payload.error === "billing_not_configured"
            ? locale === "sl"
              ? "Testni checkout še ni konfiguriran. Delovni prostor ostaja v resničnem closed-beta načinu."
              : "Test checkout is not configured. The workspace remains in genuine closed-beta mode."
            : locale === "sl"
              ? "Checkouta ni bilo mogoče odpreti."
              : "Checkout could not be opened.",
        );
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setMessage(locale === "sl" ? "Plačilna storitev ni dosegljiva." : "Billing is unavailable.");
    } finally {
      setBusy("");
    }
  }

  async function openPortal() {
    setBusy("portal");
    setMessage("");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: workspace.id }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setMessage(
          payload.error === "billing_customer_missing"
            ? locale === "sl"
              ? "Ta delovni prostor še nima plačilnega profila."
              : "This workspace does not have a billing profile yet."
            : locale === "sl"
              ? "Portala ni bilo mogoče odpreti."
              : "The portal could not be opened.",
        );
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setMessage(locale === "sl" ? "Plačilna storitev ni dosegljiva." : "Billing is unavailable.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
      <p className="eyebrow">{locale === "sl" ? "Naročnina" : "Subscription"}</p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1f33]">
        {locale === "sl" ? "Obračunavanje in pravice" : "Billing and entitlements"}
      </h1>
      <p className="mt-4 max-w-3xl leading-7 text-slate-600">
        {locale === "sl"
          ? `Delovni prostor uporablja načrt ${workspace.plan.replace("_", " ")}. Lemon Squeezy je ponudnik Merchant of Record; vse spremembe se uveljavijo šele po podpisanem webhooku.`
          : `This workspace uses the ${workspace.plan.replace("_", " ")} plan. Lemon Squeezy is the Merchant of Record; changes apply only after a signed webhook.`}
      </p>

      {!canManage ? (
        <div className="card mt-8 p-6">
          {locale === "sl"
            ? "Naročnino lahko upravlja lastnik ali administrator."
            : "Only an owner or administrator can manage the subscription."}
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {intervals.map((candidate) => (
                <button
                  key={candidate}
                  className={`rounded-md px-4 py-2 text-sm font-bold ${
                    interval === candidate ? "bg-[#0b1f33] text-white" : "text-slate-600"
                  }`}
                  onClick={() => setInterval(candidate)}
                  type="button"
                >
                  {candidate === "monthly"
                    ? locale === "sl"
                      ? "Mesečno"
                      : "Monthly"
                    : locale === "sl"
                      ? "Letno"
                      : "Annual"}
                </button>
              ))}
            </div>
            <button
              className="button button-secondary"
              disabled={Boolean(busy)}
              onClick={() => void openPortal()}
              type="button"
            >
              <ExternalLink aria-hidden="true" size={17} />
              {locale === "sl" ? "Portal naročnika" : "Customer portal"}
            </button>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan} className="card p-6">
                <CreditCard aria-hidden="true" className="text-teal-700" />
                <h2 className="mt-4 text-2xl font-extrabold capitalize text-[#0b1f33]">{plan}</h2>
                <p className="mt-3 min-h-16 leading-7 text-slate-600">
                  {locale === "sl"
                    ? "Končna cena se prikaže v podpisanem Lemon Squeezy testnem checkoutu, ko jo lastnik konfigurira."
                    : "The final configured price is shown in the signed Lemon Squeezy test checkout."}
                </p>
                <button
                  className="button button-primary mt-6 w-full"
                  disabled={Boolean(busy)}
                  onClick={() => void openCheckout(plan)}
                  type="button"
                >
                  <ShieldCheck aria-hidden="true" size={17} />
                  {busy === plan
                    ? locale === "sl"
                      ? "Odpiram …"
                      : "Opening …"
                    : locale === "sl"
                      ? "Odpri testni checkout"
                      : "Open test checkout"}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {message ? (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 font-semibold text-amber-900" role="status">
          {message}
        </p>
      ) : null}
    </main>
  );
}
