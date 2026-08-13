"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";

import { AppShell } from "./app-shell";
import { WorkspaceProvider } from "./workspace-context";

export function ApplicationRoot({
  children,
  locale,
}: Readonly<{ children: React.ReactNode; locale: "sl" | "en" }>) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <main id="main-content" className="container py-20" aria-busy="true">
        <div className="card mx-auto max-w-xl p-8">
          {locale === "sl" ? "Preverjam varno sejo …" : "Checking your secure session …"}
        </div>
      </main>
    );
  }
  if (isSignedIn) {
    return (
      <WorkspaceProvider locale={locale}>
        <AppShell locale={locale}>{children}</AppShell>
      </WorkspaceProvider>
    );
  }
  return (
    <main id="main-content" className="container py-20">
      <section className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-3xl font-extrabold text-[#0b1f33]">
          {locale === "sl" ? "Prijava je potrebna" : "Sign-in required"}
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          {locale === "sl"
            ? "Vaše raziskave in dokazi so zasebni za vaš delovni prostor."
            : "Your research and evidence are private to your workspace."}
        </p>
        <SignInButton mode="modal">
          <button className="button button-primary mt-8" type="button">
            {locale === "sl" ? "Prijava" : "Sign in"}
          </button>
        </SignInButton>
      </section>
    </main>
  );
}
